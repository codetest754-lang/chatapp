using Amazon.S3;
using Amazon.S3.Model;
using Dapper;
using Npgsql;
using StackExchange.Redis;
using Shared;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddSignalR().AddStackExchangeRedis(builder.Configuration["Redis:Connection"] ?? "redis:6379");
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(builder.Configuration["Redis:Connection"] ?? "redis:6379"));
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddScoped(_ => new NpgsqlConnection(builder.Configuration.GetConnectionString("Postgres") ?? "Host=postgres;Port=5432;Database=chatapp;Username=postgres;Password=postgres"));
builder.Services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(builder.Configuration["S3:AccessKey"], builder.Configuration["S3:SecretKey"], new AmazonS3Config
{
    ServiceURL = builder.Configuration["S3:Endpoint"] ?? "http://minio:9000",
    ForcePathStyle = true
}));

var app = builder.Build();

app.MapPost("/api/media/upload", async (HttpRequest request, IAmazonS3 s3, NpgsqlConnection db, IEventPublisher events) =>
{
    var form = await request.ReadFormAsync();
    var file = form.Files[0];
    await using var stream = file.OpenReadStream();
    var objectKey = $"uploads/{Guid.NewGuid()}-{file.FileName}";

    await s3.PutObjectAsync(new PutObjectRequest
    {
        BucketName = "chatapp",
        Key = objectKey,
        InputStream = stream,
        ContentType = file.ContentType
    });

    var id = Guid.NewGuid();
    await db.ExecuteAsync("INSERT INTO attachments(id, object_key, file_name, content_type, size_bytes) VALUES(@id,@objectKey,@fileName,@contentType,@size)",
        new { id, objectKey, fileName = file.FileName, contentType = file.ContentType, size = file.Length });

    await events.PublishAsync("media.uploaded", new { id, objectKey, scanRequired = true, thumbnailRequired = file.ContentType.StartsWith("image/") });
    return Results.Ok(new { id, objectKey });
});

app.Run();

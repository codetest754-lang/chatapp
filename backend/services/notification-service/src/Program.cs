using Dapper;
using Npgsql;
using StackExchange.Redis;
using Shared;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(builder.Configuration["Redis:Connection"] ?? "redis:6379"));
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddScoped(_ => new NpgsqlConnection(builder.Configuration.GetConnectionString("Postgres") ?? "Host=postgres;Port=5432;Database=chatapp;Username=postgres;Password=postgres"));

var app = builder.Build();
app.MapGet("/health", () => Results.Ok(new { service = "notification-service", status = "ok" }));
app.MapPost("/api/notifications/push", async (PushRequest req, NpgsqlConnection db, IEventPublisher events) =>
{
    var id = Guid.NewGuid();
    await db.ExecuteAsync("INSERT INTO notifications(id, user_id, type, payload) VALUES(@id,@userId,@type,@payload::jsonb)", new { id, req.UserId, req.Type, payload = req.PayloadJson });
    await events.PublishAsync("push.notification.requested", new { id, req.UserId, req.Type });
    return Results.Accepted($"/api/notifications/{id}", new { id });
});
app.Run();

record PushRequest(Guid UserId, string Type, string PayloadJson);

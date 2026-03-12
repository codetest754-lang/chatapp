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

app.MapGet("/api/users/{id:guid}", async (Guid id, NpgsqlConnection db, ICacheService cache) =>
{
    var key = $"user:{id}";
    var cached = await cache.GetAsync<object>(key);
    if (cached is not null) return Results.Ok(cached);

    var user = await db.QueryFirstOrDefaultAsync("SELECT id, username, email, avatar_url FROM users WHERE id=@id", new { id });
    if (user is null) return Results.NotFound();
    await cache.SetAsync(key, user, TimeSpan.FromMinutes(5));
    return Results.Ok(user);
});

app.MapGet("/api/users/search", async (string query, NpgsqlConnection db) =>
{
    var users = await db.QueryAsync("SELECT id, username, avatar_url FROM users WHERE username ILIKE @query LIMIT 50", new { query = $"%{query}%" });
    return Results.Ok(users);
});

app.Run();

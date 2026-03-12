using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(builder.Configuration["Redis:Connection"] ?? "redis:6379"));

var app = builder.Build();

app.MapPost("/api/presence/{userId:guid}/online", async (Guid userId, IConnectionMultiplexer redis) =>
{
    await redis.GetDatabase().StringSetAsync($"presence:{userId}", "online", TimeSpan.FromMinutes(5));
    return Results.Ok(new { eventName = "UserOnline", userId });
});

app.MapPost("/api/presence/{userId:guid}/offline", async (Guid userId, IConnectionMultiplexer redis) =>
{
    await redis.GetDatabase().KeyDeleteAsync($"presence:{userId}");
    return Results.Ok(new { eventName = "UserOffline", userId });
});

app.Run();

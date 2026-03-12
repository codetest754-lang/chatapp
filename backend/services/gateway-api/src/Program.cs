using System.Threading.RateLimiting;
using Dapper;
using Npgsql;
using StackExchange.Redis;
using Shared;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR().AddStackExchangeRedis(builder.Configuration["Redis:Connection"] ?? "redis:6379");
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 120,
            Window = TimeSpan.FromMinutes(1)
        }));
});

builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(builder.Configuration["Redis:Connection"] ?? "redis:6379"));
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddScoped(_ => new NpgsqlConnection(builder.Configuration.GetConnectionString("Postgres") ?? "Host=postgres;Port=5432;Database=chatapp;Username=postgres;Password=postgres"));

var app = builder.Build();
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { service = "gateway-api", status = "ok" }));
app.MapGet("/api/gateway/routes", () => Results.Ok(new[] { "auth", "user", "chat", "group", "media", "call", "notification", "presence" }));

app.Run();

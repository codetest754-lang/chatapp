using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Dapper;
using Microsoft.IdentityModel.Tokens;
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

app.MapPost("/api/auth/login", async (LoginRequest req, NpgsqlConnection db) =>
{
    var userId = await db.ExecuteScalarAsync<Guid?>("SELECT id FROM users WHERE email=@email", new { req.Email }) ?? Guid.NewGuid();
    var token = CreateJwt(userId.ToString(), "super-secret-key");
    var refresh = Guid.NewGuid().ToString("N");
    return Results.Ok(new { accessToken = token, refreshToken = refresh, expiresIn = 3600 });
});

app.MapPost("/api/auth/refresh", (RefreshRequest req) => Results.Ok(new { accessToken = CreateJwt("system", "super-secret-key") }));
app.Run();

static string CreateJwt(string sub, string key)
{
    var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
    var jwt = new JwtSecurityToken(claims: new[] { new Claim(JwtRegisteredClaimNames.Sub, sub) }, expires: DateTime.UtcNow.AddHours(1), signingCredentials: credentials);
    return new JwtSecurityTokenHandler().WriteToken(jwt);
}

record LoginRequest(string Email, string Password);
record RefreshRequest(string RefreshToken);

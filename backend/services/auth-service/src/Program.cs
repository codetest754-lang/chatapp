using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
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

const string JwtKey = "dev-secret-key-32-bytes-long-1234";
const string PasswordSalt = "dev-salt";

app.MapPost("/api/auth/login", async (LoginRequest req, NpgsqlConnection db) =>
{
    var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
    var password = req.Password ?? string.Empty;
    if (string.IsNullOrWhiteSpace(email))
    {
        return Results.BadRequest(new { error = "Email is required" });
    }
    if (string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest(new { error = "Password is required" });
    }

    var user = await db.QueryFirstOrDefaultAsync<(Guid Id, string PasswordHash)>(
        "SELECT id, password_hash FROM users WHERE email=@email",
        new { email });
    if (user == default)
    {
        return Results.Unauthorized();
    }

    var storedHash = user.PasswordHash ?? string.Empty;
    var computedHash = HashPassword(password);
    var isLegacy = storedHash == "dev";
    var passwordOk = isLegacy
        ? (password == "dev" || password == "demo")
        : storedHash == computedHash;
    if (!passwordOk)
    {
        return Results.Unauthorized();
    }

    if (isLegacy)
    {
        await db.ExecuteAsync("UPDATE users SET password_hash=@hash WHERE id=@id", new { hash = computedHash, id = user.Id });
    }

    var conversationId = await EnsureDemoConversation(db, user.Id);
    var token = CreateJwt(user.Id.ToString(), JwtKey);
    var refresh = Guid.NewGuid().ToString("N");
    return Results.Ok(new { accessToken = token, refreshToken = refresh, expiresIn = 3600, userId = user.Id, conversationId });
});

app.MapPost("/api/auth/register", async (RegisterRequest req, NpgsqlConnection db) =>
{
    var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
    var password = req.Password ?? string.Empty;
    if (string.IsNullOrWhiteSpace(email))
    {
        return Results.BadRequest(new { error = "Email is required" });
    }
    if (string.IsNullOrWhiteSpace(password))
    {
        return Results.BadRequest(new { error = "Password is required" });
    }

    var exists = await db.ExecuteScalarAsync<Guid?>("SELECT id FROM users WHERE email=@email", new { email });
    if (exists is not null)
    {
        return Results.Conflict(new { error = "User already exists" });
    }

    var userId = Guid.NewGuid();
    var username = email.Split('@', 2)[0];
    if (string.IsNullOrWhiteSpace(username))
    {
        username = $"user-{userId.ToString()[..8]}";
    }

    await db.ExecuteAsync(
        "INSERT INTO users(id, username, email, password_hash) VALUES(@id, @username, @email, @password)",
        new { id = userId, username, email, password = HashPassword(password) });

    var conversationId = await EnsureDemoConversation(db, userId);
    var token = CreateJwt(userId.ToString(), JwtKey);
    var refresh = Guid.NewGuid().ToString("N");
    return Results.Ok(new { accessToken = token, refreshToken = refresh, expiresIn = 3600, userId, conversationId });
});

app.MapPost("/api/auth/refresh", (RefreshRequest req) => Results.Ok(new { accessToken = CreateJwt("system", JwtKey) }));
app.Run();

static string CreateJwt(string sub, string key)
{
    var credentials = new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
    var jwt = new JwtSecurityToken(claims: new[] { new Claim(JwtRegisteredClaimNames.Sub, sub) }, expires: DateTime.UtcNow.AddHours(1), signingCredentials: credentials);
    return new JwtSecurityTokenHandler().WriteToken(jwt);
}

static string HashPassword(string password)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes($"{PasswordSalt}:{password}"));
    return Convert.ToBase64String(bytes);
}

static async Task<Guid> EnsureDemoConversation(NpgsqlConnection db, Guid userId)
{
    var demoConversationId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    var conversationId = await db.ExecuteScalarAsync<Guid?>(
        "SELECT id FROM conversations WHERE id=@id",
        new { id = demoConversationId });
    if (conversationId is null)
    {
        await db.ExecuteAsync(
            "INSERT INTO conversations(id, type, created_by) VALUES(@id, 'group', @userId)",
            new { id = demoConversationId, userId });
        conversationId = demoConversationId;
    }

    return conversationId.Value;
}

record LoginRequest(string Email, string Password);
record RegisterRequest(string Email, string Password);
record RefreshRequest(string RefreshToken);

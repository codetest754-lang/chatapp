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
app.MapPost("/api/groups", async (CreateGroupRequest req, NpgsqlConnection db) =>
{
    var convoId = Guid.NewGuid();
    var groupId = Guid.NewGuid();
    await db.ExecuteAsync("INSERT INTO conversations(id,type,created_by) VALUES(@convoId,'group',@createdBy); INSERT INTO groups(id,conversation_id,name,avatar_url,created_by) VALUES(@groupId,@convoId,@name,@avatar,@createdBy);", new { convoId, groupId, req.Name, avatar = req.AvatarUrl, req.CreatedBy });
    return Results.Ok(new { groupId, convoId });
});
app.MapPost("/api/groups/{groupId:guid}/members/{userId:guid}", async (Guid groupId, Guid userId, NpgsqlConnection db) =>
{
    await db.ExecuteAsync("INSERT INTO group_members(group_id,user_id,role) VALUES(@groupId,@userId,'member') ON CONFLICT DO NOTHING", new { groupId, userId });
    return Results.Ok();
});
app.MapDelete("/api/groups/{groupId:guid}/members/{userId:guid}", async (Guid groupId, Guid userId, NpgsqlConnection db) =>
{
    await db.ExecuteAsync("DELETE FROM group_members WHERE group_id=@groupId AND user_id=@userId", new { groupId, userId });
    return Results.NoContent();
});
app.Run();

record CreateGroupRequest(string Name, string? AvatarUrl, Guid CreatedBy);

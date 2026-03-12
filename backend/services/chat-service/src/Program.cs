using ChatService.Hubs;
using Dapper;
using Npgsql;
using StackExchange.Redis;
using Shared;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSignalR().AddStackExchangeRedis(builder.Configuration["Redis:Connection"] ?? "redis:6379");
builder.Services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(builder.Configuration["Redis:Connection"] ?? "redis:6379"));
builder.Services.AddSingleton<ICacheService, RedisCacheService>();
builder.Services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
builder.Services.AddScoped(_ => new NpgsqlConnection(builder.Configuration.GetConnectionString("Postgres") ?? "Host=postgres;Port=5432;Database=chatapp;Username=postgres;Password=postgres"));

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { service = "chat-service", status = "ok" }));

app.MapGet("/api/chat/messages/{conversationId:guid}", async (Guid conversationId, int page, int pageSize, NpgsqlConnection db) =>
{
    const string sql = """
    SELECT id, conversation_id, sender_id, content, content_type, created_at
    FROM messages
    WHERE conversation_id = @conversationId
    ORDER BY created_at DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    """;
    var rows = await db.QueryAsync(sql, new { conversationId, offset = page * pageSize, limit = pageSize });
    return Results.Ok(rows);
});



app.MapGet("/api/chat/sync/{conversationId:guid}", async (Guid conversationId, DateTimeOffset since, NpgsqlConnection db) =>
{
    var rows = await db.QueryAsync("SELECT id, conversation_id, sender_id, content, content_type, created_at FROM messages WHERE conversation_id=@conversationId AND created_at>@since ORDER BY created_at ASC", new { conversationId, since });
    return Results.Ok(rows);
});

app.MapGet("/api/chat/search", async (string q, NpgsqlConnection db) =>
{
    var rows = await db.QueryAsync("SELECT id, conversation_id, sender_id, content, created_at FROM messages WHERE to_tsvector('english', content) @@ plainto_tsquery('english', @q) ORDER BY created_at DESC LIMIT 50", new { q });
    return Results.Ok(rows);
});

app.MapPost("/api/chat/messages", async (CreateMessageRequest request, NpgsqlConnection db, IEventPublisher events) =>
{
    var id = Guid.NewGuid();
    await db.ExecuteAsync("INSERT INTO messages(id, conversation_id, sender_id, content, content_type) VALUES(@id,@conversationId,@senderId,@content,@contentType)",
        new { id, request.ConversationId, request.SenderId, request.Content, request.ContentType });

    await events.PublishAsync("chat.message.created", new { id, request.ConversationId, request.SenderId });
    await events.PublishAsync("moderation.requested", new { messageId = id, request.Content, request.SenderId });
    return Results.Accepted($"/api/chat/messages/{id}", new { id });
});

app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<PresenceHub>("/hubs/presence");
app.MapHub<CallHub>("/hubs/call");
app.MapHub<NotificationHub>("/hubs/notification");

app.Run();

public sealed record CreateMessageRequest(Guid ConversationId, Guid SenderId, string Content, string ContentType);

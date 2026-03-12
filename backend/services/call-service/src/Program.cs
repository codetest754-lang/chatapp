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

app.MapPost("/api/calls/request", async (CallRequest req, NpgsqlConnection db, IEventPublisher events) =>
{
    var id = Guid.NewGuid();
    await db.ExecuteAsync("INSERT INTO calls(id, conversation_id, call_type, started_at, status) VALUES(@id,@conversationId,@callType,now(),'ringing')", new { id, req.ConversationId, req.CallType });
    await events.PublishAsync("call.requested", new { id, req.FromUserId, req.ToUserId, req.OfferSdp });
    return Results.Ok(new { callId = id });
});

app.MapPost("/api/calls/{callId:guid}/accept", async (Guid callId, string answerSdp, NpgsqlConnection db, IEventPublisher events) =>
{
    await db.ExecuteAsync("UPDATE calls SET status='active' WHERE id=@callId", new { callId });
    await events.PublishAsync("call.accepted", new { callId, answerSdp });
    return Results.Ok();
});

app.MapPost("/api/calls/{callId:guid}/end", async (Guid callId, NpgsqlConnection db, IEventPublisher events) =>
{
    await db.ExecuteAsync("UPDATE calls SET status='ended', ended_at=now() WHERE id=@callId", new { callId });
    await events.PublishAsync("call.ended", new { callId });
    return Results.Ok();
});

app.Run();

record CallRequest(Guid ConversationId, Guid FromUserId, Guid ToUserId, string CallType, string OfferSdp);

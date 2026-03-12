using Microsoft.AspNetCore.SignalR;
using Shared;

namespace ChatService.Hubs;

public sealed class ChatHub : Hub
{
    private readonly IEventPublisher _events;

    public ChatHub(IEventPublisher events) => _events = events;

    public async Task SendMessage(Guid conversationId, string content, string contentType = "text")
    {
        var payload = new
        {
            messageId = Guid.NewGuid(),
            conversationId,
            userId = Context.UserIdentifier,
            content,
            contentType,
            createdAt = DateTimeOffset.UtcNow
        };

        await Clients.Group(conversationId.ToString()).SendAsync("ReceiveMessage", payload);
        await _events.PublishAsync("chat.message.created", payload);
    }

    public Task JoinConversation(Guid conversationId) => Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
    public Task LeaveConversation(Guid conversationId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId.ToString());
    public Task Typing(Guid conversationId) => Clients.Group(conversationId.ToString()).SendAsync("UserTyping", new { conversationId, userId = Context.UserIdentifier });
    public Task MessageSeen(Guid conversationId, Guid messageId) => Clients.Group(conversationId.ToString()).SendAsync("MessageSeen", new { conversationId, messageId, userId = Context.UserIdentifier });
}

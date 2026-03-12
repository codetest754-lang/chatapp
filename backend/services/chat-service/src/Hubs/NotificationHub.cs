using Microsoft.AspNetCore.SignalR;

namespace ChatService.Hubs;

public sealed class NotificationHub : Hub
{
    public Task Subscribe(string userId) => Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
}

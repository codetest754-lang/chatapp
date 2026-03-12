using Microsoft.AspNetCore.SignalR;

namespace ChatService.Hubs;

public sealed class PresenceHub : Hub
{
    public override Task OnConnectedAsync() => Clients.All.SendAsync("UserOnline", new { userId = Context.UserIdentifier });
    public override Task OnDisconnectedAsync(Exception? exception) => Clients.All.SendAsync("UserOffline", new { userId = Context.UserIdentifier });
}

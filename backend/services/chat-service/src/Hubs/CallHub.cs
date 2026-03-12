using Microsoft.AspNetCore.SignalR;

namespace ChatService.Hubs;

public sealed class CallHub : Hub
{
    public Task RequestCall(string targetUserId, string offerSdp) => Clients.User(targetUserId).SendAsync("IncomingCall", new { from = Context.UserIdentifier, offerSdp });
    public Task AcceptCall(string targetUserId, string answerSdp) => Clients.User(targetUserId).SendAsync("CallAccepted", new { from = Context.UserIdentifier, answerSdp });
    public Task RejectCall(string targetUserId) => Clients.User(targetUserId).SendAsync("CallRejected", new { from = Context.UserIdentifier });
    public Task EndCall(string targetUserId) => Clients.User(targetUserId).SendAsync("CallEnded", new { from = Context.UserIdentifier });
    public Task IceCandidate(string targetUserId, string candidate) => Clients.User(targetUserId).SendAsync("IceCandidate", new { from = Context.UserIdentifier, candidate });
    public Task ScreenShareStarted(string targetUserId) => Clients.User(targetUserId).SendAsync("ScreenShareStarted", new { from = Context.UserIdentifier });
}

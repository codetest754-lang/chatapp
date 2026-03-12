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

    public Task JoinCallRoom(Guid conversationId) => Groups.AddToGroupAsync(Context.ConnectionId, conversationId.ToString());
    public Task LeaveCallRoom(Guid conversationId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId.ToString());

    public Task CallInvite(Guid conversationId, string targetUserId, string callType) =>
        Clients.User(targetUserId).SendAsync("CallInvite", new { conversationId, from = Context.UserIdentifier, callType });

    public Task CallJoin(Guid conversationId) =>
        Clients.Group(conversationId.ToString()).SendAsync("CallJoin", new { conversationId, userId = Context.UserIdentifier });

    public Task CallOffer(Guid conversationId, string targetUserId, string offerSdp, string callType) =>
        Clients.User(targetUserId).SendAsync("CallOffer", new { conversationId, from = Context.UserIdentifier, offerSdp, callType });

    public Task CallAnswer(Guid conversationId, string targetUserId, string answerSdp) =>
        Clients.User(targetUserId).SendAsync("CallAnswer", new { conversationId, from = Context.UserIdentifier, answerSdp });

    public Task CallIce(Guid conversationId, string targetUserId, string candidate) =>
        Clients.User(targetUserId).SendAsync("CallIce", new { conversationId, from = Context.UserIdentifier, candidate });

    public Task CallLeave(Guid conversationId) =>
        Clients.Group(conversationId.ToString()).SendAsync("CallLeave", new { conversationId, userId = Context.UserIdentifier });
}

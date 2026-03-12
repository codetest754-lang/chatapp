using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

namespace ChatService.Hubs;

public sealed class QueryStringUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        var http = connection.GetHttpContext();
        var fromQuery = http?.Request.Query["userId"].ToString();
        if (!string.IsNullOrWhiteSpace(fromQuery))
        {
            return fromQuery;
        }

        return connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? connection.User?.FindFirst("sub")?.Value;
    }
}

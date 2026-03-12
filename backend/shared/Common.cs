namespace Shared;

public record ApiResponse<T>(bool Success, T? Data, string? Error = null);

public interface IEventPublisher
{
    Task PublishAsync(string topic, object payload, CancellationToken cancellationToken = default);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default);
}

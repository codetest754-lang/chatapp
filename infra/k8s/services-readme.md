Replicate deployment/service manifests for:
- auth-service
- user-service
- group-service
- media-service
- call-service
- notification-service
- presence-service
using the same label/env pattern as chat-service.

For 1M+ concurrency:
- Enable HPA on CPU and custom metrics (active websocket connections).
- Use dedicated node pools for SignalR-heavy pods.
- External Redis (cluster mode) and managed Kafka.
- Configure PodDisruptionBudgets and anti-affinity.

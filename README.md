# ChatApp - Production-Grade Real-Time Communication Platform

This repository provides a microservices-based reference implementation for a WhatsApp/Discord-like platform targeting 1M+ concurrent users.

## Stack
- **Backend:** .NET 10 (preview), ASP.NET Core Web API, SignalR, Dapper, PostgreSQL, Redis, Kafka, MinIO
- **Frontend:** React + TypeScript + Vite + Tailwind + Zustand + SignalR client + WebRTC APIs + PrismJS
- **DevOps:** Docker Compose for local development, Kubernetes manifests for production baseline

## Microservices
- `gateway-api`
- `auth-service`
- `user-service`
- `chat-service`
- `group-service`
- `media-service`
- `call-service`
- `notification-service`
- `presence-service`

Each service includes:
- API endpoints
- Dapper repository pattern
- PostgreSQL access
- Redis cache support
- Kafka event publishing hooks

## Real-time hubs
Implemented in `chat-service`:
- `ChatHub`
- `PresenceHub`
- `CallHub`
- `NotificationHub`

## High-level architecture
- **Gateway API** routes external traffic and validates JWT.
- **Auth Service** issues JWT + refresh tokens.
- **Chat Service** handles messages, reactions, read receipts, edits/deletes, and SignalR fan-out.
- **Presence Service** tracks online/offline and session heartbeat in Redis.
- **Call Service** manages call lifecycle and WebRTC signaling orchestration.
- **Media Service** uploads objects to MinIO/S3, stores metadata, and emits processing events (thumbnails, scanning).
- **Notification Service** pushes in-app and external notifications.
- **Group Service** manages group membership and admin workflows.
- **User Service** profiles, preferences, and search.

## Data model
See `infra/postgres/schema.sql` for tables and indexes including:
- UUID primary keys
- Partitioned `messages` table by month
- Composite index on `(conversation_id, created_at DESC)`
- Full text search index for message search

## Frontend features
- Login flow
- Conversation list + sidebar
- One-to-one and group chat windows
- Typing indicators and read status
- Emoji picker
- File uploads
- PrismJS code message rendering (copy + line numbers + collapse)
- Voice call popup
- Video call screen + screen sharing panel
- Dark mode toggle

## Run locally
```bash
docker compose up --build
```

Frontend: `http://localhost:5173`
Gateway: `http://localhost:8088`

Login: use Register in the UI to create a user, then sign in with email + password. All users join the shared demo conversation.

## Kubernetes
Base manifests are in `infra/k8s/`.

## Security checklist implemented
- JWT + refresh token flow
- Rate limiting middleware
- Input validation scaffold
- File scanning event hook in media pipeline
- Centralized error handling and structured logging

## Notes
This is a production-ready scaffold with critical paths implemented and extension points for advanced scaling concerns (multi-region replication, dedicated SFU clusters, APNs/FCM providers, and formal service mesh policies).

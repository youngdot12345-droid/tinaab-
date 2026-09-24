# Tinaab real-time messaging plan

## Current foundation

Tinaab already has authenticated conversation endpoints for:

- Listing conversations: `GET /api/conversations`
- Creating a direct conversation: `POST /api/conversations`
- Reading messages: `GET /api/conversations/:id/messages`
- Sending a message: `POST /api/conversations/:id/messages`
- Marking a conversation read: `POST /api/conversations/:id/read`

## Implementation sequence

1. Keep the HTTP endpoints as the source of truth for message creation and history.
2. Add a dedicated real-time transport only after the backend has a stable production host.
3. Use an authenticated connection and verify conversation membership server-side before delivering events.
4. Use `wss://` in production and reject insecure mixed-content connections.
5. Reconnect with backoff, but avoid duplicate message insertion by using the server message ID.
6. Keep polling or manual refresh as a fallback when real-time transport is unavailable.
7. Add delivery/read events only after message persistence and authorization are tested.

## Release gate

Real-time chat should not be described as live until the server, authentication, reconnection, authorization, and duplicate-message behavior have been tested against the deployed backend.

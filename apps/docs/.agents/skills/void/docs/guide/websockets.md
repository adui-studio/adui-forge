---
outline: deep
---

# WebSockets

::: warning ⚠️ Void Apps Only
Void-managed WebSockets currently works only for Void apps. Meta-framework mode is not supported yet.
:::

Void supports typed WebSockets from file-based `.ws.ts` routes. Each WebSocket route compiles to a Cloudflare Durable Object, so the feature is currently Cloudflare-only. If you set `target` to `node`, `bun`, or `deno`, builds fail when `.ws.ts` routes are present.

Use WebSockets for chat, presence, collaborative rooms, notifications, AI/live-log streaming, and other realtime flows where one connection target maps cleanly to one route instance.

## Route files

Create WebSocket routes in `routes/` with the `.ws.ts` suffix:

```text
routes/
  chat/[room].ws.ts
  notifications.ws.ts
```

Filename rules match regular server routes:

- `index.ws.ts` becomes the parent path
- `[id].ws.ts` becomes `:id`
- `[...slug].ws.ts` becomes a catch-all
- route groups like `(marketing)/chat.ws.ts` are ignored in the URL

## `defineRoom()`

Use `defineRoom()` when many clients should share one route-scoped room or document.

```ts
// routes/chat/[room].ws.ts
import * as v from "valibot";
import { defineRoom } from "void/ws";

const ClientMessage = v.variant("type", [
  v.object({ type: v.literal("chat.message"), text: v.string() }),
]);

const ServerMessage = v.variant("type", [
  v.object({
    type: v.literal("chat.message"),
    id: v.string(),
    text: v.string(),
    userId: v.string(),
  }),
  v.object({ type: v.literal("chat.joined"), userId: v.string() }),
]);

export default defineRoom({
  messages: {
    client: ClientMessage,
    server: ServerMessage,
  },
  onBeforeConnect(ctx) {
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
  },
  async onConnect(ctx) {
    await ctx.room.broadcast({ type: "chat.joined", userId: ctx.user!.id }, [ctx.connection.id]);
  },
  async onMessage(ctx, event) {
    await ctx.room.broadcast({
      type: "chat.message",
      id: crypto.randomUUID(),
      text: event.text,
      userId: ctx.user!.id,
    });
  },
});
```

`defineRoom()` adds room helpers to the hook context:

- `ctx.room.broadcast(event, excludeIds?)`
- `ctx.room.getConnections()`
- `ctx.room.getConnection(id)`
- `ctx.connection.send(event)`
- `ctx.connection.close(code?, reason?)`
- `ctx.connection.setState(data)`

## `defineWebSocket()`

Use `defineWebSocket()` when each connection is handled independently instead of as a shared room.

```ts
// routes/notifications.ws.ts
import * as v from "valibot";
import { defineWebSocket } from "void/ws";

export default defineWebSocket({
  messages: {
    client: v.object({ type: v.literal("notifications.ack"), id: v.string() }),
    server: v.object({ type: v.literal("notifications.item"), title: v.string() }),
  },
  onBeforeConnect(ctx) {
    if (!ctx.user) {
      return new Response("Unauthorized", { status: 401 });
    }
  },
  async onConnect(ctx) {
    await ctx.socket.send({ type: "notifications.item", title: "Connected" });
  },
});
```

## Typed messages

WebSocket messages are schema-backed in both directions:

- `messages.client` validates what the browser may send
- `messages.server` validates what the server may send
- `onMessage()` receives the parsed, validated client event
- `ctx.room.broadcast()`, `ctx.connection.send()`, and `ctx.socket.send()` are typed from `messages.server`
- `connect()` infers route params, outgoing client messages, and incoming server messages from generated route types

The default protocol is JSON events. Raw string or binary framing is not the primary API.

## Ambient auth

WebSocket hooks use the same built-in session resolution as HTTP auth. When Void auth is enabled, `ctx.user` is available in:

- `onBeforeConnect`
- `onConnect`
- `onMessage`
- `onClose`
- `onRequest`

This makes cookie-authenticated sockets work without re-parsing the session manually.

## Hooks

Both `defineRoom()` and `defineWebSocket()` support:

- `onBeforeConnect(ctx)`: return a `Response` to reject the upgrade
- `onConnect(ctx)`: runs after the socket is accepted
- `onMessage(ctx, event)`: receives the validated client event
- `onClose(ctx, details)`: receives `{ code, reason, wasClean }`
- `onRequest(ctx)`: handles ordinary HTTP requests to the same path

Every hook receives a context with:

- `ctx.id`: deterministic route instance id
- `ctx.params`: matched route params
- `ctx.user`: resolved auth user or `null`
- `ctx.request`
- `ctx.env`
- `ctx.storage`

If a route does not define `onRequest()`, non-WebSocket requests return `426 Upgrade Required`.

## Client

Use `connect()` from `void/ws` on the client:

```ts
import { connect } from "void/ws";

const socket = connect("/chat/:room", {
  params: { room: "general" },
});

socket.on("message", (event) => {
  if (event.type === "chat.message") {
    console.log(event.text);
  }
});

socket.send({ type: "chat.message", text: "hello" });
```

`connect()` resolves relative URLs against the current origin and automatically uses `ws:` or `wss:`. It also buffers messages until the socket opens and reconnects by default.

## Constraints

This first release intentionally focuses on the Durable Object sweet spot:

- Cloudflare-only
- one route-derived connection target per socket
- no Socket.IO-style dynamic room join/leave API
- no global pub/sub abstraction
- JSON event messages only

That covers most realtime app shapes Void is targeting without exposing Durable Objects directly.

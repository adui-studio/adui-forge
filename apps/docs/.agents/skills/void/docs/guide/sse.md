---
outline: deep
---

# Server-Sent Events

Void provides `void/sse` for producing and consuming Server-Sent Events from ordinary route handlers. It handles event formatting, response headers, keepalives, stream closure, request aborts, and browser `EventSource` parsing.

Use SSE when one HTTP request owns the producer: AI token streaming, progress updates, command output, deployment logs, or incremental status messages. Use `void/live` or an application-level Durable Object when multiple requests need shared fanout, replay, or subscription state.

## Server streams

Return `eventStream()` from a route handler:

```ts
// routes/api/events.ts
import { defineHandler } from "void";
import { eventStream } from "void/sse";

export const GET = defineHandler((c) => {
  return eventStream(
    async (stream) => {
      await stream.comment("connected");
      await stream.send({
        event: "ready",
        data: { now: Date.now() },
      });

      const timer = setInterval(() => {
        void stream.send({ event: "tick", data: { now: Date.now() } }).catch(() => stream.close());
      }, 1000);

      await stream.closed;
      clearInterval(timer);
    },
    {
      signal: c.req.raw.signal,
    },
  );
});
```

`eventStream()` returns a `Response` immediately with these default headers:

```http
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
X-Accel-Buffering: no
```

When the `start` callback returns, the stream closes. Long-lived streams should wait on `stream.closed`, a producer promise, or an application cancellation signal before returning.

## Sending events

Use `send()` for SSE messages and `comment()` for comments:

```ts
await stream.send({
  id: "evt_1",
  event: "post.update",
  retry: 1000,
  data: { id: "post_123", likes: 10 },
});

await stream.comment("still connected");
```

`data` may be a string or JSON-serializable value. Strings are sent as-is; other values are serialized with `JSON.stringify()`. Multi-line strings are split into multiple `data:` lines. Binary data is rejected because SSE is text-only.

`event`, `id`, and `retry` are validated before writing so accidental frame injection is rejected. Writes after close reject with `SseStreamClosedError`.

If you already serialized the payload, use `formatSseText()` for lower-level formatting while keeping the same `id`, `event`, and `retry` validation:

```ts
import { formatSseText } from "void/sse";

const frame = formatSseText({
  event: "post.update",
  data: JSON.stringify({ id: "post_123", likes: 10 }),
});
```

## Keepalives

Keepalives are enabled by default every 15 seconds:

```ts
return eventStream(start);
```

Disable them or customize the interval and comment text:

```ts
return eventStream(start, { keepAlive: false });

return eventStream(start, {
  keepAlive: { intervalMs: 5000, comment: "ping" },
});
```

The interval must be a positive finite number.

## Last Event ID

Browsers send `Last-Event-ID` when reconnecting after an event with an `id` field. Use `getLastEventId()` to resume from your own storage:

```ts
import { getLastEventId } from "void/sse";

export const GET = defineHandler((c) => {
  const lastId = getLastEventId(c.req.raw);
  return eventStream(async (stream) => {
    await stream.send({ id: nextId(lastId), data: await loadNextItem(lastId) });
  });
});
```

`void/sse` does not store or replay events. Persist event offsets in your own database, queue, or Durable Object when replay matters.

## Client

Use `connectEventStream()` from the browser-only `void/sse/client` subpath:

```ts
import { connectEventStream } from "void/sse/client";

const stream = connectEventStream<{
  ready: { now: number };
  tick: { now: number };
}>("/api/events", {
  withCredentials: true,
});

const offReady = stream.on("ready", (event) => {
  console.log(event.data.now);
});

stream.on("tick", (event) => {
  console.log(event.data.now);
});

offReady();
stream.close();
```

The client wraps native `EventSource`. It supports cookie credentials and typed event handlers, but it does not support request bodies or arbitrary headers. Use cookie auth, signed URLs, or a fetch-based streaming route when you need custom headers.

JSON parsing is the default. Set `parse: 'text'` or pass a custom parser for non-JSON payloads:

```ts
const logs = connectEventStream("/api/logs", { parse: "text" });

logs.on("line", (event) => {
  console.log(event.data);
});
```

## Auth

SSE routes are ordinary route handlers, so use the same auth checks you use for JSON routes:

```ts
import { requireAuth } from "void/auth";

export const GET = defineHandler(async (c) => {
  const user = await requireAuth(c);

  return eventStream(async (stream) => {
    await stream.send({ event: "ready", data: { userId: user.id } });
    await stream.closed;
  });
});
```

Native `EventSource` can send cookies with `withCredentials: true`. For non-cookie auth, generate a short-lived signed URL and validate it in the route handler.

## When to use SSE

Plain SSE is enough when the producer belongs to the same request that opened the stream:

- AI token streaming
- One-off progress updates
- Command output
- Per-request deployment or build logs
- Incremental status for a long-running action

Use a higher-level realtime primitive when you need cross-request fanout, rooms, replay buffers, subscriptions, database change streams, or multi-region coordination.

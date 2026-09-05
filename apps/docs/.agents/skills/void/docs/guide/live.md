---
outline: deep
---

# Live Event Streams

`void/live` provides Durable Object-backed fanout over Server-Sent Events. Use it
when one browser tab needs a single SSE connection that can subscribe and
unsubscribe from many application topics over time.

Use `void/sse` for request-owned streams where the producer lives inside the same
route handler. Use `void/live` when later requests, mutations, scheduled jobs, or
queue consumers need to publish to clients that are already connected.

## Define A Stream

Create a server-only live stream descriptor:

```ts
// src/live.ts
import { defineLiveStream } from "void/live";

export const live = defineLiveStream({
  id: "app",
  allowAnonymousControl: true,
});
```

Expose it from a normal route:

```ts
// routes/live.ts
import { defineHandler } from "void";
import { live } from "../src/live";

export const GET = defineHandler((c) => live.connect(c));
export const POST = defineHandler((c) => live.control(c));
```

`GET` opens the SSE connection. `POST` accepts subscribe and unsubscribe control
operations for that connection.

## Subscribe From The Browser

Use the browser helper from `void/live/client`:

```ts
import { connectLiveStream } from "void/live/client";

const stream = connectLiveStream("/live", {
  withCredentials: true,
  retryDelay: 1_000,
  onError(error) {
    console.error(error);
  },
});

const unsubscribePost = await stream.subscribe({
  id: "post-card",
  topic: "post:12",
  onEvent(event) {
    if (event.type === "updated") {
      console.log(event.data);
    }
  },
});

const unsubscribeComments = await stream.subscribe({
  id: "comments",
  topic: "comment:2323",
});

await unsubscribeComments();
await unsubscribePost();
stream.close();
```

The helper opens one native `EventSource`, waits for it to open, then sends
batched `POST` control operations. Subscription ids are scoped to the
connection. Reusing an id replaces the previous subscription with that id. If
the transport drops, the helper reconnects and resubmits active subscriptions
with their latest `eventId` as `lastEventId`.

## Publish

Publish from any server-side code that has a Void runtime env:

```ts
import { live } from "../src/live";

await live.publish(
  "post:12",
  { title: "Updated title" },
  { type: "updated", eventId: "post-12-v8" },
);
```

Topics are opaque strings. Payloads are application-owned JSON. `type` and
`eventId` are copied into the JSON envelope; `void/live` does not interpret
them, persist them, or use native SSE `id` fields.

If you are outside an active request/runtime context, pass env explicitly:

```ts
await live.withEnv(env).publish("post:12", { title: "Updated title" });
```

## Authorization

Every live connection has an owner. The owner is the identity allowed to send
control operations for that SSE connection. `connect()` resolves and stores the
owner; `control()` resolves the owner again and rejects the request if it does
not match.

The quickstart uses an anonymous stream:

```ts
export const live = defineLiveStream({
  id: "app",
  allowAnonymousControl: true,
});
```

For authenticated streams, pass the same owner key to `connect()` and
`control()`:

```ts
return live.connect(c, { owner: `user:${session.userId}` });
return live.control(c, { owner: `user:${session.userId}` });
```

If every route should derive ownership the same way, define it once with
`identifyConnection`:

```ts
export const live = defineLiveStream({
  id: "app",
  async identifyConnection(ctx) {
    const session = await getSession(ctx.request);
    return session ? `user:${session.userId}` : null;
  },
});
```

Then the route handlers can stay thin:

```ts
export const GET = defineHandler((c) => live.connect(c));
export const POST = defineHandler((c) => live.control(c));
```

When `identifyConnection` returns `null` or `undefined`, Void falls back to the
current authenticated user and uses `user:${user.id}` when the user has a string
`id`. If neither path produces an owner and `allowAnonymousControl` is not set,
the request is rejected with `403`.

For stream-local subscription rules, use `onSubscribe`:

```ts
export const live = defineLiveStream({
  id: "app",
  async onSubscribe(ctx) {
    const match = /^post:(.+)$/.exec(ctx.topic);
    if (match && !(await canReadPost(ctx.env, ctx.user, match[1]))) {
      return new Response("Forbidden", { status: 403 });
    }
  },
});
```

## Limits

`void/live` is designed for small and medium fanout. By default, a stream allows:

- `256` active subscriptions per browser connection
- `256` active subscriptions per topic
- `100` subscribe or unsubscribe operations per control request
- `100` queued events per connection
- `64 KiB` per encoded event envelope

A topic is the unit of fanout. For example, if each blog post uses a topic like
`post:${postId}`, then each post can have up to `256` active live subscribers at
one time. Other posts use separate topics and have separate limits.

Streams can have many possible topics. Topics are created on demand when clients
subscribe or publishers send events, so an app with thousands of posts, rooms, or
documents can use one topic per entity without provisioning them ahead of time.
The limit applies to each active topic, not to the total number of topic names
your app might use.

For example, a blog with `10,000` posts can model its live capacity as
`10,000 posts × up to 256 active subscribers per post topic`.

That shape works because each post topic is independent. A single post with more
than `256` active live subscribers would need a larger broadcast design.

These limits apply to live subscriptions, not total users or total page views.
One user with two open tabs may count twice. Disconnected subscriptions are
pruned, but they can count until the runtime observes that they are stale.

You can lower limits per stream:

```ts
export const live = defineLiveStream({
  id: "app",
  limits: {
    maxSubscriptionsPerTopic: 64,
  },
});
```

`maxSubscriptionsPerTopic` cannot be raised above `256`. For larger broadcast
workloads, shard topics in userland or use a dedicated realtime system.

## Delivery Semantics

`void/live` is an at-most-once live fanout primitive:

- one SSE connection can hold many topic subscriptions
- publish cost is proportional to subscribers of the topic
- events are ordered within one topic
- clients using the raw HTTP protocol must resubscribe after reconnect
- deploys, rollbacks, Worker restarts, browser reconnects, and network changes
  can drop live state
- durable replay, cache invalidation, live queries, and client state management
  belong in userland

Use an application database, queue, or custom Durable Object for replay. Use
`eventId` and caller-provided `lastEventId` values as application protocol
fields when you build that layer.

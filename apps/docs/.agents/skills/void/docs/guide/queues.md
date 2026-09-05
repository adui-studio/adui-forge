---
outline: deep
---

# Queues

Void supports Cloudflare Queues for asynchronous message processing from a top-level `queues/` directory.

## Defining queues

Create files in `queues/**/*.ts`; `.mts`, `.js`, and `.mjs` also work. The queue name is inferred from the filename. For example, `queues/emails.ts` creates a queue named `"emails"`, and `queues/order/notifications.ts` creates `"order/notifications"`.

::: warning Nested files produce a name that cannot be deployed
Cloudflare queue names allow only letters, digits and `-`, so a name containing `/` is rejected when the queue is provisioned — on both the managed platform and a self-hosted `--backend cloudflare` deploy. Nested files work in local development, but keep queue files flat (`queues/order-notifications.ts` → `"order-notifications"`) for any app you intend to deploy.
:::

Each queue file should export a default handler wrapped with [`defineQueue`](../reference/api.md#definequeuet-handler). The generic `<T>` parameter defines the message body type. That is the type of each `msg.body` in the batch, and it is also used by the typed `queues` proxy for `send()` calls.

```ts
// queues/emails.ts
import { defineQueue } from "void";

interface Message {
  to: string;
  subject: string;
}

export default defineQueue<Message>(async (batch, env) => {
  for (const msg of batch.messages) {
    console.log(`Send to ${msg.body.to}: ${msg.body.subject}`);
    msg.ack(); // Acknowledge successful processing
  }
});
```

Files or directories starting with `_` are ignored.

## Sending messages

Import the typed `queues` proxy from `void/queues` to send messages. Each queue is available as a property matching its name, with full type safety from the consumer's `defineQueue<T>` generic.

```ts
// routes/api/orders.ts
import { defineHandler } from "void";
import { queues } from "void/queues";

export const POST = defineHandler(async (c) => {
  const order = await c.req.json();
  // Fully typed: body must match the
  // Message interface from queues/emails.ts
  await queues.emails.send({
    to: order.email,
    subject: "Order confirmed",
  });
  return c.json({ ok: true });
});
```

The binding name is derived automatically: `QUEUE_` + queue name uppercased with non-alphanumeric characters replaced by `_`. For example, `queues/emails.ts` creates binding `QUEUE_EMAILS`.

## Per-message acknowledgment

Each message in the batch has `ack()` and `retry()` methods matching the [Cloudflare Queues API](https://developers.cloudflare.com/queues/configuration/consumer-concurrency/):

```ts
export default defineQueue<Message>(async (batch, env) => {
  for (const msg of batch.messages) {
    try {
      await processMessage(msg.body);
      msg.ack(); // Remove from queue
    } catch {
      msg.retry({ delaySeconds: 30 }); // Re-deliver after 30s
    }
  }
});
```

- `msg.ack()`: acknowledge the message and remove it from the queue
- `msg.retry(options?)`: retry the message, optionally with a `{ delaySeconds }` delay
- `batch.ackAll()`: acknowledge all messages in the batch
- `batch.retryAll(options?)`: retry all messages in the batch

The first call wins for each message. Calling `ack()` after `retry()`, or the reverse, does nothing. Messages with no explicit decision are acknowledged if the handler succeeds, or retried if it throws.

The `timestamp` field on each message is a `Date` object.

## Consumer options

Export named constants to configure how Cloudflare delivers batches to your consumer:

```ts
// queues/emails.ts
import { defineQueue } from "void";

interface Message {
  to: string;
  subject: string;
}

export const maxBatchSize = 50;
export const maxBatchTimeout = 10; // seconds
export const maxRetries = 5;
export const retryDelay = 30; // seconds

export default defineQueue<Message>(async (batch, env) => {
  for (const msg of batch.messages) {
    console.log(`Send to ${msg.body.to}: ${msg.body.subject}`);
  }
});
```

- `maxBatchSize`: maximum number of messages per batch (default `10`)
- `maxBatchTimeout`: maximum seconds to wait before delivering an incomplete batch (default `5`)
- `maxRetries`: maximum number of retries before a message is dead-lettered (default `3`)
- `retryDelay`: seconds to wait between retries (default `0`)

## Deployment behavior

On deploy, Void includes all discovered queues in the deploy manifest. The platform provisions Cloudflare Queues, configures producer bindings on the user worker, and registers the dispatch worker as the queue consumer for relay delivery.

## Local development

In **default Void mode**, Miniflare delivers queue batches natively — produce a message via the binding and the consumer fires automatically. The worker's `queue()` export serializes the batch and routes it to the same internal `/__queue` handler used in production, so behavior is consistent across environments.

You can also manually dispatch a batch by POSTing to the dev endpoint Void exposes:

```
POST /__void/queue
Content-Type: application/json
{ "queue": "<queue-name>", "messages": [{ "id": "1", "timestamp": <unix_ms>, "body": <any>, "attempts": 1 }] }
```

The endpoint requires a local dev trigger token. Void prints a paste-ready curl command with the current token when the dev server starts.

```bash
curl -X POST http://localhost:5173/__void/queue \
  -H "Content-Type: application/json" \
  -H "x-void-dev-trigger: <printed-token>" \
  -d '{"queue":"my-queue","messages":[{"id":"1","timestamp":'"$(date +%s000)"',"body":{"hello":"world"},"attempts":1}]}'
```

If you set `__VOID_PROXY_TOKEN` in `.dev.vars`, that explicit token takes precedence and the printed curl command uses `x-void-internal: <your-token>` instead.

In **framework mode** (SvelteKit, Nuxt, Analog, Astro, TanStack Start, React Router, vinext), the `/__void/queue` endpoint runs inside the framework adapter's request pipeline (or the dev miniflare for Class A frameworks), so the consumer sees whatever bindings the adapter exposes (D1, KV, R2, queue producers, etc.). Native Miniflare queue delivery is not wired up in framework mode — use the manual dispatch endpoint to exercise a consumer.

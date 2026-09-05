---
outline: deep
---

# AI

Void provides a typed AI client powered by Cloudflare's [AI Gateway](https://developers.cloudflare.com/ai-gateway/). Import `ai` from `void/ai` and run inference directly from your route handlers. Usage is metered through Void.

```ts
import { ai } from "void/ai";
```

## Basic Usage

Call `ai.run()` with a model name and inputs. Model names and input types are fully typed from `@cloudflare/workers-types`.

```ts
import { defineHandler } from "void";
import { ai } from "void/ai";

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  const result = await ai.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [{ role: "user", content: prompt }],
  });

  return c.json(result);
});
```

You can use any model available through Cloudflare's AI binding, including Workers AI models such as `@cf/meta/llama-3.1-8b-instruct` and Cloudflare Gateway models such as `google/gemini-2.5-flash` or `openai/gpt-4.1-mini`. The input object must match the selected Cloudflare model's schema. Models that return binary data, such as generated images, are returned as a `Blob` from `ai.run()`.

## Streaming

Use `ai.stream()` to get a streaming response with SSE headers that you can return directly from a route handler:

```ts
import { defineHandler } from "void";
import { ai } from "void/ai";

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai.stream("@cf/meta/llama-3.1-8b-instruct", {
    messages: [{ role: "user", content: prompt }],
  });
});
```

`ai.stream()` calls `ai.run()` with `stream: true` and wraps the result in a `Response` with `content-type: text/event-stream` and `cache-control: no-cache` headers.

## Listing Models

Use `ai.models()` to list available models:

```ts
const models = await ai.models();

// Filter by task
const textModels = await ai.models({ task: "Text Generation" });
```

## Markdown Conversion

Use `ai.toMarkdown()` to convert documents to markdown:

```ts
const result = await ai.toMarkdown([{ name: "document.pdf", blob: pdfBytes }]);
```

## Local Development

AI requires Void credentials for local development. Run `void auth login` and `void project link` (or follow the interactive setup during `vite dev`) to connect your project.

Once linked, credentials are injected automatically as worker bindings. You do not need to configure them by hand. All inference traffic goes through the Void AI proxy over HTTPS, so usage is tracked and metered the same way it is in production.

## Usage Limits

Workers AI usage is metered in [**neurons**](https://developers.cloudflare.com/workers-ai/platform/pricing/), which is Cloudflare's unit for inference cost. Usage resets at the start of each billing cycle.

| Plan | Included      | At limit                           |
| ---- | ------------- | ---------------------------------- |
| Free | 100,000/month | Blocked until billing cycle resets |
| Solo | 300,000/month | Overage billed                     |
| Pro  | 500,000/month | Overage billed                     |

On the **free tier**, AI requests return a `429` error once the limit is reached. On **paid tiers**, usage beyond the included allowance is tracked as overage on your monthly bill.

## Cloudflare Gateway Models

`ai.run()` mirrors Cloudflare's `env.AI.run()` model naming and input schemas. Third-party models use Cloudflare model IDs and Cloudflare-managed credentials.

```ts
const result = await ai.run("google/gemini-2.5-flash", {
  contents: [
    {
      role: "user",
      parts: [{ text: "Explain Durable Objects in one paragraph." }],
    },
  ],
});
```

OpenAI-compatible models use OpenAI-style `messages`:

```ts
const result = await ai.run("openai/gpt-4.1-mini", {
  messages: [{ role: "user", content: "Summarize this deploy." }],
});
```

Pass Cloudflare AI Gateway options as the third argument:

```ts
const result = await ai.run(
  "openai/gpt-4.1-mini",
  {
    messages: [{ role: "user", content: "Summarize this deploy." }],
  },
  {
    gateway: {
      skipCache: true,
    },
  },
);
```

Void always injects the `void` gateway ID and project metadata for metering.

## Provider-Native Requests

Use `ai.provider(provider).fetch(path, init)` when you want to call a provider-native API with your own provider key. The request still routes through Cloudflare AI Gateway and Void metering, but the request shape is the provider's native HTTP API.

### OpenAI

```ts
import { defineHandler } from "void";
import { ai } from "void/ai";

export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  const response = await ai.provider("openai").fetch("/chat/completions", {
    body: {
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 512,
    },
  });

  const result = await response.json();
  return c.json(result);
});
```

### Google AI Studio

```ts
const response = await ai
  .provider("google-ai-studio")
  .fetch("/v1/models/gemini-2.5-flash:generateContent", {
    body: {
      contents: [
        {
          role: "user",
          parts: [{ text: "What is Cloudflare?" }],
        },
      ],
    },
  });

const result = await response.json();
```

### Custom Providers

For providers that are not in Void's default key map, pass the secret name and API-key header:

```ts
const response = await ai
  .provider("custom-provider", {
    apiKeyEnv: "CUSTOM_PROVIDER_API_KEY",
    apiKeyHeader: "x-api-key",
    apiKeyPrefix: "",
  })
  .fetch("/v1/respond", {
    body: { prompt: "Hello" },
  });
```

### Image Generation

Use `ai.run()` or `ai.image()` for Cloudflare-native image models:

```ts
export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();
  return ai.image("@cf/black-forest-labs/flux-1-schnell", { prompt });
});
```

Use `ai.provider().fetch()` for provider-native image APIs:

```ts
export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai.provider("openai").fetch("/images/generations", {
    body: {
      model: "gpt-image-1.5",
      prompt,
      size: "1024x1024",
      response_format: "b64_json",
    },
  });
});
```

For multipart provider APIs, pass a `FormData` body. Void serializes the body through the proxy and reconstructs it before forwarding to AI Gateway:

```ts
export const POST = defineHandler(async (c) => {
  const body = await c.req.parseBody();
  const form = new FormData();
  form.set("model", "gpt-image-1.5");
  form.set("prompt", String(body.prompt));
  form.set("image", body.image as Blob, "source.png");

  return ai.provider("openai").fetch("/images/edits", { body: form });
});
```

### Provider Key Convention

Provider-native requests require an API key set as a project secret. The env var name is automatically derived from the provider name:

| Provider prefix    | Env var               |
| ------------------ | --------------------- |
| `openai`           | `OPENAI_API_KEY`      |
| `anthropic`        | `ANTHROPIC_API_KEY`   |
| `google-ai-studio` | `GOOGLE_API_KEY`      |
| `deepseek`         | `DEEPSEEK_API_KEY`    |
| `groq`             | `GROQ_API_KEY`        |
| `mistral`          | `MISTRAL_API_KEY`     |
| `grok`             | `GROK_API_KEY`        |
| `openrouter`       | `OPENROUTER_API_KEY`  |
| `perplexity`       | `PERPLEXITY_API_KEY`  |
| `cohere`           | `COHERE_API_KEY`      |
| `cerebras`         | `CEREBRAS_API_KEY`    |
| `huggingface`      | `HUGGINGFACE_API_KEY` |
| `replicate`        | `REPLICATE_API_KEY`   |
| `baseten`          | `BASETEN_API_KEY`     |
| `cartesia`         | `CARTESIA_API_KEY`    |
| `deepgram`         | `DEEPGRAM_API_KEY`    |
| `elevenlabs`       | `ELEVENLABS_API_KEY`  |
| `fal`              | `FAL_API_KEY`         |
| `ideogram`         | `IDEOGRAM_API_KEY`    |
| `parallel`         | `PARALLEL_API_KEY`    |

OpenAI-style providers use `Authorization: Bearer <key>`. Google AI Studio uses `x-goog-api-key`. Use `apiKeyHeader` and `apiKeyPrefix` for custom providers.

For production, add your API key as a project secret:

```bash
void secret put OPENAI_API_KEY=sk-...
```

For local development, add it to `.env.local` in your project root:

```
OPENAI_API_KEY=sk-...
```

If the key is missing at runtime, `ai.provider().fetch()` throws a descriptive error telling you which env var to set.

### Streaming with Provider-Native APIs

Provider-native streaming APIs return the provider response directly:

```ts
export const POST = defineHandler(async (c) => {
  const { prompt } = await c.req.json();

  return ai.provider("openai").fetch("/chat/completions", {
    body: {
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      stream: true,
    },
  });
});
```

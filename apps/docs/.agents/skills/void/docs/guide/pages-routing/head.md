---
outline: deep
---

# Head Management

Pages mode manages `<head>` tags (title, meta, links, scripts, HTML/body attributes) across three layers with clear precedence: **page > middleware > config**.

## Page `head()` Export

Export a `head()` function from your `.server.ts` file. It receives the Hono context and the resolved loader props, and returns a `HeadDescriptor`:

```ts
// pages/posts/[slug].server.ts
import { defineHandler, defineHead } from "void";

export interface Props {
  post: { title: string; excerpt: string; slug: string };
}

export const loader = defineHandler<Props>(async (c) => {
  const post = await getPost(c.req.param("slug"));
  return { post };
});

export const head = defineHead<Props>((c, props) => {
  // [!code highlight]
  return {
    title: props.post.title,
    meta: [
      { name: "description", content: props.post.excerpt },
      { property: "og:title", content: props.post.title },
    ],
  };
});
```

`head()` runs server-side only, after the loader resolves.

## Config Defaults

Set site-wide head defaults in `void.json`:

```json
{
  "head": {
    "titleTemplate": "%s | My Site",
    "htmlAttrs": { "lang": "en" },
    "meta": [
      { "charset": "utf-8" },
      { "name": "viewport", "content": "width=device-width, initial-scale=1" }
    ]
  }
}
```

`titleTemplate` wraps the page title. `%s` is replaced with whatever `head()` returns as `title`. A page returning `{ title: "About" }` with the template above produces `<title>About | My Site</title>`.

## Middleware Defaults

Middleware can inject head defaults that apply to every page. This is useful for things like a theme script that must run before first paint:

```ts
// middleware/01.head.ts
import { defineMiddleware } from "void";

export default defineMiddleware(async (c, next) => {
  c.set("headDefaults", {
    script: [
      {
        innerHTML: `const t = localStorage.getItem("theme");
        if (t) document.documentElement.dataset.theme = t;`,
      },
    ],
  });
  await next();
});
```

## Merge Precedence

When multiple layers provide head data, they merge with this precedence:

| Field       | Behavior                                                                                                             |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `title`     | Page wins. `titleTemplate` from config wraps the winning title.                                                      |
| `meta`      | Deduplicates by `name` or `property`. Page entries override matching keys, and non-conflicting entries are appended. |
| `link`      | Concatenated: config first, then middleware, then page.                                                              |
| `script`    | Concatenated: config first, then middleware, then page.                                                              |
| `htmlAttrs` | Shallow merge, page wins conflicts.                                                                                  |
| `bodyAttrs` | Shallow merge, page wins conflicts.                                                                                  |

## HeadDescriptor Shape

```ts
interface HeadDescriptor {
  title?: string;
  meta?: Array<{
    name?: string;
    property?: string;
    content?: string;
    charset?: string;
  }>;
  link?: Array<{ rel: string; href: string; [key: string]: string | undefined }>;
  script?: Array<{ src?: string; innerHTML?: string; [key: string]: string | undefined }>;
  htmlAttrs?: Record<string, string>;
  bodyAttrs?: Record<string, string>;
}
```

## Markdown Auto-Head

Markdown pages (`.md` files) automatically generate head tags from frontmatter. You do not need a `.server.ts` file:

```md
---
title: Getting Started
description: Learn how to use Void
---

Your content here...
```

This produces `<title>Getting Started</title>` and `<meta name="description" content="Learn how to use Void">`, with `titleTemplate` applied if configured.

## Client-Side Updates

On SPA navigation, head tags update automatically. The framework tracks managed tags with a `data-void-head` attribute and preserves matching tags across navigations, so unchanged stylesheet and preload links are not torn down and re-added. Tags that are no longer present are removed, and new tags are inserted.

`script`, `htmlAttrs`, and `bodyAttrs` are SSR-only. They are not re-applied on client-side navigation.

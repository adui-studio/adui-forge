---
outline: deep
---

# Sandboxes

Void can wire Cloudflare Sandboxes into Void apps. A sandbox gives each session an isolated container for running commands, working with files, and exposing ports from server-side code.

```ts
import { defineHandler } from "void";
import { getSandbox } from "void/sandbox";

export const POST = defineHandler(async (c) => {
  const { command } = await c.req.json<{ command: string }>();
  const sandbox = await getSandbox("default");
  const result = await sandbox.exec(command);

  return c.json(result);
});
```

Importing from `void/sandbox` enables the `SANDBOX` Durable Object binding, exports the SDK's `Sandbox` class from the generated Worker entry, and adds the matching `containers` and migration metadata to the Cloudflare worker config.

## Configuration

Most apps do not need config. The default binding is `SANDBOX`, the Durable Object class is `Sandbox`, local development uses the Dockerfile bundled with `@cloudflare/sandbox`, and `void deploy` uses the matching published sandbox image.

Use `void.json` when you need a custom image or container size:

```json
{
  "sandbox": {
    "image": "./Dockerfile.sandbox",
    "platformImage": "registry.example.com/acme/sandbox:latest",
    "instanceType": "lite",
    "maxInstances": 2
  }
}
```

Available fields:

| Field               | Default                        | Description                                              |
| ------------------- | ------------------------------ | -------------------------------------------------------- |
| `binding`           | `SANDBOX`                      | Worker binding name                                      |
| `className`         | `Sandbox`                      | Durable Object class exported by the Worker              |
| `containerName`     | `void-sandbox`                 | Cloudflare container app name                            |
| `image`             | Bundled sandbox SDK Dockerfile | Dockerfile path or registry image used by Wrangler/local |
| `imageBuildContext` | Directory of `image`           | Docker build context for Wrangler/local                  |
| `platformImage`     | Matching sandbox SDK image     | Registry image used by `void deploy`                     |
| `instanceType`      | `lite` on Void deploy          | Container size, such as `lite`, `basic`, `standard-1`    |
| `maxInstances`      | `20` on Void deploy            | Maximum number of container instances                    |

## Runtime API

`getSandbox(id, options)` returns the SDK sandbox stub for a session id. IDs are normalized by default so user-provided session ids can safely map to Durable Object names.

```ts
import { getSandbox } from "void/sandbox";

// inside an async handler
const sandbox = await getSandbox(`user-${user.id}`);
await sandbox.writeFile("/tmp/input.txt", "hello");
const result = await sandbox.exec("cat /tmp/input.txt");
```

You can also use the namespace directly from `c.env.SANDBOX` when you need lower-level Durable Object control.

## State persistence

There are two distinct layers to think about: stable Durable Object identity, and ephemeral container state.

`getSandbox(id)` always resolves to the same Durable Object instance for a given `id`, regardless of how many times the project has been deployed or rolled back. Anything written through the DO's persistent storage (`ctx.storage`, the embedded SQLite database) survives deploys, rollbacks, and container restarts. That layer is the durable home for sandbox metadata, session ids, and any data you need to outlive the container.

The container itself — filesystem, running processes, exposed ports, in-memory shell sessions — is tied to a single container lifetime and is **not** durable. Cloudflare Containers idle out after inactivity (the SDK default is `sleepAfter: "10m"`), and a container can also restart on a process crash or a platform-side reschedule. When that happens, files in the container filesystem, background processes, and previously exposed ports are lost. Setting `keepAlive: true` disables the idle timer but does not protect against crashes or infrastructure restarts.

Treat the sandbox container as a working environment, not a source of truth. Persist anything you cannot afford to lose to DO storage, your database, KV, or R2 (the SDK also offers backup/restore helpers for snapshotting a directory to R2). Project deletion destroys both layers, but plenty of routine events destroy only the container layer.

## Deployment

`void deploy` provisions the `SANDBOX` Durable Object namespace, attaches the Cloudflare Container metadata to the Worker upload, and creates or updates the matching container application in the Void platform account.

Platform deploys require a registry image reference. The default sandbox works without extra config. If `sandbox.image` points at a custom local Dockerfile, also set `sandbox.platformImage` to an image you have already pushed to a registry.

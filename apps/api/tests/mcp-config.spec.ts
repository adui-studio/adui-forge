import { describe, expect, it } from "vite-plus/test";
import { parseMcpServers } from "../src/agents/agent.factory";

describe("parseMcpServers", () => {
  it("parses a valid JSON array", () => {
    expect(parseMcpServers('[{"name":"github","command":"npx","args":["-y","mcp-gh"]}]')).toEqual([
      { name: "github", command: "npx", args: ["-y", "mcp-gh"], env: undefined },
    ]);
  });

  it("returns empty for unset or blank", () => {
    expect(parseMcpServers(undefined)).toEqual([]);
    expect(parseMcpServers("")).toEqual([]);
  });

  it("rejects malformed payloads", () => {
    expect(() => parseMcpServers("not-json")).toThrow();
    expect(() => parseMcpServers('{"name":"x"}')).toThrow("JSON array");
    expect(() => parseMcpServers('[{"name":"x"}]')).toThrow("name and command");
  });
});

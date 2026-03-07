import { describe, expect, it } from "vitest";
import { loadAgentdConfig } from "./config";
import { buildHealthPayload } from "./health";

describe("buildHealthPayload", () => {
  it("exposes the stable MVP runtime settings", () => {
    const payload = buildHealthPayload(loadAgentdConfig({}, "C:/takomidx"));

    expect(payload.service).toBe("agentd");
    expect(payload.status).toBe("ok");
    expect(payload.runtimeBackend).toBe("container");
    expect(payload.editorTarget).toBe("vscode");
  });
});

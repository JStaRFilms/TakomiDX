import { describe, expect, it } from "vitest";
import { loadAgentdConfig } from "./config";

describe("loadAgentdConfig", () => {
  it("derives the documented defaults and local paths", () => {
    const config = loadAgentdConfig({}, "C:/takomidx");

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(4000);
    expect(config.previewDomain).toBe("takomi.localhost");
    expect(config.authBrokerHost).toBe("auth.takomi.localhost");
    expect(config.dataDir).toBe("C:\\takomidx\\.takomi");
    expect(config.stateDbPath).toBe("C:\\takomidx\\.takomi\\state\\agentd.db");
    expect(config.worktreeRootDir).toBe("C:\\takomidx\\.takomi\\worktrees");
  });
});

import { describe, expect, it } from "vitest";
import { resolveMissionControlEnv } from "./env";

describe("resolveMissionControlEnv", () => {
  it("falls back to documented defaults", () => {
    const env = resolveMissionControlEnv();

    expect(env.shared.TAKOMI_RUNTIME_BACKEND).toBe("container");
    expect(env.shared.TAKOMI_EDITOR_TARGET).toBe("vscode");
    expect(env.public.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL).toBe(
      "http://127.0.0.1:4000",
    );
  });
});

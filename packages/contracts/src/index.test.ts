import {
  createAuthBrokerHost,
  createPreviewHost,
  createWorkspaceDataRoot,
  workspaceSlugSchema,
} from "./index";
import { describe, expect, it } from "vitest";

describe("@takomi/contracts", () => {
  it("builds preview hosts from the stable workspace slug", () => {
    expect(createPreviewHost("billing-fix", "takomi.localhost")).toBe(
      "billing-fix.takomi.localhost",
    );
  });

  it("reserves a stable auth broker host", () => {
    expect(createAuthBrokerHost("takomi.localhost")).toBe(
      "auth.takomi.localhost",
    );
  });

  it("builds predictable workspace data roots", () => {
    expect(createWorkspaceDataRoot(".takomi", "ws_abcd1234")).toBe(
      ".takomi/workspaces/ws_abcd1234",
    );
  });

  it("accepts kebab-case workspace slugs", () => {
    expect(workspaceSlugSchema.safeParse("checkout-redesign").success).toBe(
      true,
    );
  });
});

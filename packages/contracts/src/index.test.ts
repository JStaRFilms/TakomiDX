import {
  createManualFallbackUrl,
  createAuthBrokerHost,
  createWorkspaceBranchName,
  createPreviewHost,
  createPreviewRegistrationPayload,
  createPreviewUrl,
  createRuntimeContainerName,
  createWorkspaceDataRoot,
  workspaceMetadataSchema,
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

  it("builds predictable workspace branch names", () => {
    expect(createWorkspaceBranchName("agent", "billing-fix")).toBe(
      "agent/billing-fix",
    );
  });

  it("accepts kebab-case workspace slugs", () => {
    expect(workspaceSlugSchema.safeParse("checkout-redesign").success).toBe(
      true,
    );
  });

  it("builds stable preview URLs", () => {
    expect(createPreviewUrl("runtime-routing.takomi.localhost")).toBe(
      "http://runtime-routing.takomi.localhost/",
    );
  });

  it("builds manual fallback URLs from runtime targets", () => {
    expect(createManualFallbackUrl("127.0.0.1:45231", "http", "/healthz")).toBe(
      "http://127.0.0.1:45231/healthz",
    );
  });

  it("builds deterministic container names", () => {
    expect(createRuntimeContainerName("ws_abcd1234", "runtime-routing")).toBe(
      "takomi-runtime-routing-ws_abcd1234",
    );
  });

  it("creates preview registration payloads for the UI boundary", () => {
    expect(
      createPreviewRegistrationPayload({
        workspaceId: "ws_abcd1234",
        host: "runtime-routing.takomi.localhost",
        target: "127.0.0.1:45231",
        targetPort: 45231,
        protocol: "http",
        healthPath: "/healthz",
        healthStatus: "healthy",
        status: "registered",
        proxyAdapter: "caddy",
        registeredAt: "2026-03-07T03:07:31.000Z",
        lastError: null,
      }),
    ).toMatchObject({
      workspaceId: "ws_abcd1234",
      url: "http://runtime-routing.takomi.localhost/",
      manualFallbackUrl: "http://127.0.0.1:45231/healthz",
      routeStatus: "registered",
    });
  });

  it("validates durable workspace metadata records", () => {
    expect(
      workspaceMetadataSchema.parse({
        id: "ws_abcd1234",
        slug: "billing-fix",
        repoPath: "C:/repos/takomi",
        worktreePath: "C:/repos/.takomi/worktrees/ws_abcd1234",
        branch: "agent/billing-fix",
        baseBranch: "main",
        branchType: "agent",
        runtimeType: "container",
        previewHost: "billing-fix.takomi.localhost",
        status: "queued",
        createdAt: "2026-03-07T03:07:31.000Z",
        updatedAt: "2026-03-07T03:07:31.000Z",
        archivedAt: null,
        lastError: null,
        artifacts: {
          root: "C:/repos/.takomi/workspaces/ws_abcd1234",
          logsDir: "C:/repos/.takomi/workspaces/ws_abcd1234/logs",
          tracesDir: "C:/repos/.takomi/workspaces/ws_abcd1234/traces",
          reviewDir: "C:/repos/.takomi/workspaces/ws_abcd1234/review",
          browserDir: "C:/repos/.takomi/workspaces/ws_abcd1234/browser",
        },
      }),
    ).toMatchObject({
      metadataVersion: 1,
      branch: "agent/billing-fix",
      status: "queued",
    });
  });
});

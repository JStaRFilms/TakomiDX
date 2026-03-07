import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthBroker } from "./auth-broker";

const tempDirs: string[] = [];

function createTempDir() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "takomi-auth-broker-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of tempDirs.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

function createDeterministicBroker(root: string) {
  let currentTime = new Date("2026-03-07T03:07:31.000Z");
  let sessionCount = 0;
  let nonceCount = 0;
  let eventCount = 0;

  const broker = createAuthBroker({
    authBrokerHost: "auth.takomi.localhost",
    stateDir: path.join(root, "state"),
    stateSecret: "test-auth-broker-secret",
    now: () => currentTime,
    idGenerator: () => `auth_session${String(++sessionCount).padStart(2, "0")}`,
    nonceGenerator: () => `nonce-${String(++nonceCount).padStart(16, "0")}`,
    eventIdGenerator: () => `evt_${String(++eventCount).padStart(8, "0")}`,
  });

  return {
    broker,
    setNow(next: string) {
      currentTime = new Date(next);
    },
  };
}

describe("auth broker", () => {
  it("creates stable callback state, forwards the callback, and completes redemption", () => {
    const root = createTempDir();
    const { broker } = createDeterministicBroker(root);
    const start = broker.createBrowserSession({
      workspaceId: "ws_authgood1",
      previewHost: "auth-good.takomi.localhost",
      provider: "github",
    });

    expect(start.session.callbackUrl).toBe(
      "http://auth.takomi.localhost/callback/github/ws_authgood1",
    );

    const resolution = broker.handleCallback({
      provider: "github",
      workspaceId: "ws_authgood1",
      state: start.state,
      code: "oauth-code-123",
    });

    expect(resolution.session.status).toBe("callback_received");
    expect(resolution.redirectUrl).toContain(
      "http://auth-good.takomi.localhost/.takomi/auth/callback",
    );

    const completed = broker.redeemCallback({
      sessionId: resolution.session.id,
      handoffToken: resolution.handoffToken,
    });

    expect(completed.status).toBe("completed");
    expect(completed.callback?.code).toBe("oauth-code-123");
    expect(
      broker
        .listEvents("ws_authgood1")
        .map((event) => event.type)
        .sort(),
    ).toEqual(
      [
        "auth.callback.received",
        "auth.session.completed",
        "auth.session.requested",
      ].sort(),
    );
  });

  it("marks sessions as failed when callback state has expired", () => {
    const root = createTempDir();
    const { broker, setNow } = createDeterministicBroker(root);
    const start = broker.createBrowserSession({
      workspaceId: "ws_authexp01",
      previewHost: "auth-expired.takomi.localhost",
      provider: "github",
      ttlSeconds: 1,
    });

    setNow("2026-03-07T03:07:33.000Z");

    const resolution = broker.handleCallback({
      provider: "github",
      workspaceId: "ws_authexp01",
      state: start.state,
      code: "late-oauth-code",
    });

    expect(resolution.session.status).toBe("failed");
    expect(resolution.session.lastError?.code).toBe("expired_state");
    expect(resolution.redirectUrl).toContain(
      "http://auth-expired.takomi.localhost/.takomi/auth/callback",
    );
  });

  it("fails callbacks with invalid state but still maps the failure to the workspace", () => {
    const root = createTempDir();
    const { broker } = createDeterministicBroker(root);
    const start = broker.createBrowserSession({
      workspaceId: "ws_authbad01",
      previewHost: "auth-invalid.takomi.localhost",
      provider: "github",
    });

    const resolution = broker.handleCallback({
      provider: "github",
      workspaceId: "ws_authbad01",
      state: `${start.state}tampered`,
      code: "ignored",
    });

    expect(resolution.session.status).toBe("failed");
    expect(resolution.session.lastError?.code).toBe("invalid_state");
    expect(resolution.redirectUrl).toContain(
      "http://auth-invalid.takomi.localhost/.takomi/auth/callback",
    );
  });

  it("captures provider errors for UI inspection and handoff", () => {
    const root = createTempDir();
    const { broker } = createDeterministicBroker(root);
    const start = broker.createBrowserSession({
      workspaceId: "ws_autherr01",
      previewHost: "auth-provider.takomi.localhost",
      provider: "google",
    });

    const resolution = broker.handleCallback({
      provider: "google",
      workspaceId: "ws_autherr01",
      state: start.state,
      error: "access_denied",
      errorDescription: "The user denied the request.",
    });

    expect(resolution.session.status).toBe("failed");
    expect(resolution.session.lastError?.code).toBe("provider_error");
    expect(resolution.session.lastError?.providerMessage).toBe(
      "The user denied the request.",
    );

    const failedSession = broker.redeemCallback({
      sessionId: resolution.session.id,
      handoffToken: resolution.handoffToken,
    });

    expect(failedSession.status).toBe("failed");
    expect(failedSession.callback?.error).toBe("access_denied");
  });

  it("models device-flow sessions for tool auth without browser callbacks", () => {
    const root = createTempDir();
    const { broker } = createDeterministicBroker(root);
    const start = broker.createDeviceSession({
      workspaceId: "ws_authdev01",
      previewHost: "auth-device.takomi.localhost",
      provider: "github",
      device: {
        userCode: "ABCD-EFGH",
        verificationUri: "https://github.com/login/device",
        verificationUriComplete:
          "https://github.com/login/device?user_code=ABCD-EFGH",
        intervalSeconds: 5,
      },
    });

    expect(start.session.flow).toBe("device_code");
    expect(start.session.status).toBe("awaiting_user");
    expect(start.session.device?.status).toBe("awaiting_user");

    const completed = broker.resolveDeviceSession({
      sessionId: start.session.id,
      outcome: "authorized",
    });

    expect(completed.status).toBe("completed");
    expect(completed.device?.status).toBe("authorized");
  });
});

import {
  authCallbackPayloadSchema,
  authDeviceFlowSchema,
  authErrorSchema,
  authHandoffPayloadSchema,
  authLifecycleEventSchema,
  authSessionSchema,
  authSessionStartResponseSchema,
  authStatePayloadSchema,
  createAuthBrokerCallbackUrl,
  createPreviewUrl,
  type AuthCallbackPayload,
  type AuthDeviceFlow,
  type AuthError,
  type AuthLifecycleEvent,
  type AuthSession,
  type AuthSessionStartResponse,
  type PreviewProtocol,
} from "@takomi/contracts";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const DEFAULT_FORWARD_PATH = "/.takomi/auth/callback";
const DEFAULT_SESSION_TTL_SECONDS = 300;

export interface WorkspaceAuthTarget {
  workspaceId: string;
  previewHost: string;
}

export interface CreateAuthBrokerOptions {
  authBrokerHost: string;
  stateDir: string;
  previewProtocol?: PreviewProtocol;
  stateSecret?: string;
  now?: () => Date;
  idGenerator?: () => string;
  nonceGenerator?: () => string;
  eventIdGenerator?: () => string;
  onEvent?: (event: AuthLifecycleEvent) => void;
}

export interface CreateBrowserAuthSessionInput extends WorkspaceAuthTarget {
  provider: string;
  ttlSeconds?: number;
  forwardPath?: string;
}

export interface CreateDeviceAuthSessionInput extends WorkspaceAuthTarget {
  provider: string;
  ttlSeconds?: number;
  forwardPath?: string;
  device: Omit<AuthDeviceFlow, "status"> & {
    status?: AuthDeviceFlow["status"];
  };
}

export interface ResolveDeviceAuthSessionInput {
  sessionId: string;
  outcome: "authorized" | "denied" | "expired";
  error?: AuthError | null;
}

export interface HandleAuthCallbackInput {
  provider: string;
  workspaceId: string;
  state: string | null;
  code?: string | null;
  error?: string | null;
  errorDescription?: string | null;
  errorUri?: string | null;
}

export interface RedeemAuthCallbackInput {
  sessionId: string;
  handoffToken: string;
}

export interface AuthCallbackResolution {
  session: AuthSession;
  handoffToken: string;
  redirectUrl: string;
}

type AuthFailureCode =
  | "invalid_state"
  | "expired_state"
  | "provider_error"
  | "session_not_found"
  | "workspace_mismatch"
  | "invalid_handoff";

export class AuthBrokerError extends Error {
  constructor(
    message: string,
    public readonly code: AuthFailureCode,
    public readonly status: number,
    public readonly errorDetail: AuthError,
    public readonly session: AuthSession | null = null,
    public readonly redirectUrl: string | null = null,
  ) {
    super(message);
    this.name = "AuthBrokerError";
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function appendJsonLine(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  appendFileSync(filePath, JSON.stringify(value) + "\n", "utf8");
}

function readJsonLines<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

function createIdentifier(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function createNonce() {
  return randomBytes(18).toString("hex");
}

function signPayload(payloadBase64: string, secret: string) {
  return createHmac("sha256", secret).update(payloadBase64).digest("base64url");
}

function encodeSignedPayload(payload: unknown, secret: string) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadBase64}.${signPayload(payloadBase64, secret)}`;
}

function decodePayload(token: string) {
  const [payloadBase64] = token.split(".");

  if (!payloadBase64) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function verifySignedPayload<T>(
  token: string,
  secret: string,
  schema: { parse(value: unknown): T },
) {
  const [payloadBase64, signature] = token.split(".");

  if (!payloadBase64 || !signature) {
    return null;
  }

  const expected = signPayload(payloadBase64, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  const decoded = decodePayload(token);
  return decoded ? schema.parse(decoded) : null;
}

function buildForwardUrl(
  previewUrl: string,
  forwardPath: string,
  sessionId: string,
  handoffToken: string,
) {
  const url = new URL(forwardPath, previewUrl);
  url.searchParams.set("session", sessionId);
  url.searchParams.set("handoff", handoffToken);
  return url.toString();
}

function createAuthError(input: {
  code: AuthFailureCode;
  providerMessage?: string | null;
  expectedCallbackUrl?: string | null;
  receivedCallbackUrl?: string | null;
}) {
  const definitions: Record<
    AuthFailureCode,
    { title: string; message: string; resolution: string }
  > = {
    expired_state: {
      title: "Auth request expired",
      message: "The auth callback arrived after the broker state expired.",
      resolution: "Restart the auth flow from the workspace and complete it promptly.",
    },
    invalid_handoff: {
      title: "Auth handoff is invalid",
      message: "The workspace handoff could not be verified by the broker.",
      resolution: "Restart the auth flow so the broker can mint a fresh handoff.",
    },
    invalid_state: {
      title: "Auth state is invalid",
      message: "The provider callback state could not be verified safely.",
      resolution:
        "Check the registered callback URL and restart the auth flow from the workspace.",
    },
    provider_error: {
      title: "Provider rejected the auth callback",
      message: "The OAuth provider returned an error instead of an authorization code.",
      resolution:
        "Inspect the provider message, then verify the registered callback URL and provider configuration.",
    },
    session_not_found: {
      title: "Auth session not found",
      message: "The broker could not find the auth session referenced by the callback.",
      resolution: "Restart the auth flow from the correct workspace.",
    },
    workspace_mismatch: {
      title: "Auth callback targeted the wrong workspace",
      message: "The callback route does not match the signed workspace binding.",
      resolution:
        "Use the broker callback URL issued for this workspace and avoid reusing state across workspaces.",
    },
  };

  const definition = definitions[input.code];

  return authErrorSchema.parse({
    code: input.code,
    title: definition.title,
    message: definition.message,
    providerMessage: input.providerMessage ?? null,
    expectedCallbackUrl: input.expectedCallbackUrl ?? null,
    receivedCallbackUrl: input.receivedCallbackUrl ?? null,
    resolution: definition.resolution,
  });
}

export function createAuthBroker(options: CreateAuthBrokerOptions) {
  const previewProtocol = options.previewProtocol ?? "http";
  const stateSecret =
    options.stateSecret ??
    randomBytes(32).toString("base64url");
  const now = options.now ?? (() => new Date());
  const idGenerator = options.idGenerator ?? (() => createIdentifier("auth"));
  const nonceGenerator = options.nonceGenerator ?? createNonce;
  const eventIdGenerator =
    options.eventIdGenerator ?? (() => createIdentifier("evt"));
  const sessions = new Map<string, AuthSession>();
  const events = readJsonLines<AuthLifecycleEvent>(
    path.join(options.stateDir, "auth-events.jsonl"),
  ).map((event) => authLifecycleEventSchema.parse(event));

  function getSessionsDir() {
    return path.join(options.stateDir, "auth-sessions");
  }

  function getSessionPath(sessionId: string) {
    return path.join(getSessionsDir(), `${sessionId}.json`);
  }

  function getEventsPath() {
    return path.join(options.stateDir, "auth-events.jsonl");
  }

  function persistSession(session: AuthSession) {
    writeJsonFile(getSessionPath(session.id), session);
    sessions.set(session.id, session);
  }

  function emitEvent(
    session: AuthSession,
    type: AuthLifecycleEvent["type"],
    summary: string,
    detail: string | null = null,
    error: AuthError | null = null,
  ) {
    const event = authLifecycleEventSchema.parse({
      id: eventIdGenerator(),
      sessionId: session.id,
      workspaceId: session.workspaceId,
      provider: session.provider,
      flow: session.flow,
      type,
      status: session.status,
      timestamp: now().toISOString(),
      summary,
      detail,
      error,
    });

    appendJsonLine(getEventsPath(), event);
    events.push(event);
    options.onEvent?.(event);
    return event;
  }

  function listPersistedSessionIds() {
    mkdirSync(getSessionsDir(), { recursive: true });

    return readdirSync(getSessionsDir(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name.replace(/\.json$/, ""));
  }

  function restorePersistedSessions() {
    mkdirSync(options.stateDir, { recursive: true });

    for (const sessionId of listPersistedSessionIds()) {
      const session = authSessionSchema.parse(
        JSON.parse(readFileSync(getSessionPath(sessionId), "utf8")),
      );
      sessions.set(session.id, session);
    }
  }

  function getSessionOrThrow(sessionId: string) {
    const session = sessions.get(sessionId);

    if (!session) {
      throw new AuthBrokerError(
        `No auth session is registered for ${sessionId}.`,
        "session_not_found",
        404,
        createAuthError({
          code: "session_not_found",
        }),
      );
    }

    return session;
  }

  function createHandoffToken(session: AuthSession) {
    return encodeSignedPayload(
      authHandoffPayloadSchema.parse({
        sessionId: session.id,
        workspaceId: session.workspaceId,
        provider: session.provider,
        nonce: nonceGenerator(),
        expiresAt: session.expiresAt,
      }),
      stateSecret,
    );
  }

  function updateSession(
    session: AuthSession,
    updates: Partial<AuthSession>,
  ) {
    const nextSession = authSessionSchema.parse({
      ...session,
      ...updates,
      updatedAt: now().toISOString(),
    });

    persistSession(nextSession);
    return nextSession;
  }

  function failSession(
    session: AuthSession,
    error: AuthError,
    callback: AuthCallbackPayload | null = session.callback,
    emitFailureEvent: boolean = true,
  ) {
    const nextSession = updateSession(session, {
      status: "failed",
      lastError: error,
      callback,
      completedAt: session.completedAt,
    });

    if (emitFailureEvent) {
      emitEvent(
        nextSession,
        "auth.session.failed",
        `Auth session ${nextSession.id} failed for ${nextSession.provider}.`,
        error.message,
        error,
      );
    }

    return nextSession;
  }

  function buildCallbackPayload(input: HandleAuthCallbackInput) {
    return authCallbackPayloadSchema.parse({
      code: input.code ?? null,
      error: input.error ?? null,
      errorDescription: input.errorDescription ?? null,
      errorUri: input.errorUri ?? null,
      receivedAt: now().toISOString(),
    });
  }

  function resolveRedirect(session: AuthSession) {
    const handoffToken = createHandoffToken(session);
    const redirectUrl = buildForwardUrl(
      session.previewUrl,
      session.forwardPath,
      session.id,
      handoffToken,
    );
    const nextSession = updateSession(session, {
      forwardUrl: redirectUrl,
    });

    return {
      session: nextSession,
      handoffToken,
      redirectUrl,
    } satisfies AuthCallbackResolution;
  }

  restorePersistedSessions();

  return {
    createBrowserSession(input: CreateBrowserAuthSessionInput) {
      const timestamp = now();
      const expiresAt = new Date(
        timestamp.getTime() + (input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS) * 1000,
      ).toISOString();
      const session = authSessionSchema.parse({
        id: idGenerator(),
        workspaceId: input.workspaceId,
        provider: input.provider,
        flow: "browser_callback",
        status: "requested",
        stateNonce: nonceGenerator(),
        callbackUrl: createAuthBrokerCallbackUrl(
          options.authBrokerHost,
          input.provider,
          input.workspaceId,
          previewProtocol,
        ),
        previewUrl: createPreviewUrl(input.previewHost, previewProtocol),
        forwardPath: input.forwardPath ?? DEFAULT_FORWARD_PATH,
        requestedAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        expiresAt,
        completedAt: null,
        lastError: null,
        callback: null,
        device: null,
        forwardUrl: null,
      });

      persistSession(session);
      emitEvent(
        session,
        "auth.session.requested",
        `Auth session ${session.id} requested for ${session.provider}.`,
      );

      return authSessionStartResponseSchema.parse({
        session,
        state: encodeSignedPayload(
          authStatePayloadSchema.parse({
            sessionId: session.id,
            workspaceId: session.workspaceId,
            provider: session.provider,
            nonce: session.stateNonce,
            expiresAt: session.expiresAt,
          }),
          stateSecret,
        ),
      }) satisfies AuthSessionStartResponse;
    },

    createDeviceSession(input: CreateDeviceAuthSessionInput) {
      const timestamp = now();
      const expiresAt = new Date(
        timestamp.getTime() + (input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS) * 1000,
      ).toISOString();
      const session = authSessionSchema.parse({
        id: idGenerator(),
        workspaceId: input.workspaceId,
        provider: input.provider,
        flow: "device_code",
        status: "awaiting_user",
        stateNonce: nonceGenerator(),
        callbackUrl: null,
        previewUrl: createPreviewUrl(input.previewHost, previewProtocol),
        forwardPath: input.forwardPath ?? DEFAULT_FORWARD_PATH,
        requestedAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        expiresAt,
        completedAt: null,
        lastError: null,
        callback: null,
        device: authDeviceFlowSchema.parse({
          ...input.device,
          status: input.device.status ?? "awaiting_user",
        }),
        forwardUrl: null,
      });

      persistSession(session);
      emitEvent(
        session,
        "auth.device.requested",
        `Device auth session ${session.id} requested for ${session.provider}.`,
      );

      return authSessionStartResponseSchema.parse({
        session,
        state: null,
      }) satisfies AuthSessionStartResponse;
    },

    resolveDeviceSession(input: ResolveDeviceAuthSessionInput) {
      const session = getSessionOrThrow(input.sessionId);

      if (session.flow !== "device_code" || !session.device) {
        throw new AuthBrokerError(
          `Auth session ${input.sessionId} is not a device flow session.`,
          "invalid_state",
          400,
          createAuthError({
            code: "invalid_state",
          }),
          session,
        );
      }

      const isSuccess = input.outcome === "authorized";
      const defaultError =
        input.outcome === "denied"
          ? createAuthError({
              code: "provider_error",
              providerMessage: "The user denied the device flow request.",
            })
          : input.outcome === "expired"
            ? createAuthError({
                code: "expired_state",
              })
            : null;

      const nextSession = updateSession(session, {
        status: isSuccess ? "completed" : "failed",
        completedAt: isSuccess ? now().toISOString() : null,
        lastError: isSuccess ? null : input.error ?? defaultError,
        device: {
          ...session.device,
          status: input.outcome,
        },
      });

      emitEvent(
        nextSession,
        isSuccess ? "auth.session.completed" : "auth.session.failed",
        isSuccess
          ? `Device auth session ${nextSession.id} completed.`
          : `Device auth session ${nextSession.id} failed.`,
        nextSession.lastError?.message ?? null,
        nextSession.lastError,
      );

      return nextSession;
    },

    handleCallback(input: HandleAuthCallbackInput) {
      const callback = buildCallbackPayload(input);
      const decodedPayload = input.state ? decodePayload(input.state) : null;
      const candidateState = decodedPayload
        ? authStatePayloadSchema.safeParse(decodedPayload)
        : null;
      const verifiedState = input.state
        ? verifySignedPayload(input.state, stateSecret, authStatePayloadSchema)
        : null;
      const sessionId =
        verifiedState?.sessionId ??
        (candidateState?.success ? candidateState.data.sessionId : null);
      const session = sessionId ? sessions.get(sessionId) ?? null : null;

      if (!input.state) {
        throw new AuthBrokerError(
          "The provider callback did not include state.",
          "invalid_state",
          400,
          createAuthError({
            code: "invalid_state",
          }),
          session,
        );
      }

      if (!verifiedState) {
        if (session) {
          const failedSession = failSession(
            session,
            createAuthError({
              code: "invalid_state",
              expectedCallbackUrl: session.callbackUrl,
              receivedCallbackUrl: createAuthBrokerCallbackUrl(
                options.authBrokerHost,
                input.provider,
                input.workspaceId,
                previewProtocol,
              ),
            }),
            callback,
          );
          return resolveRedirect(failedSession);
        }

        throw new AuthBrokerError(
          "The provider callback state could not be verified.",
          "invalid_state",
          400,
          createAuthError({
            code: "invalid_state",
          }),
        );
      }

      const sessionRecord = getSessionOrThrow(verifiedState.sessionId);
      const expectedCallbackUrl = sessionRecord.callbackUrl;
      const receivedCallbackUrl = createAuthBrokerCallbackUrl(
        options.authBrokerHost,
        input.provider,
        input.workspaceId,
        previewProtocol,
      );

      if (
        verifiedState.workspaceId !== input.workspaceId ||
        verifiedState.provider !== input.provider ||
        sessionRecord.workspaceId !== input.workspaceId ||
        sessionRecord.provider !== input.provider
      ) {
        const failedSession = failSession(
          sessionRecord,
          createAuthError({
            code: "workspace_mismatch",
            expectedCallbackUrl,
            receivedCallbackUrl,
          }),
          callback,
        );
        return resolveRedirect(failedSession);
      }

      if (
        new Date(verifiedState.expiresAt).getTime() <= now().getTime() ||
        new Date(sessionRecord.expiresAt).getTime() <= now().getTime()
      ) {
        const failedSession = failSession(
          sessionRecord,
          createAuthError({
            code: "expired_state",
            expectedCallbackUrl,
            receivedCallbackUrl,
          }),
          callback,
        );
        return resolveRedirect(failedSession);
      }

      if (input.error) {
        const failedSession = failSession(
          sessionRecord,
          createAuthError({
            code: "provider_error",
            providerMessage: input.errorDescription ?? input.error,
            expectedCallbackUrl,
            receivedCallbackUrl,
          }),
          callback,
        );
        return resolveRedirect(failedSession);
      }

      const nextSession = updateSession(sessionRecord, {
        status: "callback_received",
        lastError: null,
        callback,
      });

      emitEvent(
        nextSession,
        "auth.callback.received",
        `Auth callback received for ${nextSession.provider}.`,
      );

      return resolveRedirect(nextSession);
    },

    redeemCallback(input: RedeemAuthCallbackInput) {
      const session = getSessionOrThrow(input.sessionId);
      const handoffPayload = verifySignedPayload(
        input.handoffToken,
        stateSecret,
        authHandoffPayloadSchema,
      );

      if (
        !handoffPayload ||
        handoffPayload.sessionId !== session.id ||
        handoffPayload.workspaceId !== session.workspaceId ||
        handoffPayload.provider !== session.provider ||
        new Date(handoffPayload.expiresAt).getTime() <= now().getTime()
      ) {
        throw new AuthBrokerError(
          `The auth handoff for ${session.id} could not be verified.`,
          "invalid_handoff",
          400,
          createAuthError({
            code: "invalid_handoff",
          }),
          session,
        );
      }

      if (session.status === "callback_received") {
        const completedSession = updateSession(session, {
          status: "completed",
          completedAt: now().toISOString(),
        });

        emitEvent(
          completedSession,
          "auth.session.completed",
          `Auth session ${completedSession.id} completed.`,
        );

        return completedSession;
      }

      return session;
    },

    get(sessionId: string) {
      return sessions.get(sessionId) ?? null;
    },

    list(workspaceId?: string) {
      const items = workspaceId
        ? Array.from(sessions.values()).filter(
            (session) => session.workspaceId === workspaceId,
          )
        : Array.from(sessions.values());

      return items.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    },

    listEvents(workspaceId?: string) {
      const filtered = workspaceId
        ? events.filter((event) => event.workspaceId === workspaceId)
        : events;

      return [...filtered].sort((left, right) =>
        right.timestamp.localeCompare(left.timestamp),
      );
    },
  };
}

export type AuthBroker = ReturnType<typeof createAuthBroker>;

export function createAuthBrokerBoundary(sessionCount: number = 0) {
  return {
    name: "auth-broker",
    note: "Owns stable callback routing, auth session state, and secure workspace handoff.",
    status: "ready",
    activeSessions: sessionCount,
  } as const;
}

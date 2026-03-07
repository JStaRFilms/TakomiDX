import {
  browserSidecarCaptureSchema,
  browserSelectorCheckSchema,
  createPreviewUrl,
  reviewBundleSchema,
  validationBundleSchema,
  validationChecklistInputSchema,
  workspaceValidationSummarySchema,
  type BrowserConsoleEntry,
  type BrowserNetworkEntry,
  type BrowserSelectorCheck,
  type ReviewBundle,
  type ValidationBundle,
  type ValidationChecklistInput,
  type WorkspaceMetadata,
  type WorkspaceRuntimeState,
  type WorkspaceValidationSummary,
} from "@takomi/contracts";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const DEFAULT_VALIDATION_CHECKLIST: ValidationChecklistInput[] = [
  {
    id: "document-shell",
    label: "Document shell renders",
    selector: "body",
    requiredText: null,
    required: true,
  },
  {
    id: "primary-content",
    label: "Primary content region is present",
    selector: "main, [role='main'], [data-testid='app-shell'], body",
    requiredText: null,
    required: true,
  },
].map((item) => validationChecklistInputSchema.parse(item));

export interface BrowserSidecarCaptureInput {
  workspaceId: string;
  workspaceSlug: string;
  previewUrl: string;
  screenshotPath: string;
  checks: ValidationChecklistInput[];
  timeoutMs?: number;
}

export interface BrowserSidecarCaptureOutput {
  driver: string;
  title: string | null;
  console: BrowserConsoleEntry[];
  network: BrowserNetworkEntry[];
  selectors: BrowserSelectorCheck[];
  detail: string | null;
}

export interface BrowserSidecarDriver {
  capture(input: BrowserSidecarCaptureInput): Promise<BrowserSidecarCaptureOutput>;
}

export interface ValidationRunResult {
  bundle: ValidationBundle;
  review: ReviewBundle;
  summary: WorkspaceValidationSummary;
}

export interface CreateValidationBundleManagerOptions {
  workspacesDir: string;
  fetchImpl?: typeof fetch;
  driver?: BrowserSidecarDriver;
  now?: () => Date;
  idGenerator?: () => string;
  checklist?: ValidationChecklistInput[];
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function createIdentifier(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}`;
}

function buildMajorFailures(
  selectorChecks: BrowserSelectorCheck[],
  consoleEntries: BrowserConsoleEntry[],
  networkEntries: BrowserNetworkEntry[],
  fallback: string[] = [],
) {
  const failures = [
    ...selectorChecks
      .filter((check) => check.status === "failed" || check.status === "blocked")
      .map((check) => `${check.label}: ${check.detail}`),
    ...consoleEntries
      .filter((entry) => entry.level === "error")
      .map((entry) => `Console error: ${entry.text}`),
    ...networkEntries
      .filter((entry) => entry.outcome === "failed")
      .map((entry) => `Network failure: ${entry.method} ${entry.url}`),
    ...fallback,
  ];

  return Array.from(new Set(failures)).slice(0, 8);
}

function summarizeStatus(
  status: ValidationBundle["status"],
  passedChecks: number,
  failedChecks: number,
  blockedChecks: number,
  consoleErrorCount: number,
  networkFailureCount: number,
) {
  if (status === "passed") {
    return `Validation passed with ${passedChecks} checks, ${consoleErrorCount} console errors, and ${networkFailureCount} network failures.`;
  }

  if (status === "blocked") {
    return `Validation is blocked with ${blockedChecks} blocked checks because the preview is not reviewable yet.`;
  }

  return `Validation failed with ${failedChecks} failed checks, ${consoleErrorCount} console errors, and ${networkFailureCount} network failures.`;
}

function recommendAction(status: ValidationBundle["status"]) {
  if (status === "passed") {
    return "Open the preview, confirm the live behavior matches the diff, and then approve completion.";
  }

  if (status === "blocked") {
    return "Restore the preview route or runtime health, then re-run validation before marking the workspace complete.";
  }

  return "Inspect the diagnostics, fix the failing behavior, and re-run validation before the run can complete.";
}

function deriveOverallStatus(input: {
  sidecarFailed: boolean;
  previewBlocked: boolean;
  failedChecks: number;
  blockedChecks: number;
  consoleErrorCount: number;
  networkFailureCount: number;
}): ValidationBundle["status"] {
  if (input.previewBlocked) {
    return "blocked";
  }

  if (
    input.sidecarFailed ||
    input.failedChecks > 0 ||
    input.consoleErrorCount > 0 ||
    input.networkFailureCount > 0
  ) {
    return "failed";
  }

  if (input.blockedChecks > 0) {
    return "blocked";
  }

  return "passed";
}

function resolveBrowserSidecarScript() {
  const candidates = [
    path.resolve(process.cwd(), "services/agentd/scripts/browser-sidecar.py"),
    path.resolve(process.cwd(), "scripts/browser-sidecar.py"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]!;
}

export function createPythonPlaywrightSidecarDriver(): BrowserSidecarDriver {
  const scriptPath = resolveBrowserSidecarScript();

  return {
    async capture(input) {
      const stdout = await new Promise<string>((resolve, reject) => {
        const child = spawn(
          "python",
          [
            scriptPath,
            "--url",
            input.previewUrl,
            "--workspace-id",
            input.workspaceId,
            "--workspace-slug",
            input.workspaceSlug,
            "--screenshot-path",
            input.screenshotPath,
            "--checks",
            JSON.stringify(input.checks),
            "--timeout-ms",
            String(input.timeoutMs ?? 8_000),
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
          },
        );

        let output = "";
        let errorOutput = "";

        child.stdout.on("data", (chunk) => {
          output += chunk.toString();
        });

        child.stderr.on("data", (chunk) => {
          errorOutput += chunk.toString();
        });

        child.once("error", reject);
        child.once("close", (code) => {
          if (code === 0) {
            resolve(output.trim());
            return;
          }

          reject(
            new Error(
              errorOutput.trim() || output.trim() || "Browser sidecar capture failed.",
            ),
          );
        });
      });

      const payload = JSON.parse(stdout) as BrowserSidecarCaptureOutput;

      return {
        driver: payload.driver,
        title: payload.title,
        console: payload.console,
        network: payload.network,
        selectors: payload.selectors.map((item) => browserSelectorCheckSchema.parse(item)),
        detail: payload.detail,
      };
    },
  };
}

export function createValidationBundleManager(
  options: CreateValidationBundleManagerOptions,
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const driver = options.driver ?? createPythonPlaywrightSidecarDriver();
  const now = options.now ?? (() => new Date());
  const idGenerator = options.idGenerator ?? (() => createIdentifier("bundle"));
  const defaultChecklist = (options.checklist ?? DEFAULT_VALIDATION_CHECKLIST).map(
    (item) => validationChecklistInputSchema.parse(item),
  );
  const bundles = new Map<string, ValidationBundle>();
  const reviews = new Map<string, ReviewBundle>();

  function listPersistedWorkspaceIds() {
    mkdirSync(options.workspacesDir, { recursive: true });

    return readdirSync(options.workspacesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  }

  function getWorkspaceRoot(workspaceId: string) {
    return path.join(options.workspacesDir, workspaceId);
  }

  function getBrowserDir(workspaceId: string) {
    return path.join(getWorkspaceRoot(workspaceId), "browser");
  }

  function getReviewDir(workspaceId: string) {
    return path.join(getWorkspaceRoot(workspaceId), "review");
  }

  function getBundlePath(workspaceId: string) {
    return path.join(getReviewDir(workspaceId), "validation-bundle.json");
  }

  function getReviewPath(workspaceId: string) {
    return path.join(getReviewDir(workspaceId), "review-bundle.json");
  }

  function persistBundle(bundle: ValidationBundle) {
    writeJsonFile(getBundlePath(bundle.workspaceId), bundle);
    bundles.set(bundle.workspaceId, bundle);
  }

  function persistReview(review: ReviewBundle) {
    writeJsonFile(getReviewPath(review.workspaceId), review);
    reviews.set(review.workspaceId, review);
  }

  function restorePersistedBundles() {
    for (const workspaceId of listPersistedWorkspaceIds()) {
      const bundlePath = getBundlePath(workspaceId);
      const reviewPath = getReviewPath(workspaceId);

      if (existsSync(bundlePath)) {
        bundles.set(
          workspaceId,
          validationBundleSchema.parse(readJsonFile<unknown>(bundlePath)),
        );
      }

      if (existsSync(reviewPath)) {
        reviews.set(
          workspaceId,
          reviewBundleSchema.parse(readJsonFile<unknown>(reviewPath)),
        );
      }
    }
  }

  restorePersistedBundles();

  function getSummary(workspaceId: string) {
    const bundle = bundles.get(workspaceId);

    if (!bundle) {
      return workspaceValidationSummarySchema.parse({
        status: "queued",
        summary: "Validation has not run yet.",
        lastValidatedAt: null,
        bundleId: null,
      });
    }

    return workspaceValidationSummarySchema.parse({
      status: bundle.status,
      summary: bundle.summary,
      lastValidatedAt: bundle.generatedAt,
      bundleId: bundle.id,
    });
  }

  async function probePreview(previewUrl: string) {
    try {
      const response = await fetchImpl(previewUrl, {
        method: "GET",
        signal: AbortSignal.timeout(1_500),
      });

      if (!response.ok) {
        return {
          ok: false,
          detail: `Preview responded with ${response.status} during validation preflight.`,
        };
      }

      return {
        ok: true,
        detail: null,
      };
    } catch (error) {
      return {
        ok: false,
        detail:
          error instanceof Error
            ? error.message
            : "Preview validation preflight failed unexpectedly.",
      };
    }
  }

  function createBlockedChecks(
    checks: ValidationChecklistInput[],
    detail: string,
  ): BrowserSelectorCheck[] {
    return checks.map((check) =>
      browserSelectorCheckSchema.parse({
        id: check.id,
        label: check.label,
        selector: check.selector,
        status: "blocked",
        detail,
        textSnippet: null,
      }),
    );
  }

  function writeDiagnosticArtifacts(
    workspaceId: string,
    consoleEntries: BrowserConsoleEntry[],
    networkEntries: BrowserNetworkEntry[],
    selectorChecks: BrowserSelectorCheck[],
  ) {
    const browserDir = getBrowserDir(workspaceId);
    const consolePath = path.join(browserDir, "console-report.json");
    const networkPath = path.join(browserDir, "network-report.json");
    const selectorPath = path.join(browserDir, "selector-checks.json");

    writeJsonFile(consolePath, consoleEntries);
    writeJsonFile(networkPath, networkEntries);
    writeJsonFile(selectorPath, selectorChecks);

    return {
      consolePath,
      networkPath,
      selectorPath,
    };
  }

  return {
    async runValidation(input: {
      workspace: WorkspaceMetadata;
      runtime: WorkspaceRuntimeState | null;
      runId?: string | null;
      previewUrl?: string | null;
      checklist?: ValidationChecklistInput[];
    }): Promise<ValidationRunResult> {
      const generatedAt = now().toISOString();
      const requestedChecks = (input.checklist ?? defaultChecklist).map((item) =>
        validationChecklistInputSchema.parse(item),
      );
      const previewUrl =
        input.previewUrl ??
        input.runtime?.preview?.manualFallbackUrl ??
        input.runtime?.preview?.url ??
        createPreviewUrl(input.workspace.previewHost);
      const screenshotPath = path.join(
        getBrowserDir(input.workspace.id),
        "validation-screenshot.png",
      );

      let selectorChecks: BrowserSelectorCheck[] = [];
      let consoleEntries: BrowserConsoleEntry[] = [];
      let networkEntries: BrowserNetworkEntry[] = [];
      let sidecarFailure: string | null = null;
      let previewBlocker: string | null = null;
      let sidecarDriver = "browser-sidecar";
      let title: string | null = null;

      if (
        !input.runtime?.preview ||
        input.runtime.lifecycle !== "running" ||
        input.runtime.healthStatus === "failed"
      ) {
        previewBlocker =
          input.runtime?.lastError ??
          "Preview is not registered to a healthy workspace runtime yet.";
        selectorChecks = createBlockedChecks(requestedChecks, previewBlocker);
      } else {
        const preflight = await probePreview(previewUrl);

        if (!preflight.ok) {
          previewBlocker =
            preflight.detail ?? "Preview validation preflight failed.";
          selectorChecks = createBlockedChecks(requestedChecks, previewBlocker);
        } else {
          try {
            const capture = await driver.capture({
              workspaceId: input.workspace.id,
              workspaceSlug: input.workspace.slug,
              previewUrl,
              screenshotPath,
              checks: requestedChecks,
            });

            const sidecar = browserSidecarCaptureSchema.parse({
              status: "ready",
              driver: capture.driver,
              capturedAt: generatedAt,
              screenshotPath: existsSync(screenshotPath) ? screenshotPath : null,
              title: capture.title,
              console: capture.console,
              network: capture.network,
              selectors: capture.selectors,
              detail: capture.detail,
            });

            sidecarDriver = sidecar.driver;
            title = sidecar.title;
            selectorChecks = sidecar.selectors;
            consoleEntries = sidecar.console;
            networkEntries = sidecar.network;
          } catch (error) {
            sidecarFailure =
              error instanceof Error
                ? error.message
                : "Browser sidecar failed unexpectedly.";
            selectorChecks = createBlockedChecks(requestedChecks, sidecarFailure);
          }
        }
      }

      const passedChecks = selectorChecks.filter((check) => check.status === "passed").length;
      const failedChecks = selectorChecks.filter((check) => check.status === "failed").length;
      const blockedChecks = selectorChecks.filter((check) => check.status === "blocked").length;
      const consoleErrorCount = consoleEntries.filter((entry) => entry.level === "error").length;
      const networkFailureCount = networkEntries.filter(
        (entry) => entry.outcome === "failed",
      ).length;
      const status = deriveOverallStatus({
        sidecarFailed: sidecarFailure !== null,
        previewBlocked: previewBlocker !== null,
        failedChecks,
        blockedChecks,
        consoleErrorCount,
        networkFailureCount,
      });
      const summary = summarizeStatus(
        status,
        passedChecks,
        failedChecks,
        blockedChecks,
        consoleErrorCount,
        networkFailureCount,
      );
      const majorFailures = buildMajorFailures(
        selectorChecks,
        consoleEntries,
        networkEntries,
        [previewBlocker, sidecarFailure].filter((value): value is string => Boolean(value)),
      );
      const artifactReports = writeDiagnosticArtifacts(
        input.workspace.id,
        consoleEntries,
        networkEntries,
        selectorChecks,
      );
      const bundleId = idGenerator();
      const bundle = validationBundleSchema.parse({
        id: bundleId,
        workspaceId: input.workspace.id,
        workspaceSlug: input.workspace.slug,
        runId: input.runId ?? null,
        previewUrl,
        previewHost: input.workspace.previewHost,
        status,
        generatedAt,
        summary,
        sidecar: {
          status: sidecarFailure ? "failed" : previewBlocker ? "failed" : "ready",
          driver: sidecarDriver,
          capturedAt: generatedAt,
          screenshotPath: existsSync(screenshotPath) ? screenshotPath : null,
          title,
          console: consoleEntries,
          network: networkEntries,
          selectors: selectorChecks,
          detail: sidecarFailure ?? previewBlocker,
        },
        requestedChecks,
        selectorChecks,
        artifacts: [
          ...(existsSync(screenshotPath)
            ? [
                {
                  kind: "screenshot",
                  label: "Validation screenshot",
                  path: screenshotPath,
                  contentType: "image/png",
                },
              ]
            : []),
          {
            kind: "console",
            label: "Console diagnostics",
            path: artifactReports.consolePath,
            contentType: "application/json",
          },
          {
            kind: "network",
            label: "Network diagnostics",
            path: artifactReports.networkPath,
            contentType: "application/json",
          },
          {
            kind: "report",
            label: "Selector checks",
            path: artifactReports.selectorPath,
            contentType: "application/json",
          },
          {
            kind: "bundle",
            label: "Validation bundle",
            path: getBundlePath(input.workspace.id),
            contentType: "application/json",
          },
        ],
        majorFailures,
        stats: {
          passedChecks,
          failedChecks,
          blockedChecks,
          consoleErrorCount,
          networkFailureCount,
        },
      });
      const review = reviewBundleSchema.parse({
        validationBundleId: bundle.id,
        workspaceId: input.workspace.id,
        workspaceSlug: input.workspace.slug,
        runId: input.runId ?? null,
        previewUrl,
        validationStatus: status,
        generatedAt,
        testSummary: summary,
        diagnostics:
          majorFailures.length > 0
            ? majorFailures
            : ["No blocking diagnostics were captured during validation."],
        artifactLinks: [
          ...bundle.artifacts,
          {
            kind: "bundle",
            label: "Review bundle",
            path: getReviewPath(input.workspace.id),
            contentType: "application/json",
          },
        ],
        recommendedAction: recommendAction(status),
      });
      const summaryRecord = workspaceValidationSummarySchema.parse({
        status,
        summary,
        lastValidatedAt: generatedAt,
        bundleId: bundle.id,
      });

      persistBundle(bundle);
      persistReview(review);

      return {
        bundle,
        review,
        summary: summaryRecord,
      };
    },

    getBundle(workspaceId: string) {
      return bundles.get(workspaceId) ?? null;
    },

    getReviewBundle(workspaceId: string) {
      return reviews.get(workspaceId) ?? null;
    },

    getSummary,

    canComplete(workspaceId: string) {
      const summary = getSummary(workspaceId);

      if (summary.status === "passed") {
        return {
          allowed: true,
          reason: null,
          summary,
        };
      }

      return {
        allowed: false,
        reason:
          summary.status === "queued"
            ? "Validation has not run yet."
            : `Validation status is ${summary.status}.`,
        summary,
      };
    },
  };
}

export type ValidationBundleManager = ReturnType<
  typeof createValidationBundleManager
>;

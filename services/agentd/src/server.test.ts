import type { ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import {
  isRecoverableConnectionError,
  writeResponseSafely,
} from "./server";

describe("agentd response guards", () => {
  it("recognizes aborted socket writes as recoverable", () => {
    const error = new Error("socket hang up") as NodeJS.ErrnoException;
    error.code = "ECONNRESET";

    expect(isRecoverableConnectionError(error)).toBe(true);
  });

  it("skips writing when the response is already closed", async () => {
    const response = {
      destroyed: true,
      writableEnded: false,
      writeHead: vi.fn(),
      end: vi.fn(),
    } satisfies Pick<ServerResponse, "destroyed" | "writableEnded" | "writeHead" | "end">;

    await expect(
      writeResponseSafely(response, new Response("ok", { status: 200 })),
    ).resolves.toBe(false);
    expect(response.writeHead).not.toHaveBeenCalled();
    expect(response.end).not.toHaveBeenCalled();
  });

  it("swallows recoverable disconnects during response writes", async () => {
    const response = {
      destroyed: false,
      writableEnded: false,
      writeHead: vi.fn(),
      end: vi.fn(() => {
        const error = new Error("socket hang up") as NodeJS.ErrnoException;
        error.code = "ECONNABORTED";
        throw error;
      }),
    } satisfies Pick<ServerResponse, "destroyed" | "writableEnded" | "writeHead" | "end">;

    await expect(
      writeResponseSafely(response, new Response("ok", { status: 200 })),
    ).resolves.toBe(false);
    expect(response.writeHead).toHaveBeenCalledOnce();
    expect(response.end).toHaveBeenCalledOnce();
  });
});

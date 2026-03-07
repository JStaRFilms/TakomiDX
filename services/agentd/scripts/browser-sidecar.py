#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture deterministic browser validation evidence for a workspace preview."
    )
    parser.add_argument("--url", required=True)
    parser.add_argument("--workspace-id", required=True)
    parser.add_argument("--workspace-slug", required=True)
    parser.add_argument("--screenshot-path", required=True)
    parser.add_argument("--checks", required=True)
    parser.add_argument("--timeout-ms", type=int, default=8000)
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:  # pragma: no cover - environment dependent
        raise RuntimeError(
            "Playwright for Python is required for browser validation sidecar capture."
        ) from exc

    checks = json.loads(args.checks)
    screenshot_path = Path(args.screenshot_path)
    screenshot_path.parent.mkdir(parents=True, exist_ok=True)

    console_entries: list[dict[str, object]] = []
    network_entries: list[dict[str, object]] = []
    selector_results: list[dict[str, object]] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()

        def describe_request_failure(failure) -> str:
            if isinstance(failure, dict):
                return str(failure.get("errorText") or "request failed")
            if isinstance(failure, str):
                return failure
            return "request failed"

        def normalize_console_level(level: str) -> str:
            normalized = (level or "").lower()
            if normalized == "warning":
                return "warn"
            if normalized in {"error", "warn", "info", "log"}:
                return normalized
            return "log"

        def on_console(message) -> None:
            location = None
            if message.location:
                url = message.location.get("url") or ""
                line_number = message.location.get("lineNumber")
                if url:
                    location = (
                        f"{url}:{line_number}"
                        if isinstance(line_number, int)
                        else url
                    )
            console_entries.append(
                {
                    "level": normalize_console_level(message.type),
                    "text": message.text,
                    "location": location,
                }
            )

        def on_page_error(error) -> None:
            console_entries.append(
                {
                    "level": "error",
                    "text": str(error),
                    "location": None,
                }
            )

        def on_request_failed(request) -> None:
            failure = request.failure
            network_entries.append(
                {
                    "url": request.url,
                    "method": request.method,
                    "status": None,
                    "outcome": "failed",
                    "resourceType": request.resource_type or "other",
                    "detail": describe_request_failure(failure),
                }
            )

        def on_response(response) -> None:
            if response.ok:
                return
            network_entries.append(
                {
                    "url": response.url,
                    "method": response.request.method,
                    "status": response.status,
                    "outcome": "failed",
                    "resourceType": response.request.resource_type or "other",
                    "detail": f"HTTP {response.status}",
                }
            )

        page.on("console", on_console)
        page.on("pageerror", on_page_error)
        page.on("requestfailed", on_request_failed)
        page.on("response", on_response)

        page.goto(args.url, wait_until="networkidle", timeout=args.timeout_ms)
        page.screenshot(path=str(screenshot_path), full_page=True)

        for check in checks:
            selector = check["selector"]
            label = check["label"]
            required_text = check.get("requiredText")
            locator = page.locator(selector).first
            count = page.locator(selector).count()
            text_snippet = None

            if count == 0:
                selector_results.append(
                    {
                        "id": check["id"],
                        "label": label,
                        "selector": selector,
                        "status": "failed",
                        "detail": f"Selector {selector} was not found.",
                        "textSnippet": None,
                    }
                )
                continue

            try:
                text_snippet = locator.inner_text(timeout=max(500, args.timeout_ms // 2)).strip()
            except Exception:
                text_snippet = None

            if required_text and (not text_snippet or required_text not in text_snippet):
                selector_results.append(
                    {
                        "id": check["id"],
                        "label": label,
                        "selector": selector,
                        "status": "failed",
                        "detail": f"Selector {selector} did not contain the expected text.",
                        "textSnippet": text_snippet,
                    }
                )
                continue

            selector_results.append(
                {
                    "id": check["id"],
                    "label": label,
                    "selector": selector,
                    "status": "passed",
                    "detail": f"Selector {selector} matched in the live preview.",
                    "textSnippet": text_snippet[:240] if text_snippet else None,
                }
            )

        title = page.title()
        browser.close()

    payload = {
        "driver": "playwright-python",
        "title": title or None,
        "console": console_entries,
        "network": network_entries,
        "selectors": selector_results,
        "detail": None,
    }
    json.dump(payload, sys.stdout)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)

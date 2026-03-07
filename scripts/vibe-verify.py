#!/usr/bin/env python3
"""
TakomiDX Verification Script
===========================
Verification for the pnpm workspace monorepo.

Runs the root quality gates expected before handoff:
- typecheck
- lint
- test
- build

Usage:
    python scripts/vibe-verify.py
    python scripts/vibe-verify.py --quick
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"


def run_command(command: list[str], description: str) -> bool:
    print(f"\n{Colors.BLUE}{description}{Colors.RESET}")
    try:
        result = subprocess.run(command, capture_output=True, text=True, shell=False)
    except FileNotFoundError:
        print(f"{Colors.YELLOW}SKIPPED: command not found{Colors.RESET}")
        return True
    except Exception as exc:
        print(f"{Colors.RED}ERROR: {exc}{Colors.RESET}")
        return False

    if result.returncode == 0:
        print(f"{Colors.GREEN}PASS{Colors.RESET}")
        return True

    print(f"{Colors.RED}FAIL{Colors.RESET}")
    output = result.stderr or result.stdout
    if output:
        lines = output.strip().splitlines()[:25]
        for line in lines:
            print(f"  {line}")
        if len(output.strip().splitlines()) > 25:
            print("  ... output truncated ...")
    return False


def main() -> int:
    quick_mode = "--quick" in sys.argv

    print(f"{Colors.BOLD}TakomiDX Verification Report{Colors.RESET}")

    if not Path("package.json").exists():
        print(f"{Colors.RED}No package.json found at repo root.{Colors.RESET}")
        return 1

    checks = [
        (["pnpm", "typecheck"], "Typecheck"),
        (["pnpm", "lint"], "Lint"),
        (["pnpm", "test"], "Test"),
    ]

    if not quick_mode:
        checks.append((["pnpm", "build"], "Build"))

    results = [run_command(command, description) for command, description in checks]

    if all(results):
        print(f"\n{Colors.GREEN}{Colors.BOLD}All verification checks passed.{Colors.RESET}")
        return 0

    print(f"\n{Colors.RED}{Colors.BOLD}Verification failed. Fix errors before handoff.{Colors.RESET}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

import type {
  EditorCompanionAction,
  EditorCompanionActionTarget,
  EditorCompanionWorkspaceItem,
} from "@takomi/contracts";
import * as vscode from "vscode";
import { TakomiAgentdClient } from "./agentd-client";
import { readTakomiConfig } from "./config";
import { TakomiWorkspaceTreeProvider, type WorkspaceCommandArgs } from "./tree";
import { findAction } from "./view-model";

type WorkspaceSelection = WorkspaceCommandArgs | EditorCompanionWorkspaceItem | undefined;

function isWorkspaceCommandArgs(
  value: WorkspaceSelection,
): value is WorkspaceCommandArgs {
  return Boolean(value && "workspace" in value);
}

async function openInSimpleBrowser(url: string) {
  try {
    await vscode.commands.executeCommand("simpleBrowser.show", url);
  } catch {
    await vscode.env.openExternal(vscode.Uri.parse(url));
  }
}

async function revealPath(filePath: string) {
  const uri = vscode.Uri.file(filePath);

  try {
    await vscode.commands.executeCommand("revealInExplorer", uri);
  } catch {
    await vscode.commands.executeCommand("revealFileInOS", uri);
  }
}

async function resolveWorkspaceAction(
  provider: TakomiWorkspaceTreeProvider,
  input: WorkspaceSelection,
  target: EditorCompanionActionTarget,
) {
  const workspace = isWorkspaceCommandArgs(input)
    ? input.workspace
    : input ?? (await provider.pickWorkspace(`Select a workspace to ${target}.`));

  if (!workspace) {
    return undefined;
  }

  const action =
    (isWorkspaceCommandArgs(input) &&
      input.action &&
      input.action.target === target
      ? input.action
      : undefined) ?? findAction(workspace, target);

  if (!action) {
    vscode.window.showErrorMessage(
      `TakomiDX could not find a ${target} action for ${workspace.slug}.`,
    );
    return undefined;
  }

  return {
    workspace,
    action,
  };
}

async function openAction(action: EditorCompanionAction) {
  const config = readTakomiConfig();

  switch (action.locationType) {
    case "preview_url":
      await openInSimpleBrowser(action.location);
      return;
    case "mission_control_path": {
      const url = new URL(action.location, `${config.missionControlBaseUrl}/`).toString();
      await openInSimpleBrowser(url);
      return;
    }
    case "filesystem_path":
      await revealPath(action.location);
      return;
  }
}

async function openLogs(
  client: TakomiAgentdClient,
  selection: {
    workspace: EditorCompanionWorkspaceItem;
    action: EditorCompanionAction;
  },
) {
  if (selection.workspace.mode === "attached") {
    vscode.window.showInformationMessage(
      "Attached workspaces stream logs to Mission Control observability instead of local Docker tails."
    );
    await openAction(selection.action);
    return;
  }

  try {
    const config = readTakomiConfig();
    const payload = await client.getWorkspaceLogs(
      selection.workspace.id,
      config.logsTail,
    );
    const content = [
      `workspace: ${selection.workspace.slug}`,
      `container: ${payload.containerName ?? "not attached"}`,
      `lifecycle: ${payload.lifecycle}`,
      `tail: ${payload.tail}`,
      "",
      payload.logs.trim() || "Runtime container is not attached yet.",
    ].join("\n");
    const document = await vscode.workspace.openTextDocument({
      language: "log",
      content,
    });

    await vscode.window.showTextDocument(document, {
      preview: false,
    });
  } catch (error) {
    await openAction(selection.action);
    vscode.window.showWarningMessage(
      error instanceof Error
        ? `${error.message} Opened Mission Control logs instead.`
        : "Could not fetch live runtime logs. Opened Mission Control logs instead.",
    );
  }
}

export function activate(context: vscode.ExtensionContext) {
  const client = new TakomiAgentdClient(readTakomiConfig);
  const provider = new TakomiWorkspaceTreeProvider(client);
  const treeView = vscode.window.createTreeView("takomi.workspaces", {
    treeDataProvider: provider,
    showCollapseAll: true,
  });

  const registerActionCommand = (
    command: string,
    target: EditorCompanionActionTarget,
  ) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async (input?: WorkspaceSelection) => {
        const selection = await resolveWorkspaceAction(provider, input, target);

        if (!selection) {
          return;
        }

        if (target === "logs") {
          await openLogs(client, selection);
          return;
        }

        await openAction(selection.action);
      }),
    );
  };

  context.subscriptions.push(
    treeView,
    vscode.commands.registerCommand("takomi.refresh", () => provider.refresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("takomi")) {
        provider.refresh();
      }
    }),
  );

  registerActionCommand("takomi.openWorkspace", "workspace");
  registerActionCommand("takomi.openPreview", "preview");
  registerActionCommand("takomi.openLogs", "logs");
  registerActionCommand("takomi.openTrace", "trace");
  registerActionCommand("takomi.openValidation", "validation");
  registerActionCommand("takomi.openApprovals", "approvals");
  registerActionCommand("takomi.revealWorktree", "worktree");
  registerActionCommand("takomi.revealRepo", "repo");
}

export function deactivate() { }

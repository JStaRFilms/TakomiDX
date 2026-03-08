import type {
  EditorCompanionAction,
  EditorCompanionWorkspaceDetail,
  EditorCompanionWorkspaceItem,
} from "@takomi/contracts";
import * as vscode from "vscode";
import type { TakomiAgentdClient } from "./agentd-client";
import {
  buildWorkspaceInfoRows,
  createWorkspaceTooltip,
  describeWorkspace,
  resolveActionCommandId,
} from "./view-model";

export interface WorkspaceCommandArgs {
  workspace: EditorCompanionWorkspaceItem;
  action?: EditorCompanionAction;
}

type TakomiTreeNode =
  | WorkspaceTreeItem
  | WorkspaceInfoTreeItem
  | WorkspaceActionTreeItem
  | MessageTreeItem;

class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(public readonly workspace: EditorCompanionWorkspaceItem) {
    super(workspace.slug, vscode.TreeItemCollapsibleState.Collapsed);
    this.id = workspace.id;
    this.description = describeWorkspace(workspace);
    this.tooltip = createWorkspaceTooltip(workspace);
    this.iconPath = vscode.ThemeIcon.Folder;
    this.contextValue = "takomiWorkspace";
    this.command = {
      command: "takomi.openWorkspace",
      title: "Open Workspace Overview",
      arguments: [workspace],
    };
  }
}

class WorkspaceInfoTreeItem extends vscode.TreeItem {
  constructor(label: string, value: string, detail: string | null) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    if (detail) {
      this.description = detail;
    }
    this.tooltip = detail ?? value;
    this.iconPath = vscode.ThemeIcon.File;
    this.contextValue = "takomiInfo";
  }
}

class WorkspaceActionTreeItem extends vscode.TreeItem {
  constructor(
    workspace: EditorCompanionWorkspaceItem,
    action: EditorCompanionAction,
  ) {
    super(action.label, vscode.TreeItemCollapsibleState.None);
    if (action.description) {
      this.description = action.description;
    }
    this.tooltip = action.description ?? action.location;
    this.iconPath = vscode.ThemeIcon.File;
    this.contextValue = "takomiAction";
    this.command = {
      command: resolveActionCommandId(action.target),
      title: action.label,
      arguments: [
        {
          workspace,
          action,
        } satisfies WorkspaceCommandArgs,
      ],
    };
  }
}

class MessageTreeItem extends vscode.TreeItem {
  constructor(label: string, detail: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = detail;
    this.tooltip = detail;
    this.iconPath = vscode.ThemeIcon.File;
    this.contextValue = "takomiMessage";
  }
}

export class TakomiWorkspaceTreeProvider
  implements vscode.TreeDataProvider<TakomiTreeNode> {
  private readonly onDidChangeTreeDataEmitter =
    new vscode.EventEmitter<TakomiTreeNode | undefined>();
  private workspaces: EditorCompanionWorkspaceItem[] = [];
  private readonly detailCache = new Map<string, EditorCompanionWorkspaceDetail>();

  readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

  constructor(private readonly client: TakomiAgentdClient) { }

  getTreeItem(element: TakomiTreeNode) {
    return element;
  }

  async getChildren(element?: TakomiTreeNode): Promise<TakomiTreeNode[]> {
    if (!element) {
      try {
        this.workspaces = await this.client.listWorkspaces();

        if (this.workspaces.length === 0) {
          return [
            new MessageTreeItem(
              "No active workspaces",
              "TakomiDX agentd is reachable, but there are no active workspace capsules right now.",
            ),
          ];
        }

        return this.workspaces.map((workspace) => new WorkspaceTreeItem(workspace));
      } catch (error) {
        this.workspaces = [];
        this.detailCache.clear();
        return [
          new MessageTreeItem(
            "Unable to load workspaces",
            error instanceof Error ? error.message : "TakomiDX agentd is unavailable.",
          ),
        ];
      }
    }

    if (!(element instanceof WorkspaceTreeItem)) {
      return [];
    }

    try {
      const detail =
        this.detailCache.get(element.workspace.id) ??
        (await this.client.getWorkspaceDetail(element.workspace.id));

      this.detailCache.set(element.workspace.id, detail);

      const infoItems = buildWorkspaceInfoRows(detail).map(
        (row) => new WorkspaceInfoTreeItem(row.label, row.value, row.detail),
      );
      const actionItems = detail.workspace.actions.map(
        (action) => new WorkspaceActionTreeItem(detail.workspace, action),
      );

      return [...infoItems, ...actionItems];
    } catch (error) {
      return [
        new MessageTreeItem(
          "Unable to load workspace detail",
          error instanceof Error ? error.message : "TakomiDX agentd detail request failed.",
        ),
      ];
    }
  }

  refresh() {
    this.detailCache.clear();
    this.onDidChangeTreeDataEmitter.fire(undefined);
  }

  async pickWorkspace(placeHolder: string) {
    const items =
      this.workspaces.length > 0 ? this.workspaces : await this.client.listWorkspaces();

    if (items.length === 0) {
      vscode.window.showInformationMessage(
        "TakomiDX has no active workspaces to inspect.",
      );
      return undefined;
    }

    const selected = await vscode.window.showQuickPick(
      items.map((workspace) => ({
        label: workspace.slug,
        description: describeWorkspace(workspace),
        detail: workspace.lastAction,
        workspace,
      })),
      {
        placeHolder,
      },
    );

    return selected?.workspace;
  }
}

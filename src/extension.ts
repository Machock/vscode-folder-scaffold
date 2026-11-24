import * as vscode from "vscode";
import { filesForFolder, ScaffoldRule, ScaffoldSettings } from "./rules";

const SECTION = "folderScaffold";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Folder Scaffold");

  context.subscriptions.push(
    output,
    vscode.workspace.onDidCreateFiles((event) => {
      void scaffoldCreated(event.files, output);
    }),
    vscode.commands.registerCommand("folderScaffold.openSettings", () => {
      return vscode.commands.executeCommand("workbench.action.openSettings", "folderScaffold");
    }),
  );
}

export function deactivate(): void {}

async function scaffoldCreated(uris: readonly vscode.Uri[], output: vscode.OutputChannel): Promise<void> {
  for (const uri of uris) {
    await scaffoldFolder(uri, output);
  }
}

async function scaffoldFolder(uri: vscode.Uri, output: vscode.OutputChannel): Promise<void> {
  const config = vscode.workspace.getConfiguration(SECTION, uri);
  if (!config.get<boolean>("enabled", true)) {
    return;
  }

  if (!(await isDirectory(uri))) {
    return;
  }

  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) {
    return;
  }

  const settings: ScaffoldSettings = {
    defaultFiles: config.get<string[]>("defaultFiles", ["__init__.py"]),
    rules: config.get<ScaffoldRule[]>("rules", []),
    exclude: config.get<string[]>("exclude", []),
  };
  const relative = vscode.workspace.asRelativePath(uri, false);
  const fileNames = filesForFolder(relative, settings);

  for (const fileName of fileNames) {
    const target = vscode.Uri.joinPath(uri, ...fileName.split("/"));
    await createIfMissing(target, output);
  }
}

async function isDirectory(uri: vscode.Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
  } catch {
    return false;
  }
}

async function createIfMissing(target: vscode.Uri, output: vscode.OutputChannel): Promise<void> {
  try {
    await vscode.workspace.fs.stat(target);
    return;
  } catch (error: unknown) {
    if (!isFileNotFound(error)) {
      logFailure(output, target, error);
      return;
    }
  }

  try {
    await vscode.workspace.fs.writeFile(target, new Uint8Array());
  } catch (error: unknown) {
    if (isFileExists(error)) {
      return;
    }
    logFailure(output, target, error);
  }
}

function isFileNotFound(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === "FileNotFound";
}

function isFileExists(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === "FileExists";
}

function logFailure(output: vscode.OutputChannel, target: vscode.Uri, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  output.appendLine(`创建失败 ${target.fsPath}: ${message}`);
  output.show(true);
}

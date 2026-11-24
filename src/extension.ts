import * as vscode from "vscode";
import { filesForFolder, ScaffoldRule, ScaffoldSettings } from "./rules";
import { consumeSkip } from "./skip";
import {
  folderNameError,
  parseTemplates,
  TEMPLATE_SLOT_COUNT,
  templateCommandId,
  templateContextKey,
  templatePrompt,
} from "./templates";

const SECTION = "folderScaffold";
const skippedDirectories = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Folder Scaffold");
  publishTemplateSlots();

  context.subscriptions.push(
    output,
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(SECTION)) {
        publishTemplateSlots();
      }
    }),
    vscode.workspace.onDidCreateFiles((event) => {
      void scaffoldCreated(event.files, output);
    }),
    vscode.commands.registerCommand("folderScaffold.openSettings", () => {
      return vscode.commands.executeCommand("workbench.action.openSettings", "folderScaffold");
    }),
  );

  for (let index = 0; index < TEMPLATE_SLOT_COUNT; index++) {
    const slot = index;
    context.subscriptions.push(
      vscode.commands.registerCommand(templateCommandId(slot), (uri?: vscode.Uri) => {
        return createFromTemplate(slot, uri, output);
      }),
    );
  }
}

export function deactivate(): void {}

function publishTemplateSlots(): void {
  const templates = parseTemplates(vscode.workspace.getConfiguration(SECTION).get("templates"));
  for (let index = 0; index < TEMPLATE_SLOT_COUNT; index++) {
    void vscode.commands.executeCommand(
      "setContext",
      templateContextKey(index),
      index < templates.length,
    );
  }
}

async function scaffoldCreated(uris: readonly vscode.Uri[], output: vscode.OutputChannel): Promise<void> {
  for (const uri of uris) {
    await scaffoldFolder(uri, output);
  }
}

async function scaffoldFolder(uri: vscode.Uri, output: vscode.OutputChannel): Promise<void> {
  if (consumeSkip(skippedDirectories, uri.toString())) {
    return;
  }

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

async function createFromTemplate(
  index: number,
  resource: vscode.Uri | undefined,
  output: vscode.OutputChannel,
): Promise<void> {
  const parent = await resolveParent(resource);
  if (!parent) {
    return;
  }

  const templates = parseTemplates(vscode.workspace.getConfiguration(SECTION, parent).get("templates"));
  const template = templates[index];
  if (!template) {
    void vscode.window.showInformationMessage(`未配置模板 ${index + 1}`);
    return;
  }

  const entered = await vscode.window.showInputBox({
    placeHolder: "文件夹名称",
    prompt: templatePrompt(template, index),
    validateInput: (value) => folderNameError(value),
  });
  if (entered === undefined) {
    return;
  }

  const folder = vscode.Uri.joinPath(parent, entered.trim());
  if (!(await createDirectorySkippingAuto(folder, output))) {
    return;
  }

  for (const fileName of template.files) {
    await writeTemplateFile(folder, fileName, output);
  }
}

async function resolveParent(resource: vscode.Uri | undefined): Promise<vscode.Uri | undefined> {
  const target = resource ?? (await pickWorkspaceRoot());
  if (!target) {
    return undefined;
  }
  if (await isDirectory(target)) {
    return target;
  }
  return vscode.Uri.joinPath(target, "..");
}

async function pickWorkspaceRoot(): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    void vscode.window.showInformationMessage("没有打开工作区，无法创建文件夹");
    return undefined;
  }
  if (folders.length === 1) {
    return folders[0].uri;
  }

  const picked = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, description: folder.uri.fsPath, uri: folder.uri })),
    { placeHolder: "选择要在其中新建文件夹的工作区" },
  );
  return picked?.uri;
}

async function createDirectorySkippingAuto(uri: vscode.Uri, output: vscode.OutputChannel): Promise<boolean> {
  const key = uri.toString();
  skippedDirectories.add(key);
  try {
    await vscode.workspace.fs.createDirectory(uri);
    return true;
  } catch (error: unknown) {
    skippedDirectories.delete(key);
    if (isFileExists(error)) {
      return true;
    }
    logFailure(output, uri, error);
    return false;
  }
}

async function writeTemplateFile(
  folder: vscode.Uri,
  fileName: string,
  output: vscode.OutputChannel,
): Promise<void> {
  const parts = fileName.split("/");
  let directory = folder;
  for (const part of parts.slice(0, -1)) {
    directory = vscode.Uri.joinPath(directory, part);
    if (!(await createDirectorySkippingAuto(directory, output))) {
      return;
    }
  }
  await createIfMissing(vscode.Uri.joinPath(folder, ...parts), output);
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

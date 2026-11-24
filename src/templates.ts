import { sanitizeFiles } from "./rules";

export const TEMPLATE_SLOT_COUNT = 8;

export interface FolderTemplate {
  title: string;
  files: string[];
}

interface RawTemplate {
  title?: unknown;
  files?: unknown;
}

export function parseTemplates(value: unknown): FolderTemplate[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const result: FolderTemplate[] = [];
  for (const item of value) {
    if (result.length >= TEMPLATE_SLOT_COUNT) {
      break;
    }
    if (!isTemplate(item)) {
      continue;
    }
    const title = typeof item.title === "string" ? item.title.trim() : "";
    result.push({ title, files: sanitizeFiles(item.files as readonly string[]) });
  }
  return result;
}

export function templateDisplayTitle(template: FolderTemplate, index: number): string {
  return template.title.length > 0 ? template.title : slotLabel(index);
}

export function templatePrompt(template: FolderTemplate, index: number): string {
  const title = templateDisplayTitle(template, index);
  if (template.files.length === 0) {
    return `「${title}」将创建空文件夹`;
  }
  return `「${title}」将创建：${template.files.join("、")}`;
}

export function folderNameError(raw: string): string | undefined {
  const name = raw.trim();
  if (name.length === 0) {
    return "请输入文件夹名称";
  }
  if (name === "." || name === "..") {
    return "不能使用 . 或 ..";
  }
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) {
    return "只能使用一层文件夹名称";
  }
  return undefined;
}

export function templateCommandId(index: number): string {
  return `folderScaffold.createFromTemplate.${index}`;
}

export function templateContextKey(index: number): string {
  return `folderScaffold.template${index}`;
}

function slotLabel(index: number): string {
  return `模板 ${index + 1}`;
}

function isTemplate(value: unknown): value is RawTemplate & { files: unknown[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return Array.isArray((value as RawTemplate).files);
}

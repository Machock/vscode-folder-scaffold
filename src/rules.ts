import minimatch from "minimatch";

export interface ScaffoldRule {
  pattern: string;
  files: string[];
}

export interface ScaffoldSettings {
  defaultFiles: string[];
  rules: ScaffoldRule[];
  exclude: string[];
}

const MATCH_OPTIONS: minimatch.IOptions = { dot: true };

export function filesForFolder(relativePath: string, settings: ScaffoldSettings): string[] {
  const relative = normalizeRelative(relativePath);
  if (relative.length === 0 || isExcluded(relative, settings.exclude)) {
    return [];
  }

  for (const rule of settings.rules) {
    if (!isRule(rule)) {
      continue;
    }
    if (matchGlob(relative, rule.pattern)) {
      return sanitizeFiles(rule.files);
    }
  }

  return sanitizeFiles(settings.defaultFiles);
}

export function matchGlob(relativePath: string, pattern: string): boolean {
  const path = normalizeRelative(relativePath);
  if (path.length === 0 || pattern.trim().length === 0) {
    return false;
  }
  if (minimatch(path, pattern, MATCH_OPTIONS)) {
    return true;
  }
  // 把文件夹当成目录去匹配，这样 **/components/** 能命中 components 文件夹本身。
  return minimatch(`${path}/`, pattern, MATCH_OPTIONS);
}

export function sanitizeFiles(files: readonly string[]): string[] {
  const result: string[] = [];
  for (const raw of files) {
    if (typeof raw !== "string") {
      continue;
    }
    const name = raw.trim().replace(/\\/g, "/");
    if (name.length === 0 || name.startsWith("/") || name.includes("\0")) {
      continue;
    }
    const parts = name.split("/");
    if (parts.some((part) => part.length === 0 || part === "." || part === "..")) {
      continue;
    }
    result.push(parts.join("/"));
  }
  return result;
}

function isExcluded(relativePath: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => typeof pattern === "string" && matchGlob(relativePath, pattern));
}

function isRule(value: ScaffoldRule): boolean {
  return typeof value?.pattern === "string" && Array.isArray(value.files);
}

function normalizeRelative(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

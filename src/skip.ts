export function consumeSkip(skipped: Set<string>, uriKey: string): boolean {
  if (!skipped.has(uriKey)) {
    return false;
  }
  skipped.delete(uriKey);
  return true;
}

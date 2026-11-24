import assert from "assert";
import { filesForFolder, matchGlob, ScaffoldSettings } from "./rules";

const baseSettings: ScaffoldSettings = {
  defaultFiles: ["__init__.py"],
  rules: [],
  exclude: ["**/node_modules/**", "**/.git/**", "**/.venv/**"],
};

function test(name: string, fn: () => void): void {
  fn();
  console.log(`ok ${name}`);
}

test("没有规则时创建默认文件", () => {
  assert.deepStrictEqual(filesForFolder("apps/web", baseSettings), ["__init__.py"]);
});

test("第一条命中的规则覆盖默认文件", () => {
  const settings: ScaffoldSettings = {
    ...baseSettings,
    rules: [
      { pattern: "**/components/**", files: ["index.tsx"] },
      { pattern: "**/hooks/**", files: ["index.ts"] },
    ],
  };
  assert.deepStrictEqual(filesForFolder("src/components/Button", settings), ["index.tsx"]);
  assert.deepStrictEqual(filesForFolder("src/components", settings), ["index.tsx"]);
  assert.deepStrictEqual(filesForFolder("src/hooks", settings), ["index.ts"]);
  assert.deepStrictEqual(filesForFolder("src/utils", settings), ["__init__.py"]);
});

test("规则的 files 为空时不创建文件", () => {
  const settings: ScaffoldSettings = {
    ...baseSettings,
    rules: [{ pattern: "**/docs/**", files: [] }],
  };
  assert.deepStrictEqual(filesForFolder("docs/guide", settings), []);
});

test("排除目录不创建文件", () => {
  assert.deepStrictEqual(filesForFolder("node_modules/leftpad", baseSettings), []);
  assert.deepStrictEqual(filesForFolder(".venv/lib", baseSettings), []);
});

test("拒绝逃出新文件夹的文件名", () => {
  const settings: ScaffoldSettings = {
    ...baseSettings,
    defaultFiles: ["../secret.txt", "/tmp/x", "__init__.py", "nested/index.ts"],
  };
  assert.deepStrictEqual(filesForFolder("pkg", settings), ["__init__.py", "nested/index.ts"]);
});

test("glob ** 匹配任意文件夹", () => {
  assert.strictEqual(matchGlob("a/b", "**"), true);
  assert.strictEqual(matchGlob("components", "**/components/**"), true);
});

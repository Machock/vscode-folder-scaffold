import assert from "assert";
import { filesForFolder, ScaffoldSettings } from "./rules";
import { consumeSkip } from "./skip";

const baseSettings: ScaffoldSettings = {
  defaultFiles: ["__init__.py"],
  rules: [],
  exclude: [],
};

function test(name: string, fn: () => void): void {
  fn();
  console.log(`ok ${name}`);
}

test("预先登记的目录会被自动脚手架跳过", () => {
  const skipped = new Set(["file:///proj/pkg"]);
  assert.strictEqual(consumeSkip(skipped, "file:///proj/pkg"), true);
  assert.deepStrictEqual([...skipped], []);
});

test("未登记的目录仍走原来的路径规则", () => {
  const skipped = new Set(["file:///proj/other"]);
  assert.strictEqual(consumeSkip(skipped, "file:///proj/pkg"), false);
  assert.deepStrictEqual([...skipped], ["file:///proj/other"]);
  assert.deepStrictEqual(filesForFolder("pkg", baseSettings), ["__init__.py"]);
});

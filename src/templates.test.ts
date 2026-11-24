import assert from "assert";
import {
  folderNameError,
  parseTemplates,
  TEMPLATE_SLOT_COUNT,
  templateCommandId,
  templateContextKey,
  templateDisplayTitle,
  templatePrompt,
} from "./templates";

function test(name: string, fn: () => void): void {
  fn();
  console.log(`ok ${name}`);
}

test("保留有效模板并丢弃非法项", () => {
  const parsed = parseTemplates([
    { files: "index.ts" },
    null,
    { title: "组件", files: ["index.tsx"] },
    { title: "   ", files: ["../x", "__init__.py", "nested/index.ts"] },
    { title: 1, files: [] },
  ]);
  assert.deepStrictEqual(parsed, [
    { title: "组件", files: ["index.tsx"] },
    { title: "", files: ["__init__.py", "nested/index.ts"] },
    { title: "", files: [] },
  ]);
});

test("非数组时没有模板", () => {
  assert.deepStrictEqual(parseTemplates(undefined), []);
  assert.deepStrictEqual(parseTemplates({ title: "组件", files: ["index.tsx"] }), []);
});

test("只保留前 8 条有效模板", () => {
  const value = Array.from({ length: 9 }, (_, index) => ({
    title: `T${index}`,
    files: [`f${index}.txt`],
  }));
  const parsed = parseTemplates(value);
  assert.strictEqual(TEMPLATE_SLOT_COUNT, 8);
  assert.strictEqual(parsed.length, 8);
  assert.deepStrictEqual(parsed[7], { title: "T7", files: ["f7.txt"] });
});

test("显示名使用自定义标题", () => {
  assert.strictEqual(templateDisplayTitle({ title: "Python 包", files: [] }, 0), "Python 包");
  assert.strictEqual(templateDisplayTitle({ title: "", files: [] }, 1), "模板 2");
});

test("提示文案使用自定义标题", () => {
  assert.strictEqual(
    templatePrompt({ title: "Python 包", files: ["__init__.py"] }, 0),
    "「Python 包」将创建：__init__.py",
  );
  assert.strictEqual(
    templatePrompt({ title: "", files: [] }, 1),
    "「模板 2」将创建空文件夹",
  );
  assert.strictEqual(
    templatePrompt({ title: "组件", files: ["index.tsx", "style.css"] }, 2),
    "「组件」将创建：index.tsx、style.css",
  );
});

test("文件夹名只允许一层", () => {
  assert.strictEqual(folderNameError("  pkg  "), undefined);
  assert.strictEqual(folderNameError("   "), "请输入文件夹名称");
  assert.strictEqual(folderNameError("."), "不能使用 . 或 ..");
  assert.strictEqual(folderNameError(".."), "不能使用 . 或 ..");
  assert.strictEqual(folderNameError("a/b"), "只能使用一层文件夹名称");
  assert.strictEqual(folderNameError("a\\b"), "只能使用一层文件夹名称");
  assert.strictEqual(folderNameError("a\0b"), "只能使用一层文件夹名称");
});

test("槽位命令和上下文键", () => {
  assert.strictEqual(templateCommandId(0), "folderScaffold.createFromTemplate.0");
  assert.strictEqual(templateCommandId(7), "folderScaffold.createFromTemplate.7");
  assert.strictEqual(templateContextKey(0), "folderScaffold.template0");
  assert.strictEqual(templateContextKey(7), "folderScaffold.template7");
});

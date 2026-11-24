# Folder Scaffold

在资源管理器里新建文件夹时，按设置自动创建文件。默认创建 `__init__.py`，可以改成 `index.ts`、`index.tsx`，或按路径使用不同文件。

只响应编辑器内的新建操作（资源管理器「新建文件夹」、以及扩展 API 创建的文件夹）。在终端里执行 `mkdir` 不会触发。

## 设置

用命令面板运行 **Folder Scaffold: 打开设置**，或直接改 `settings.json`。

默认只创建 `__init__.py`：

```json
{
  "folderScaffold.defaultFiles": ["__init__.py"]
}
```

改成默认创建 `index.ts`：

```json
{
  "folderScaffold.defaultFiles": ["index.ts"]
}
```

按目录区分，其余文件夹仍用默认文件：

```json
{
  "folderScaffold.defaultFiles": ["__init__.py"],
  "folderScaffold.rules": [
    { "pattern": "**/components/**", "files": ["index.tsx"] },
    { "pattern": "**/hooks/**", "files": ["index.ts"] }
  ]
}
```

规则按顺序匹配文件夹的工作区相对路径，命中第一条后就不再看后面的规则，也不再使用 `defaultFiles`。把某条规则的 `files` 设为 `[]`，表示这个路径下不创建文件。

`folderScaffold.exclude` 用来跳过 `node_modules`、`.venv`、`.git` 等目录。

已经存在的同名文件不会被覆盖。

## 按模板新建文件夹

资源管理器里右键文件夹或文件，可以看到「模板 1」「模板 2」。默认对应：

```json
{
  "folderScaffold.templates": [
    { "title": "Python 包", "files": ["__init__.py"] },
    { "title": "组件", "files": ["index.tsx"] }
  ]
}
```

右键上的文字固定是「模板 N」。设置里的 `title` 出现在接下来的输入框里。输入一层文件夹名后，扩展在右键的文件夹内新建子文件夹；右键的是文件时，则建在该文件所在目录。新文件夹里只创建该模板 `files` 中的文件。

最多 8 条。不是对象，或 `files` 不是数组的项会被跳过，不占槽位。`files` 为空时只建空文件夹。目标文件夹已经存在时，只补缺失文件，不覆盖已有文件。

用模板建出的文件夹不会再套用 `defaultFiles` 和 `rules`。资源管理器自己的「新建文件夹」仍按路径规则创建文件。`exclude` 只作用于那种自动创建。

## 本地运行

用 VS Code 或 Cursor 打开本目录 `vscode-folder-scaffold`，执行：

```bash
npm install
npm test
```

然后按 F5，会打开一个扩展开发主机。在里面新建文件夹，即可看到自动生成的文件。

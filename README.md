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

## 本地运行

用 VS Code 或 Cursor 打开本目录 `vscode-folder-scaffold`，执行：

```bash
npm install
npm test
```

然后按 F5，会打开一个扩展开发主机。在里面新建文件夹，即可看到自动生成的文件。

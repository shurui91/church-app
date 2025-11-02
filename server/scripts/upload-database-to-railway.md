# 上传本地数据库到 Railway

## 方法 1: 使用 JSON 导出/导入（推荐）

这是最简单和安全的方法。

### 步骤 1: 在本地导出用户数据

```bash
cd server
node scripts/export-users-to-json.js
```

这会创建一个 `users-export.json` 文件，包含所有用户数据。

### 步骤 2: 将 JSON 文件上传到 Railway

**选项 A: 通过 Git 提交（简单，但文件会进入版本控制）**

```bash
# 如果文件不在 .gitignore 中，可以临时提交
git add server/users-export.json
git commit -m "Add users export for Railway import"
git push
```

然后 Railway 会自动部署，文件就会在 Railway 上了。

**选项 B: 通过 Railway Shell 手动上传（推荐）**

1. 在本地终端，读取文件内容并 base64 编码：
```bash
cat server/users-export.json | base64 | pbcopy
```

2. 在 Railway Web Shell 中：
```bash
cd server
# 粘贴 base64 编码的内容（替换 <PASTE_BASE64_HERE>）
echo "<PASTE_BASE64_HERE>" | base64 -d > users-export.json
```

### 步骤 3: 在 Railway 上运行迁移和导入

```bash
# 1. 确保数据库结构是最新的
cd server
node scripts/migrate-add-user-fields.js

# 2. 导入用户数据
node scripts/import-users-from-json.js users-export.json

# 3. 更新现有用户的默认值
node scripts/update-existing-users.js

# 4. 验证
node scripts/list-users.js
```

## 方法 2: 直接上传 SQLite 数据库文件（不推荐，但可行）

⚠️ **注意**：这种方法会完全替换 Railway 上的数据库，可能会丢失数据。

### 步骤 1: 准备数据库文件

确保本地数据库文件完整：
```bash
ls -lh server/database.sqlite
```

### 步骤 2: 在 Railway Shell 中上传

1. 在本地终端，base64 编码数据库文件：
```bash
cat server/database.sqlite | base64 | pbcopy
```

2. 在 Railway Web Shell 中：
```bash
cd server
# 先备份现有数据库（如果存在）
mv database.sqlite database.sqlite.backup 2>/dev/null || true

# 粘贴 base64 编码的内容并解码
echo "<PASTE_BASE64_HERE>" | base64 -d > database.sqlite

# 验证文件
ls -lh database.sqlite
sqlite3 database.sqlite "SELECT COUNT(*) FROM users;"
```

### 步骤 3: 验证

```bash
node scripts/list-users.js
```

## 方法 3: 使用 Railway CLI（如果安装了）

如果你安装了 Railway CLI：

```bash
# 登录
railway login

# 上传文件（需要找到正确的服务 ID）
railway run --service <service-id> -- bash -c "cd server && cat > database.sqlite" < server/database.sqlite
```

## 推荐流程总结

✅ **推荐方法**（使用 JSON 导出/导入）：

1. 本地：`node scripts/export-users-to-json.js`
2. 通过 Git 提交 JSON 文件（或使用 base64 上传）
3. Railway Shell：
   - `node scripts/migrate-add-user-fields.js`
   - `node scripts/import-users-from-json.js users-export.json`
   - `node scripts/update-existing-users.js`
   - `node scripts/list-users.js`

这种方法的好处：
- ✅ 只传输必要的数据
- ✅ 可以跨版本兼容
- ✅ 不会破坏数据库结构
- ✅ 可以验证和调试


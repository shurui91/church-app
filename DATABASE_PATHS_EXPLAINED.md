# 数据库路径说明

## 重要概念：本地 vs Railway

### 本地开发环境

**数据库文件位置**：
```
server/database.sqlite
```

- ✅ 文件存储在项目的 `server/` 目录下
- ✅ 用于本地开发和测试
- ❌ **不应该提交到 Git**（已在 `.gitignore` 中忽略）
- ✅ 文件只存在于你的本地电脑上

### Railway 生产环境

**数据库文件位置**：
```
/data/database.sqlite
```

- ✅ 文件存储在 Railway Volume（持久化存储）中
- ✅ **这个路径只在 Railway 服务器上存在**
- ❌ **不在你的本地 Git repo 中**
- ✅ 这就是为什么需要配置 `DB_PATH=/data/database.sqlite` 环境变量

## 工作原理

### 代码逻辑

在 `server/database/db.js` 中：

```javascript
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
```

**行为**：
1. **本地开发**：
   - `DB_PATH` 环境变量未设置
   - 使用默认路径：`server/database.sqlite`
   - 数据库文件存储在项目目录中

2. **Railway 生产环境**：
   - 设置环境变量：`DB_PATH=/data/database.sqlite`
   - 使用环境变量指定的路径：`/data/database.sqlite`
   - 数据库文件存储在 Railway Volume 中（持久化存储）

### 为什么 `/data/database.sqlite` 不在 Git 中？

✅ **这是正确的！**

原因：
1. **数据库文件是数据，不是代码**
   - 应该被 `.gitignore` 忽略
   - 不同环境有不同的数据

2. **本地和服务器使用不同的数据库**
   - 本地：`server/database.sqlite`（你的测试数据）
   - Railway：`/data/database.sqlite`（生产数据）

3. **安全考虑**
   - 生产数据库包含真实用户数据
   - 不应该在 Git 仓库中

## 工作流程

### 本地开发

```bash
# 1. 代码在本地，数据库也在本地
cd server
node scripts/add-user.js "+15676983308" member
node scripts/list-users.js  # 查看本地数据库中的用户
```

**数据库文件**：`server/database.sqlite`（在你的电脑上）

### Railway 部署

```bash
# 1. 推送代码（不包含数据库文件）
git push

# 2. Railway 自动部署

# 3. 在 Railway Shell 中初始化数据库
cd server
node scripts/migrate-add-user-fields.js
node scripts/add-user.js "+15676983308" member
node scripts/list-users.js  # 查看 Railway 数据库中的用户
```

**数据库文件**：`/data/database.sqlite`（在 Railway 服务器上）

## 环境变量配置

### Railway Dashboard 设置

在 **Variables** 标签页添加：
```
DB_PATH=/data/database.sqlite
```

这告诉应用在生产环境中使用 `/data/database.sqlite` 而不是 `server/database.sqlite`。

### 本地开发（可选）

如果你想在本地也使用环境变量，可以创建 `server/.env.local`：

```bash
# 本地开发时，也可以使用环境变量覆盖路径
# DB_PATH=./database.sqlite
```

但这不是必需的，因为默认路径已经指向 `server/database.sqlite`。

## 总结

| 环境 | 数据库路径 | 文件位置 | 是否在 Git 中 |
|------|-----------|---------|--------------|
| **本地开发** | `server/database.sqlite` | 你的电脑 | ❌ 否（被忽略） |
| **Railway 生产** | `/data/database.sqlite` | Railway 服务器 | ❌ 否（根本不在 Git repo 中） |

**关键点**：
- ✅ `/data/database.sqlite` 只在 Railway 服务器上存在
- ✅ 不在你的 Git repo 中（这是正常的）
- ✅ 通过环境变量 `DB_PATH` 切换不同环境的数据库路径
- ✅ 数据库文件应该被 `.gitignore` 忽略

## 验证配置

### 检查本地数据库

```bash
# 本地
ls -la server/database.sqlite  # 应该能看到文件（如果存在）
```

### 检查 Railway 数据库

在 Railway Shell 中：
```bash
# Railway
ls -la /data/database.sqlite  # 应该能看到文件（配置 Volume 后）
echo $DB_PATH  # 应该显示: /data/database.sqlite
```

### 检查日志

查看 Railway Logs，应该看到：
```
[Database] Using database at: /data/database.sqlite
[Database] DB_PATH env var: /data/database.sqlite
```

这表明应用正在使用正确的路径。


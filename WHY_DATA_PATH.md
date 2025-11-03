# 为什么 Railway 使用 `/data` 路径？

## 核心原因：持久化存储（Persistent Storage）

### 问题：为什么不能用 `server/database.sqlite`？

当你在 Railway 上部署时：

1. **每次 `git push` 后**：
   - Railway 会重新构建容器
   - 从 Git repo 拉取最新代码
   - **容器内的所有文件都会被重置为 Git repo 的内容**

2. **如果数据库在项目目录中**：
   ```
   server/database.sqlite  ← 重新部署后会丢失！
   ```
   - 因为项目目录在容器内，每次部署都会重新创建
   - 数据库文件不在 Git repo 中（被 `.gitignore` 忽略）
   - 所以重新部署后，文件就不存在了

### 解决方案：Railway Volume（持久化存储）

Railway 提供了 **Volume** 功能，可以将一个**持久化存储目录**挂载到容器中：

```
┌─────────────────────────────────┐
│  Railway 容器                   │
│  ┌───────────────────────────┐  │
│  │ /app (项目目录)           │  │
│  │   └── server/            │  │
│  │       └── database.sqlite │  │ ← 重新部署会丢失 ❌
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ /data (Volume 挂载点)     │  │
│  │   └── database.sqlite     │  │ ← 持久化保存 ✅
│  └───────────────────────────┘  │
└─────────────────────────────────┘
         ↑
    Volume 存储（外部持久化）
```

## 为什么是 `/data`？

### 1. Railway Volume 的工作原理

当你创建一个 Volume 时：
- **Mount Path（挂载点）**：容器内的一个路径，比如 `/data`
- **Volume 存储**：Railway 管理的持久化存储空间（在容器外部）

```
┌─────────────────────────────────────┐
│  Railway 管理的持久化存储            │
│  (即使容器重启/重新部署也不会丢失)    │
└─────────────────────────────────────┘
            ↑
            │ 挂载到
            ↓
┌─────────────────────────────────────┐
│  /data (容器内的挂载点)              │
│  └── database.sqlite                │
└─────────────────────────────────────┘
```

### 2. `/data` 是约定俗成的路径

`/data` 是一个常见的约定，但**你可以使用任何路径**：

| 路径 | 说明 | 是否常用 |
|------|------|---------|
| `/data` | 最常见的约定 | ✅ 是 |
| `/persistent` | 语义清晰 | ✅ 是 |
| `/storage` | 也很好理解 | ✅ 是 |
| `/var/db` | 类似 Linux 系统目录 | ✅ 是 |
| `/app/data` | 项目相关 | ⚠️ 可以但不推荐 |
| `/my-custom-path` | 自定义路径 | ⚠️ 可以 |

**推荐使用 `/data`**，因为：
- ✅ 简洁明了
- ✅ 符合常见约定
- ✅ 不与其他系统目录冲突

### 3. 为什么不在项目目录？

**问题示例**：

如果使用 `/app/server/database.sqlite`（项目目录）：
```javascript
// ❌ 不推荐
DB_PATH=/app/server/database.sqlite
```

**问题**：
- `/app` 目录包含你的 Git repo 代码
- 每次部署时，Railway 会：
  1. 清空 `/app` 目录
  2. 从 Git 拉取最新代码
  3. **数据库文件被删除！** ❌

**解决方案**：

使用独立的 Volume 挂载点 `/data`：
```javascript
// ✅ 推荐
DB_PATH=/data/database.sqlite
```

**好处**：
- `/data` 是独立挂载的目录
- 不随 Git 代码部署而重置
- 数据持久化保存 ✅

## 实际配置示例

### Railway Dashboard 配置

1. **创建 Volume**：
   ```
   Name: database-storage
   Mount Path: /data
   ```

2. **设置环境变量**：
   ```
   DB_PATH=/data/database.sqlite
   ```

### 代码自动适配

你的代码 `server/database/db.js`：

```javascript
// 自动根据环境选择路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
```

**行为**：
- **本地**：`DB_PATH` 未设置 → 使用 `server/database.sqlite`
- **Railway**：`DB_PATH=/data/database.sqlite` → 使用 `/data/database.sqlite`

## 验证 Volume 是否工作

### 在 Railway Shell 中检查：

```bash
# 1. 检查 Volume 是否挂载
ls -la /data
# 应该能看到目录（即使为空）

# 2. 检查环境变量
echo $DB_PATH
# 应该显示: /data/database.sqlite

# 3. 初始化数据库
cd server
node scripts/migrate-add-user-fields.js

# 4. 检查数据库文件
ls -la /data/database.sqlite
# 应该能看到文件

# 5. 重新部署后，再次检查
ls -la /data/database.sqlite
# 文件应该还在！✅
```

## 总结

| 路径 | 位置 | 持久化 | 重新部署后 |
|------|------|--------|-----------|
| `server/database.sqlite` | 项目目录 | ❌ 否 | ❌ 丢失 |
| `/data/database.sqlite` | Volume 挂载点 | ✅ 是 | ✅ 保留 |

**关键点**：
- ✅ `/data` 是 Railway Volume 的挂载点（持久化存储）
- ✅ 可以自定义路径，但 `/data` 是推荐约定
- ✅ 项目目录 (`/app`) 会随部署重置，不能用
- ✅ Volume 目录 (`/data`) 持久化保存，即使重新部署也不丢失

## 如果不想用 `/data`？

你也可以使用其他路径：

1. **创建 Volume 时**，Mount Path 设置为：`/persistent` 或 `/storage`
2. **环境变量**设置为：`DB_PATH=/persistent/database.sqlite`
3. **代码不需要修改**，会自动使用环境变量

但建议使用 `/data`，因为这是最常见的约定。


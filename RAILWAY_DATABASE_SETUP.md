# Railway 数据库设置指南

## 当前项目使用 SQLite

你的项目目前使用的是 **SQLite**，这是一个文件数据库，**不需要单独添加数据库服务**。

### SQLite 在 Railway 上的工作原理

1. **自动持久化**：Railway 会自动为你的服务提供持久化存储
2. **文件保存**：`database.sqlite` 文件会保存在服务的工作目录中
3. **无需配置**：不需要添加额外的数据库服务

## 确认 SQLite 正常工作

### 1. 检查数据库路径

你的代码中数据库路径是：
```javascript
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database.sqlite');
```

这意味着数据库文件会保存在 `server/database.sqlite`。

### 2. 在 Railway Shell 中验证

```bash
cd server
ls -la database.sqlite  # 检查数据库文件是否存在
node scripts/list-users.js  # 查看数据库中的用户
```

## 如果需要使用 PostgreSQL（可选）

如果你将来想使用 PostgreSQL（更强大的数据库），可以：

### 方法 1: 添加 Railway PostgreSQL 服务

1. **在 Railway Dashboard 中**：
   - 进入你的项目
   - 点击 **"+ New"** 按钮
   - 选择 **"Database"** → **"Add PostgreSQL"**

2. **Railway 会自动**：
   - 创建 PostgreSQL 数据库服务
   - 生成连接字符串
   - 设置环境变量（如 `DATABASE_URL`）

3. **修改代码使用 PostgreSQL**：
   - 需要修改数据库连接代码
   - 使用 `pg` 或 `postgres` 库替代 `sqlite3`

### 方法 2: 使用外部数据库服务

你也可以使用其他数据库服务：
- Railway PostgreSQL
- Railway MySQL
- Supabase
- PlanetScale
- 等等

## 当前项目建议

### ✅ 继续使用 SQLite（推荐）

**优点**：
- ✅ 无需额外配置
- ✅ 无需额外费用
- ✅ 文件自动持久化
- ✅ 简单易用
- ✅ 适合当前规模（100-1000用户）

**注意事项**：
- ⚠️ SQLite 适合单服务器部署
- ⚠️ 如果有多个服务实例，需要共享存储（Railway Volume）
- ⚠️ 对于大规模应用，PostgreSQL 可能更合适

### 当前 SQLite 设置已足够

对于你的项目规模（100-1000用户），SQLite 完全够用。

## 数据库迁移（如果需要）

如果你决定从 SQLite 迁移到 PostgreSQL：

### 步骤：

1. **添加 PostgreSQL 服务**
2. **导出 SQLite 数据**：
   ```bash
   sqlite3 database.sqlite .dump > backup.sql
   ```

3. **修改代码使用 PostgreSQL**：
   - 更新 `server/database/db.js`
   - 更新数据库模型
   - 更新连接逻辑

4. **导入数据到 PostgreSQL**

## 当前项目不需要额外操作

**对于你的项目，SQLite 已经够用了，不需要添加额外的数据库服务。**

你只需要：
1. ✅ 确保代码已部署到 Railway
2. ✅ 在 Railway Shell 中运行脚本初始化数据库
3. ✅ 数据库文件会自动保存在 Railway 的持久化存储中

## 验证数据库正常工作

### 在 Railway Shell 中：

```bash
cd server

# 1. 初始化数据库（如果还没做）
node scripts/migrate-users-table.js

# 2. 添加用户
node scripts/add-user.js "+15676983308" member

# 3. 查看用户列表（验证数据库工作正常）
node scripts/list-users.js

# 4. 检查数据库文件
ls -lh database.sqlite
```

如果以上命令都能正常工作，说明数据库设置正确。

## 常见问题

### Q: 数据库文件会丢失吗？
A: Railway 的持久化存储会保存数据库文件，除非手动删除或重新部署时清除了数据。

### Q: 如何备份数据库？
A: 在 Railway Shell 中：
```bash
cp database.sqlite database-backup-$(date +%Y%m%d).sqlite
```
然后可以从 Railway 下载文件。

### Q: 需要迁移到 PostgreSQL 吗？
A: 对于 100-1000 用户的规模，SQLite 完全够用。只有当需要以下功能时才考虑迁移：
- 多服务器实例
- 高级查询功能
- 实时复制
- 更大规模

## 总结

- ✅ **当前项目使用 SQLite，无需添加数据库服务**
- ✅ **数据库会自动保存在 Railway 的持久化存储中**
- ✅ **只需运行脚本初始化数据库和添加用户即可**
- ⚠️ **如果将来需要更强大的功能，可以考虑 PostgreSQL**


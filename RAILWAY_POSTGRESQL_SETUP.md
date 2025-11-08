# Railway PostgreSQL 配置指南

## 问题

如果看到以下错误：
```
Error: connect ECONNREFUSED ::1:5432
[Database] Host: localhost, Port: 5432
```

这说明 Railway 上没有正确配置 PostgreSQL 连接信息。

## 解决方案

### 方法 1: 在 Railway 上添加 PostgreSQL 服务（推荐）

1. **在 Railway Dashboard 中**：
   - 进入你的项目
   - 点击 **"+ New"** 按钮
   - 选择 **"Database"** → **"Add PostgreSQL"**

2. **Railway 会自动**：
   - 创建 PostgreSQL 数据库服务
   - 生成连接字符串
   - 设置环境变量（通常是 `DATABASE_URL` 或 `POSTGRES_URL`）

3. **验证环境变量**：
   - 在 Railway Dashboard 中，进入你的 **Web Service**（不是数据库服务）
   - 点击 **"Variables"** 标签页
   - 确认是否有以下变量之一：
     - `DATABASE_URL`
     - `POSTGRES_URL`
     - `POSTGRES_PRIVATE_URL`
     - 或者 `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

4. **如果环境变量没有自动添加**：
   - 在数据库服务的 **"Variables"** 标签页中，找到连接信息
   - 手动将这些变量添加到 Web Service 的 **"Variables"** 中

### 方法 2: 手动设置环境变量

如果 PostgreSQL 服务已经存在，但环境变量没有自动添加：

1. **在 Railway Dashboard 中**：
   - 进入你的 **Web Service**
   - 点击 **"Variables"** 标签页

2. **添加以下环境变量**（根据你的 PostgreSQL 服务信息填写）：

   **选项 A: 使用连接字符串（推荐）**
   ```
   DATABASE_URL=postgresql://user:password@host:port/database
   ```

   **选项 B: 使用单独变量**
   ```
   PGHOST=your-postgres-host.railway.app
   PGPORT=5432
   PGDATABASE=railway
   PGUSER=postgres
   PGPASSWORD=your-password
   ```

3. **获取连接信息**：
   - 进入 PostgreSQL 服务
   - 在 **"Variables"** 标签页中查看连接信息
   - 或者在 **"Connect"** 标签页中查看连接字符串

### 方法 3: 使用 Railway CLI

```bash
# 登录
railway login

# 链接到项目
railway link

# 查看所有环境变量
railway variables

# 设置 DATABASE_URL（从 PostgreSQL 服务获取）
railway variables set DATABASE_URL="postgresql://user:password@host:port/database"
```

## 验证配置

部署后，查看 Railway 日志，应该看到：

```
[Database] Connecting to PostgreSQL
[Database] Using DATABASE_URL: postgresql://user:****@host:port/database
```

或者：

```
[Database] Available PostgreSQL env vars: DATABASE_URL, PGHOST, PGPORT, ...
```

如果看到：

```
[Database] WARNING: No PostgreSQL environment variables found!
```

说明环境变量没有正确设置，需要按照上面的步骤配置。

## 常见问题

### Q: Railway 自动添加了 PostgreSQL 服务，但环境变量在哪里？

A: Railway 通常会将连接信息添加到 **数据库服务** 的 Variables 中，而不是 Web Service。你需要：
1. 查看数据库服务的 Variables
2. 将这些变量添加到 Web Service 的 Variables 中
3. 或者使用 `DATABASE_URL` 连接字符串

### Q: 如何找到 PostgreSQL 服务的连接信息？

A: 
1. 在 Railway Dashboard 中，点击 PostgreSQL 服务
2. 查看 **"Variables"** 标签页
3. 或者查看 **"Connect"** 标签页，那里有连接字符串示例

### Q: 连接字符串格式是什么？

A: 
```
postgresql://username:password@host:port/database
```

例如：
```
postgresql://postgres:abc123@containers-us-west-123.railway.app:5432/railway
```

### Q: 需要设置 SSL 吗？

A: Railway 上的 PostgreSQL 通常需要 SSL。代码会自动检测 Railway 环境并启用 SSL。

## 测试连接

部署后，检查健康状态：

```
https://your-app.up.railway.app/health
```

如果数据库连接成功，服务器应该正常启动。如果仍然失败，查看 Railway 日志获取详细错误信息。


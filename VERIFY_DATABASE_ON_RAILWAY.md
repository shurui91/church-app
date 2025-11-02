# 如何验证 Railway 上的数据库

## 重要说明

**SQLite 数据库文件通常不应该在 GitHub repo 中**，原因：
- ✅ 数据库文件是数据，不是代码
- ✅ 数据库文件会频繁变化
- ✅ 应该在 `.gitignore` 中忽略

## Railway 上的数据库位置

Railway 上的 SQLite 文件保存在：
- **运行时目录**：`/app/server/database.sqlite`（或类似路径）
- **持久化存储**：Railway 自动提供的持久化存储中
- **不在 Git repo 中**：数据库文件是在 Railway 运行时创建的

## 验证 Railway 上的数据库

### 方法 1: 在 Railway Shell 中检查（推荐）

```bash
# 1. 进入 server 目录
cd server

# 2. 检查数据库文件是否存在
ls -lh database.sqlite

# 3. 查看数据库中的表
sqlite3 database.sqlite ".tables"

# 4. 查看用户表结构
sqlite3 database.sqlite ".schema users"

# 5. 查看用户数据
sqlite3 database.sqlite "SELECT * FROM users;"

# 6. 或使用脚本查看
node scripts/list-users.js
```

### 方法 2: 检查数据库是否可访问

```bash
# 在 Railway Shell 中
cd server

# 运行数据库操作脚本
node scripts/list-users.js

# 如果返回用户列表，说明数据库存在且可访问
# 如果报错，说明数据库可能不存在或有问题
```

### 方法 3: 通过 API 验证

```bash
# 测试检查手机号 API（需要用户存在）
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308"}'

# 如果返回 {"isWhitelisted": true}，说明数据库中有用户
# 如果返回 {"isWhitelisted": false}，说明数据库中没有该用户
```

### 方法 4: 查看 Railway 日志

在 Railway Dashboard → Logs 中查看：
- 查找 "Database initialized successfully"
- 查找数据库相关的错误信息

## 数据库文件不应该在 GitHub 中

检查你的 `.gitignore` 应该包含：

```
*.sqlite
*.sqlite3
*.db
```

如果数据库文件意外提交到 Git，应该：
1. 从 Git 中删除（但保留本地文件）
2. 确保 `.gitignore` 已更新
3. 重新提交

## Railway 上的数据库生命周期

1. **首次部署**：
   - Railway 运行你的代码
   - `initDatabase()` 函数创建数据库文件
   - 数据库文件保存在 Railway 的持久化存储中

2. **每次部署**：
   - 数据库文件会保留（除非手动删除）
   - 数据不会丢失

3. **重启服务**：
   - 数据库文件保留
   - 数据持续存在

## 验证步骤总结

### 快速验证（在 Railway Shell 中）：

```bash
cd server && node scripts/list-users.js
```

**预期结果**：
- ✅ 如果返回用户列表 → 数据库存在且正常
- ❌ 如果报错 "no such table" → 需要运行 `migrate-users-table.js`
- ❌ 如果报错 "no such file" → 数据库文件不存在，需要初始化

### 完整验证流程：

```bash
# 1. 进入 server 目录
cd server

# 2. 检查文件是否存在
ls -lh database.sqlite

# 3. 如果不存在，初始化数据库
node scripts/migrate-users-table.js

# 4. 添加测试用户
node scripts/add-user.js "+15676983308" member

# 5. 验证用户已添加
node scripts/list-users.js

# 6. 通过 API 验证
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308"}'
```

## 常见情况

### 情况 1: 数据库文件不存在

**症状**：
- `ls database.sqlite` 返回 "No such file"
- 运行脚本报错

**解决**：
```bash
node scripts/migrate-users-table.js
```

### 情况 2: 数据库存在但没有表

**症状**：
- 文件存在但运行脚本报 "no such table"

**解决**：
```bash
node scripts/migrate-users-table.js
```

### 情况 3: 数据库存在但没有用户

**症状**：
- 可以运行 `list-users.js` 但返回 "No users found"

**解决**：
```bash
node scripts/add-user.js "+15676983308" member
# ... 添加其他用户
```

## 总结

- ❌ **SQLite 文件不应该在 GitHub repo 中**
- ✅ **Railway 上的数据库文件在运行时目录中**
- ✅ **使用 Railway Shell 运行脚本验证数据库**
- ✅ **数据库文件会保存在 Railway 的持久化存储中**


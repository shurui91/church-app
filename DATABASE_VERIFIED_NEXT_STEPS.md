# 数据库已初始化 - 下一步操作

## ✅ 确认状态

日志显示 "Database initialized successfully"，说明：
- ✅ 数据库文件已创建
- ✅ 数据库表已创建（users, verification_codes, sessions）
- ✅ 数据库可以正常工作

## 下一步：验证和添加用户

### 在 Railway Shell 中运行：

```bash
cd server

# 1. 查看当前用户列表（应该是空的）
node scripts/list-users.js
```

### 如果显示 "No users found" 或用户列表为空：

需要添加测试用户：

```bash
# 添加所有 5 个测试用户
node scripts/add-user.js "+15676983308" member
node scripts/add-user.js "+16262274460" member
node scripts/add-user.js "+15622919164" member
node scripts/add-user.js "+16263999536" member
node scripts/add-user.js "+19495161377" member

# 再次验证用户已添加
node scripts/list-users.js
```

## 完整验证流程

### 1. 检查数据库状态

```bash
cd server

# 查看用户列表
node scripts/list-users.js

# 检查数据库文件大小（应该大于 0）
ls -lh database.sqlite
```

### 2. 添加用户（如果还没有）

```bash
node scripts/add-user.js "+15676983308" member
node scripts/add-user.js "+16262274460" member
node scripts/add-user.js "+15622919164" member
node scripts/add-user.js "+16263999536" member
node scripts/add-user.js "+19495161377" member
```

### 3. 验证用户已添加

```bash
node scripts/list-users.js
```

应该显示 5 个用户。

### 4. 通过 API 验证

在本地终端运行（或 Railway Shell 中）：

```bash
# 检查手机号是否在白名单中
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308"}'
```

应该返回：`{"success": true, "isWhitelisted": true, ...}`

### 5. 测试登录（使用验证码 123456）

```bash
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308", "code": "123456"}'
```

应该返回登录成功的响应（包含 user 和 token）。

## 当前状态总结

- ✅ 数据库已初始化
- ✅ 数据库表已创建
- ⏳ **需要添加用户**（如果还没有）
- ⏳ **需要确保环境变量正确**（`ALLOW_DEV_CODE=true`）
- ⏳ **需要验证登录功能**

## 环境变量检查

确保在 Railway Dashboard → Variables 中设置了：

- ✅ `JWT_SECRET` - 必须设置
- ✅ `ALLOW_DEV_CODE=true` - 让验证码 123456 可用
- ❌ `NODE_ENV` - 不要设置为 `production`

## 测试账号列表

添加完成后，这些账号可以用于测试：

| 手机号 | 格式（输入时） | 验证码 |
|--------|---------------|--------|
| +15676983308 | 5676983308 | 123456 |
| +16262274460 | 6262274460 | 123456 |
| +15622919164 | 5622919164 | 123456 |
| +16263999536 | 6263999536 | 123456 |
| +19495161377 | 9495161377 | 123456 |

## 如果遇到问题

### 问题：添加用户时出错

检查：
- 用户是否已存在（会显示 "already exists"）
- 手机号格式是否正确（必须是 +1 开头的完整格式）

### 问题：API 返回 "isWhitelisted: false"

可能原因：
- 用户还没添加到数据库 → 运行 `add-user.js`
- 手机号格式不匹配 → 确保使用完整格式 `+1XXXXXXXXXX`

### 问题：验证码 123456 不工作

检查：
- 环境变量 `ALLOW_DEV_CODE=true` 是否设置
- 代码是否已更新（包含 `ALLOW_DEV_CODE` 支持）
- Railway 是否已重新部署


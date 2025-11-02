# 立即添加用户到 Railway 数据库

## 当前状态

✅ 数据库已初始化  
✅ API 正常工作  
❌ 数据库中还没有用户（`isWhitelisted: false`）

## 操作步骤

### 在 Railway Shell 中运行：

```bash
cd server

# 添加所有 5 个测试用户（逐个运行）
node scripts/add-user.js "+15676983308" member
node scripts/add-user.js "+16262274460" member
node scripts/add-user.js "+15622919164" member
node scripts/add-user.js "+16263999536" member
node scripts/add-user.js "+19495161377" member
```

### 验证用户已添加：

```bash
node scripts/list-users.js
```

应该显示 5 个用户。

## 添加后立即测试

添加完用户后，在本地终端运行：

```bash
# 测试 1: 检查白名单
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/check-phone \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308"}'

# 应该返回: {"success": true, "isWhitelisted": true}

# 测试 2: 测试登录
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308", "code": "123456"}'

# 应该返回: {"success": true, "message": "登录成功", ...}
```

## 如果遇到错误

### 错误："User already exists"
- 说明用户已存在，跳过即可
- 继续添加其他用户

### 错误："无法连接到数据库"
- 检查 Railway 服务是否正常运行
- 查看 Railway 日志

### 添加成功后仍然返回 false
1. 检查手机号格式是否正确（必须是 `+1` 开头）
2. 确认脚本执行成功（查看输出）
3. 等待几秒钟后重试（数据库写入可能需要时间）


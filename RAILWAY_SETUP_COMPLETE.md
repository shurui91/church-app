# Railway 部署完成 ✅

## 部署信息

- **API URL**: `https://church-app-production-68eb.up.railway.app`
- **状态**: ✅ 正常运行
- **前端配置**: ✅ 已配置在 `app/.env`

## 验证步骤

### 1. API 健康检查 ✅

```bash
curl https://church-app-production-68eb.up.railway.app/health
# 返回: {"status":"ok","timestamp":"..."}
```

### 2. 前端配置 ✅

已创建 `app/.env` 文件：
```
EXPO_PUBLIC_API_URL=https://church-app-production-68eb.up.railway.app
```

## 下一步操作

### 1. 添加测试用户到数据库（如果还没添加）

在 Railway Dashboard → 你的服务 → Shell 中运行：

```bash
cd server
node scripts/add-user.js "+15676983308" member
node scripts/add-user.js "+16262274460" member
node scripts/add-user.js "+15622919164" member
node scripts/add-user.js "+16263999536" member
node scripts/add-user.js "+19495161377" member
```

或者查看已有用户：
```bash
node scripts/list-users.js
```

### 2. 重启 Expo（使用新的 API URL）

```bash
cd app
npx expo start --clear
```

### 3. 测试登录功能

在 iOS Simulator 或设备上：
1. 输入手机号（如：`5676983308`）
2. 验证码输入：`123456`（开发模式固定验证码）
3. 测试登录和登出

### 4. 构建 iOS 测试版

```bash
# 确保已经配置了 EAS
eas build --platform ios --profile preview
```

### 5. 通过 TestFlight 分发

1. 上传构建到 App Store Connect
2. 添加测试用户到 TestFlight
3. 发送测试邀请

## 环境变量

在 Railway Dashboard → Variables 中确保设置了：

- ❌ `NODE_ENV` - **不要设置**（这样开发模式验证码 123456 可用）
- ✅ `JWT_SECRET=你的密钥` - 必须设置
- ⚠️ `PORT` - Railway 自动设置，无需手动配置

## 开发模式验证码

当前部署支持开发模式验证码 `123456`，因为代码检查的是 `NODE_ENV !== 'production'`。

**重要**：
- ✅ **不要设置 `NODE_ENV=production`**，这样验证码 `123456` 才能工作
- ⚠️ 如果已经设置了 `NODE_ENV=production`，请在 Railway Dashboard → Variables 中删除它
- ⚠️ 这只是临时设置，用于测试阶段
- ⚠️ 正式发布前，建议设置 `NODE_ENV=production` 并集成真实的短信服务（Twilio）

## 测试账号

| 手机号 | 验证码 | 状态 |
|--------|--------|------|
| 567-698-3308 | 123456 | 需要添加到数据库 |
| 626-227-4460 | 123456 | 需要添加到数据库 |
| 562-291-9164 | 123456 | 需要添加到数据库 |
| 626-399-9536 | 123456 | 需要添加到数据库 |
| 949-516-1377 | 123456 | 需要添加到数据库 |

## 监控和日志

- **查看日志**: Railway Dashboard → Deployments → 点击最新部署 → Logs
- **监控**: Railway Dashboard → Metrics
- **环境变量**: Railway Dashboard → Variables

## 故障排除

### API 返回错误

1. 检查 Railway 日志
2. 验证数据库是否已初始化
3. 确认环境变量已设置

### 前端无法连接

1. 确认 `app/.env` 文件存在且包含正确的 URL
2. 重启 Expo: `npx expo start --clear`
3. 检查网络连接

### 登录失败

1. 确认用户已添加到数据库
2. 检查验证码是否为 `123456`（开发模式）
3. 查看 Railway 日志中的错误信息


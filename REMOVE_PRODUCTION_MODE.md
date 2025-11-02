# 移除生产模式设置（启用开发验证码 123456）

## 目的

移除 `NODE_ENV=production` 环境变量，让开发模式验证码 `123456` 可以在 Railway 上使用。

## 操作步骤

### 在 Railway Dashboard 中删除 NODE_ENV 变量

1. **登录 Railway Dashboard**：
   - 访问：https://railway.app
   - 进入你的项目

2. **进入服务设置**：
   - 点击你的服务（Service）
   - 点击 **"Variables"** 标签页

3. **删除 NODE_ENV 变量**：
   - 找到 `NODE_ENV` 这一行
   - 点击右侧的 **垃圾桶图标** 🗑️ 或 **"Delete"** 按钮
   - 确认删除

4. **重新部署（如果需要）**：
   - Railway 通常会自动重新部署
   - 如果没有自动重新部署，点击 **"Deployments"** → **"Redeploy"**

## 验证

删除 `NODE_ENV=production` 后，验证码 `123456` 应该可以正常工作了。

测试登录：

```bash
curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15676983308", "code": "123456"}'
```

如果返回成功，说明开发模式验证码已启用。

## 保留的环境变量

删除后，确保以下变量仍然存在：

- ✅ `JWT_SECRET` - JWT 签名密钥（必须保留）
- ❌ `NODE_ENV` - 已删除（这样验证码 123456 可用）
- ⚠️ `PORT` - Railway 自动设置，无需手动配置

## 注意事项

- ⚠️ 开发模式验证码 `123456` 现在对所有用户都可用
- ⚠️ 这只是临时设置，用于测试阶段
- ⚠️ 正式发布前，建议重新设置 `NODE_ENV=production` 并集成真实的短信服务（Twilio）


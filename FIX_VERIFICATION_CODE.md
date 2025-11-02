# 修复验证码 123456 问题

## 问题

即使删除了 `NODE_ENV=production`，验证码 123456 仍然不工作。

## 解决方案

我已经修改了代码，现在有两种方式确保开发验证码可用：

### 方法 1: 设置环境变量（推荐）

在 Railway Dashboard → Variables 中添加：

```env
ALLOW_DEV_CODE=true
```

这样无论 `NODE_ENV` 是什么，验证码 123456 都可以使用。

### 方法 2: 确认删除 NODE_ENV

确保 Railway Dashboard → Variables 中**没有** `NODE_ENV` 变量。

## 修改说明

代码已经更新，现在检查：
- `NODE_ENV !== 'production'` **或者**
- `ALLOW_DEV_CODE !== 'false'`（默认是 true）

这意味着即使 `NODE_ENV=production`，只要 `ALLOW_DEV_CODE` 不为 `false`，验证码 123456 就可以使用。

## 操作步骤

1. **提交并推送代码**（如果使用 Git）：
   ```bash
   git add server/routes/auth.js server/index.js
   git commit -m "Add ALLOW_DEV_CODE support for dev verification code"
   git push
   ```

2. **或者直接在 Railway 中更新**：
   - Railway 应该会自动检测到代码变化并重新部署

3. **在 Railway Dashboard → Variables 中添加**：
   ```
   ALLOW_DEV_CODE=true
   ```

4. **等待重新部署完成**

5. **测试验证码**：
   ```bash
   curl -X POST https://church-app-production-68eb.up.railway.app/api/auth/verify-code \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15676983308", "code": "123456"}'
   ```

## 验证

部署后，访问调试端点查看环境变量：

```bash
curl https://church-app-production-68eb.up.railway.app/api/debug-env
```

应该显示：
- `isDevMode: true`
- `ALLOW_DEV_CODE: true`（如果设置了）

## 注意事项

- ⚠️ 这是临时方案，用于测试阶段
- ⚠️ 正式发布前，建议设置 `ALLOW_DEV_CODE=false` 并集成真实的短信服务


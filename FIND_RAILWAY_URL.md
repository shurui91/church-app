# 如何找到 Railway 部署的 URL

## 方法 1: 在 Railway Dashboard 查看（最简单）

### 步骤：

1. **登录 Railway Dashboard**：
   - 访问：https://railway.app
   - 登录你的账号

2. **进入你的项目**：
   - 点击你的项目（church-in-cerritos）

3. **查看服务设置**：
   - 点击你的服务（通常是项目名称）
   - 在服务页面中，你会看到：
     - **Settings** 标签页
     - **Domains** 部分

4. **生成或查看域名**：
   - 在 **Settings** → **Domains** 中
   - 如果没有域名，点击 **"Generate Domain"**
   - Railway 会自动生成一个类似这样的 URL：
     - `https://your-service-name.up.railway.app`
     - 或 `https://your-project-name-production.up.railway.app`

## 方法 2: 在部署日志中查看

1. 在 Railway Dashboard 中
2. 点击项目 → **Deployments**
3. 点击最新的部署
4. 查看 **Logs**
5. 在日志中查找类似这样的信息：
   ```
   Server is running on port 3000
   ```

## 方法 3: 使用 Railway CLI

如果你安装了 Railway CLI：

```bash
railway status
```

或者：

```bash
railway domain
```

## 方法 4: 检查环境变量

在 Railway Dashboard → **Variables** 中，Railway 可能会自动设置一个环境变量，如：
- `RAILWAY_PUBLIC_DOMAIN`

## 关于 Docker 命令

你看到的这个 Docker 命令：
```bash
docker run -it production-asia-southeast1-eqsg3a.railway-registry.com/0b90249f-7290-4d34-bb79-245a2e020616:eaed0c48-a59d-4b42-8631-78bc6bd66efc
```

这是 Railway 的**内部容器镜像地址**，不是公网 URL。这个命令是在本地运行 Railway 的容器镜像，通常用于调试。

**要获取公网访问 URL**，必须在 Railway Dashboard 中：
1. 找到你的服务
2. 在 Settings → Domains 中生成域名
3. 使用生成的域名访问你的 API

## 验证部署是否成功

获取 URL 后，测试：

1. **健康检查**：
   ```
   https://your-app.up.railway.app/health
   ```

2. **API 根路径**：
   ```
   https://your-app.up.railway.app/
   ```

3. **测试登录**（使用开发模式验证码）：
   ```bash
   curl -X POST https://your-app.up.railway.app/api/auth/verify-code \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+15676983308", "code": "123456"}'
   ```

## 如果没有看到域名选项

1. 确保服务已经成功部署（绿色状态）
2. 检查服务配置：
   - Root Directory 设置为 `server`
   - Start Command 是 `npm start`
3. 如果还是没有，Railway 可能需要一些时间生成域名，稍等片刻刷新页面

## 配置自定义域名（可选）

如果你有自己的域名，可以在 Settings → Domains 中添加自定义域名。


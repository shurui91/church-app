# 修复连接问题

## 问题诊断

错误："无法连接到服务器，请检查后端服务是否运行"

可能的原因：
1. ✅ `.env` 文件位置不正确（应该在项目根目录）
2. ⚠️ Expo 没有加载环境变量（需要重启）
3. ⚠️ CORS 问题
4. ⚠️ API URL 配置问题

## 解决方案

### 1. 确保 .env 文件在正确位置

**Expo 需要 `.env` 文件在项目根目录**，而不是 `app/` 目录。

✅ **正确**：`/Users/user/Downloads/church-in-cerritos/.env`
❌ **错误**：`/Users/user/Downloads/church-in-cerritos/app/.env`

### 2. 已创建的修复

我已经将 `.env` 文件复制到项目根目录。

### 3. 重启 Expo（重要！）

```bash
# 停止当前的 Expo（Ctrl+C）

# 清除缓存并重新启动
cd /Users/user/Downloads/church-in-cerritos
npx expo start --clear
```

### 4. 验证环境变量是否加载

重启后，在控制台中应该看到：
```
🔗 API_BASE_URL: https://church-app-production-68eb.up.railway.app
🔗 EXPO_PUBLIC_API_URL env var: https://church-app-production-68eb.up.railway.app
```

如果还是显示 `http://localhost:3000`，说明环境变量没有加载。

## 如果环境变量仍然无法加载

### 方法 1: 安装 dotenv（如果 Expo 版本需要）

```bash
npm install dotenv
```

### 方法 2: 直接在 app.json 中配置（不推荐，但可行）

在 `app.json` 中添加：
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://church-app-production-68eb.up.railway.app"
    }
  }
}
```

然后在代码中使用 `expo-constants`：
```typescript
import Constants from 'expo-constants';
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
```

### 方法 3: 检查 Metro 缓存

```bash
# 清除所有缓存
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

## 验证步骤

1. **检查 .env 文件位置**：
   ```bash
   ls -la /Users/user/Downloads/church-in-cerritos/.env
   ```

2. **检查内容**：
   ```bash
   cat .env
   ```

3. **重启 Expo**：
   ```bash
   npx expo start --clear
   ```

4. **查看控制台日志**：
   - 应该看到 `🔗 API_BASE_URL: https://church-app-production-68eb.up.railway.app`

5. **测试连接**：
   - 在 app 中输入手机号
   - 应该不再显示连接错误

## 其他可能的问题

### CORS 问题

如果 API 可以访问但请求失败，可能是 CORS 问题。检查 `server/index.js` 中：
```javascript
app.use(cors()); // 应该允许所有来源
```

### iOS Simulator 网络问题

确保：
- iOS Simulator 可以访问互联网
- 没有网络限制
- 可以访问 https://church-app-production-68eb.up.railway.app

### 查看详细错误

在 React Native 调试器中查看完整错误信息：
- 打开开发者菜单（Cmd+D）
- 查看日志输出


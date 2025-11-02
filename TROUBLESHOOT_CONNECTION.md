# 连接问题排查和修复

## 问题
App 显示 "无法连接到服务器，请检查后端服务是否运行"

## 已完成的修复

1. ✅ **`.env` 文件已复制到项目根目录**
   - 之前：`app/.env`（错误位置）
   - 现在：`项目根目录/.env`（正确位置）

2. ✅ **API 正常工作**
   - Railway API: `https://church-app-production-68eb.up.railway.app`
   - 测试结果：✅ 正常响应

3. ✅ **数据库正常**
   - 用户已添加
   - 测试结果：`isWhitelisted: true`

## 解决方案步骤

### 1. 重启 Expo（清除缓存）

```bash
# 停止当前 Expo（Ctrl+C）

# 清除缓存并重启
cd /Users/user/Downloads/church-in-cerritos
npx expo start --clear
```

### 2. 验证环境变量加载

重启后，查看控制台日志。应该看到：
```
🔗 API_BASE_URL: https://church-app-production-68eb.up.railway.app
🔗 EXPO_PUBLIC_API_URL env var: https://church-app-production-68eb.up.railway.app
```

如果显示 `http://localhost:3000`，说明环境变量没有加载。

### 3. 如果环境变量仍然无法加载

**选项 A: 使用 expo-constants（推荐）**

修改 `app/src/services/api.ts`：
```typescript
import Constants from 'expo-constants';

const API_BASE_URL = 
  Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://localhost:3000';
```

然后在 `app.json` 中添加：
```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://church-app-production-68eb.up.railway.app"
    }
  }
}
```

**选项 B: 硬编码（仅用于测试）**

临时修改 `app/src/services/api.ts`：
```typescript
const API_BASE_URL = 'https://church-app-production-68eb.up.railway.app';
```

### 4. 检查网络和 CORS

确保：
- iOS Simulator 可以访问互联网
- 后端 CORS 配置允许所有来源（已配置：`app.use(cors())`）

## 验证清单

- [ ] `.env` 文件在项目根目录
- [ ] `.env` 内容正确：`EXPO_PUBLIC_API_URL=https://church-app-production-68eb.up.railway.app`
- [ ] 已重启 Expo 并清除缓存
- [ ] 控制台日志显示正确的 API URL
- [ ] API 可以访问（curl 测试成功）
- [ ] 数据库中已有用户

## 下一步

1. 重启 Expo：`npx expo start --clear`
2. 检查控制台日志中的 API URL
3. 测试登录功能
4. 如果还有问题，尝试选项 A 或 B


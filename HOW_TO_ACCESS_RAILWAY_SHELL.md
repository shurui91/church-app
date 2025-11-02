# 如何访问 Railway Shell

## 步骤详解

### 1. 登录 Railway Dashboard

访问：https://railway.app

### 2. 选择你的项目

在 Dashboard 中，点击你的项目（`church-in-cerritos`）

### 3. 进入服务（Service）

- 在项目页面中，你会看到一个或多个服务
- 点击你的服务（通常是项目名称或 "Web Service"）
- 如果没有看到服务，可能需要先创建一个

### 4. 找到 Shell 标签页

在服务页面顶部，你会看到多个标签页：
- **Deployments** - 部署历史
- **Metrics** - 性能指标
- **Logs** - 日志
- **Variables** - 环境变量
- **Settings** - 设置
- **Shell** - ⭐ **这就是你要找的！**

点击 **"Shell"** 标签页。

### 5. 使用 Shell

点击后，会打开一个终端界面，你可以直接输入命令。

## 界面位置说明

Railway 的 Shell 可能在以下位置：

1. **服务页面顶部** - 标签栏中
2. **侧边栏** - 如果是移动端或紧凑视图
3. **三点菜单（...）** - 如果 Shell 选项在更多菜单中

## 如果找不到 Shell 选项

### 可能的原因：

1. **服务类型不支持 Shell**：
   - 确保你的服务是 "Web Service" 或 "Private Service"
   - 某些服务类型可能不提供 Shell

2. **权限问题**：
   - 确保你是项目的所有者或有足够的权限

3. **界面更新**：
   - Railway 可能更新了界面，Shell 可能在新的位置
   - 尝试查找 "Terminal"、"Console" 或 "CLI" 等类似选项

### 替代方法：使用 Railway CLI

如果找不到 Shell，可以使用 Railway CLI：

1. **安装 Railway CLI**：
   ```bash
   npm install -g @railway/cli
   ```

2. **登录**：
   ```bash
   railway login
   ```

3. **链接到项目**：
   ```bash
   railway link
   ```

4. **连接 Shell**：
   ```bash
   railway shell
   ```

## 可视化指南

Railway Dashboard 结构：
```
Dashboard
└── Your Project (church-in-cerritos)
    └── Service
        ├── Deployments [标签页]
        ├── Metrics [标签页]
        ├── Logs [标签页]
        ├── Variables [标签页]
        ├── Settings [标签页]
        └── Shell [标签页] ⭐
```

## 快速检查清单

- [ ] 已登录 Railway Dashboard
- [ ] 已选择正确的项目
- [ ] 已进入服务（Service）页面
- [ ] 在顶部标签栏中查找 "Shell"
- [ ] 如果找不到，尝试 Railway CLI

## 使用 Shell 的常见操作

进入 Shell 后，你会看到一个终端提示符，可以运行：

```bash
# 查看当前目录
pwd

# 进入 server 目录
cd server

# 运行脚本
node scripts/list-users.js
```


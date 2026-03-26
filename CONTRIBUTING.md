# 贡献指南

感谢你对 JobInsight AI 的兴趣！我们欢迎各种形式的贡献。

## 如何贡献

### 报告 Bug

1. 使用 GitHub Issues 提交
2. 描述问题发生的步骤
3. 提供浏览器版本和操作系统信息
4. 如果可能，提供截图

### 提交功能请求

1. 使用 GitHub Issues 提交
2. 清晰描述功能的使用场景
3. 如果可能，提供 UI 草图或示例

### 提交代码

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 开发规范

### 代码风格

- 使用 TypeScript 严格模式
- 遵循现有的代码格式
- 添加必要的注释

### 提交信息规范

```
type(scope): subject

body (optional)

footer (optional)
```

类型：
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(analyze): 添加岗位薪资分析功能

增加对薪资范围的智能解析和评估
```

## 开发流程

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev

# 构建检查
npm run build
```

## 问题交流

如有疑问，欢迎通过 GitHub Discussions 交流。

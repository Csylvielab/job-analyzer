# JobInsight AI - 智能求职分析平台

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCsylvielab%2Fjob-analyzer&env=DEEPSEEK_API_KEY&envDescription=AI%20API%20Key%20for%20analysis&envLink=https%3A%2F%2Fplatform.deepseek.com%2F)

AI 驱动的智能求职分析工具，帮助求职者深度了解目标岗位，做出最佳职业决策。

![预览图](./screenshot.png)

## ✨ 功能特点

### 🔍 岗位深度分析
- **公司画像**：公司现状、融资动态、行业地位
- **岗位解读**：真实工作内容、KPI、团队氛围
- **人才画像**：门槛要求、素质模型、加分项、风险提示
- **综合评估**：匹配度评分、投递建议、准备策略

### 📊 简历智能评估
- **五维雷达图**：技能、经验、行业背景、软实力、教育
- **匹配度分析**：简历与岗位的契合程度
- **短板识别**：明确差距，有的放矢

### ✍️ 简历优化建议
- **针对性优化**：基于具体岗位定制优化方案
- **内容重写**：AI 辅助改写简历内容
- **关键词优化**：提升通过筛选系统的概率

### 📁 简历档案管理
- 支持上传 .docx 格式简历
- 多份简历管理切换
- 本地存储，隐私安全

### 🔄 岗位对比
- 同时对比两个岗位
- 多维度优劣分析
- 辅助决策最佳机会

## 🚀 快速开始

### 方式一：一键部署到 Vercel（推荐）

点击上方 "Deploy with Vercel" 按钮，按提示完成部署：

1. Fork 本仓库
2. 在 Vercel 中配置 `DEEPSEEK_API_KEY` 环境变量
3. 部署完成即可使用

### 方式二：本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/Csylvielab/job-analyzer.git
cd job-analyzer

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，添加你的 DeepSeek API Key

# 4. 启动开发服务器
npm run dev

# 5. 访问 http://localhost:3000
```

## 🔑 获取 API Key

本项目使用 DeepSeek API 进行 AI 分析：

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com/)
2. 注册账号
3. 创建 API Key
4. 将 Key 配置到环境变量

> 新用户有免费额度，足够体验和开发使用

## 📁 项目结构

```
job-analyzer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analyze/        # 岗位分析 API
│   │   │   ├── compare/        # 岗位对比 API
│   │   │   ├── evaluate/       # 简历评估 API
│   │   │   └── optimize-resume/# 简历优化 API
│   │   ├── page.tsx            # 主界面
│   │   └── layout.tsx          # 根布局
│   ├── components/
│   │   └── ui/                 # shadcn/ui 组件
│   └── lib/
│       ├── hooks.ts            # 状态管理 hooks
│       ├── prompts.ts          # AI Prompt 模板
│       └── search.ts           # 搜索服务 (mock)
├── .env.example                # 环境变量示例
└── README.md
```

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **AI**: [DeepSeek API](https://platform.deepseek.com/) via [Vercel AI SDK](https://sdk.vercel.ai/)
- **图表**: [Recharts](https://recharts.org/)
- **文档解析**: [Mammoth](https://github.com/mwilliamson/mammoth.js)

## 🔧 自定义配置

### 接入真实搜索（可选）

默认使用模拟搜索数据，可替换为真实搜索 API：

编辑 `src/lib/search.ts`，接入以下服务之一：
- [SerpAPI](https://serpapi.com/)
- [Tavily](https://tavily.com/)
- [Bing Search API](https://www.microsoft.com/en-us/bing/apis/bing-web-search-api)

### 切换 AI 模型

支持替换为其他兼容 OpenAI 接口的模型：

```typescript
// src/app/api/analyze/route.ts
import { openai } from '@ai-sdk/openai';

const model = openai('gpt-4');
```

## 📸 截图

| 岗位分析 | 简历评估 | 简历优化 |
|---------|---------|---------|
| ![分析](./docs/analyze.png) | ![评估](./docs/evaluate.png) | ![优化](./docs/optimize.png) |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](./LICENSE)

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！

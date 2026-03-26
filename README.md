# JobInsight AI - 智能求职分析平台

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCsylvielab%2Fjob-analyzer)

AI 驱动的智能求职分析工具，帮助求职者深度了解目标岗位，做出最佳职业决策。

<img width="2954" height="1390" alt="image" src="https://github.com/user-attachments/assets/fb75f667-a694-4911-aa92-0295af78f4ff" />

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
2. 在 Vercel 中部署
3. 部署完成后在网页上点击「设置」配置 AI 提供商和 API Key

### 方式二：本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/Csylvielab/job-analyzer.git
cd job-analyzer

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:3000
# 5. 点击右上角「设置」选择 AI 提供商并配置 API Key
```

## 🔑 支持的 AI 提供商

本项目支持多个 AI 提供商，你可以在网页设置中自由选择：

| 提供商 | 模型 | 获取 API Key |
|--------|------|-------------|
| **DeepSeek** | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com/) |
| **OpenAI** | GPT-4 | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Claude** | claude-3-sonnet | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| **Moonshot** | moonshot-v1-8k | [platform.moonshot.cn](https://platform.moonshot.cn/) |
| **Gemini** | gemini-1.5-pro | [Google AI Studio](https://aistudio.google.com/app/apikey) |

> 💡 **提示**：大多数提供商都有免费额度，足够日常使用。在网页上点击「设置」即可随时切换提供商。

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
- **AI**: 支持 DeepSeek, OpenAI, Claude, Moonshot, Gemini via [Vercel AI SDK](https://sdk.vercel.ai/)
- **图表**: [Recharts](https://recharts.org/)
- **文档解析**: [Mammoth](https://github.com/mwilliamson/mammoth.js)

## 🔧 自定义配置

### 接入真实搜索（可选）

默认使用模拟搜索数据，可替换为真实搜索 API：

编辑 `src/lib/search.ts`，接入以下服务之一：
- [SerpAPI](https://serpapi.com/)
- [Tavily](https://tavily.com/)
- [Bing Search API](https://www.microsoft.com/en-us/bing/apis/bing-web-search-api)

### 切换 AI 提供商

无需修改代码，直接在网页上切换：

1. 点击右上角 **⚙️ 设置** 按钮
2. 选择你喜欢的 AI 提供商（DeepSeek / OpenAI / Claude / Moonshot / Gemini）
3. 输入对应的 API Key
4. 点击保存即可使用

API Key 和提供商偏好会保存在浏览器本地存储中，切换时自动生效。

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

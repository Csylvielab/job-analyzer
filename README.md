# JobAnalyzer AI - 智能求职分析平台

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCsylvielab%2Fjob-analyzer)

💡 为什么选择 JobInsight AI？

“投递机会是有限的，别把子弹浪费在不适合的‘坑’里。”

JobAnalyzer 是一款AI 驱动的智能求职分析工具，帮助求职者深度了解目标岗位，做出最佳职业决策。

⚡️ 零 Prompt 负担：内置专家级分析链路，粘贴 JD 即可获得深度内参，无需再调优长串指令。深度还原并推断岗位释出背景、岗位日常工作和岗位发展前景。

🔒 隐私主权归你：支持接入个人 API，所有分析数据本地化处理，简历隐私绝不外流。

🧠 选择困难症的【PK 模式】：

·背书比拼：哪份履历对下一跳跳槽大厂更有利？

·成长对撞：哪个岗位的技能栈曲线更陡峭、更有护城河？

·红旗警示：基于行业常态与舆情，谁的加班风险和业务波动更高？

对比完再投，让你的每一次点击，都拥有 80% 以上的胜算。


<img width="2954" height="1390" alt="image" src="https://github.com/user-attachments/assets/fb75f667-a694-4911-aa92-0295af78f4ff" />

## ✨ 功能特点

### 🔍 岗位深度分析
- **公司画像**：公司现状、融资动态、行业地位
- **岗位解读**：真实工作内容、KPI、团队氛围
- **人才画像**：门槛要求、素质模型、加分项、风险提示
- **综合评估**：匹配度评分、投递建议、准备策略

### 📊 简历智能评估
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

## 🚀 5 分钟快速部署

### ☁️ 一键部署到 Vercel（免费）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FCsylvielab%2Fjob-analyzer)

只需 3 步，拥有自己的求职分析工具：

**Step 1.** 点击上方 "Deploy with Vercel" 按钮
**Step 2.** 用 GitHub 登录 Vercel（免费）
**Step 3.** 部署完成后，打开网址 → 点击右上角「设置」→ 填入 API Key → 开箱即用

> 💡 **零门槛**：不需要懂代码，不需要服务器，Vercel 免费套餐完全够用。

### 💻 本地开发

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

| 提供商 | 模型 | 获取 API Key | 备注 |
|--------|------|-------------|------|
| **DeepSeek** | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com/) | |
| **OpenAI** | GPT-4o | [platform.openai.com](https://platform.openai.com/api-keys) | |
| **Claude** | claude-3-sonnet | [console.anthropic.com](https://console.anthropic.com/settings/keys) | |
| **Moonshot** | moonshot-v1-8k | [platform.moonshot.cn](https://platform.moonshot.cn/) | |
| **Gemini** | gemini-1.5-pro | [Google AI Studio](https://aistudio.google.com/app/apikey) | |
| **Perplexity** | sonar-pro | [perplexity.ai](https://www.perplexity.ai/settings/api) | ⭐ 内置搜索功能 |

> 💡 **提示**：大多数提供商都有免费额度，足够日常使用。**Perplexity** 支持内置搜索，分析更实时。在网页上点击「设置」即可随时切换提供商。

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
│       └── search.ts           # 搜索服务（Mock/SerpAPI/Bing）
├── .env.example                # 环境变量示例
└── README.md
```

## 🛠️ 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **AI**: 支持 DeepSeek, OpenAI, Claude, Moonshot, Gemini, Perplexity via [Vercel AI SDK](https://sdk.vercel.ai/)
- **图表**: [Recharts](https://recharts.org/)
- **文档解析**: [Mammoth](https://github.com/mwilliamson/mammoth.js)

## 🔧 自定义配置

### 接入真实搜索（可选）

在网页「设置」中可直接配置搜索 API，无需修改代码：

1. 点击右上角 **⚙️ 设置**
2. 在「搜索 API」区域选择 SerpAPI 或 Bing
3. 填入对应的 API Key 并保存

| 搜索服务 | 免费额度 | 获取方式 |
|---------|---------|---------|
| **Perplexity** | - | 选择 Perplexity 作为 AI 提供商即可自动联网搜索 |
| SerpAPI | 100次/月 | [serpapi.com](https://serpapi.com/) |
| Bing Search | 1000次/月 | [Azure Portal](https://portal.azure.com) 创建 Bing Search 资源 |

> 💡 **推荐**：直接选择 **Perplexity** 作为 AI 提供商，天然内置搜索能力，无需额外配置搜索服务。

### 切换 AI 提供商

无需修改代码，直接在网页上切换：

1. 点击右上角 **⚙️ 设置** 按钮
2. 选择你喜欢的 AI 提供商（DeepSeek / OpenAI / Claude / Moonshot / Gemini / Perplexity）
3. 输入对应的 API Key
4. 点击保存即可使用

API Key 按提供商独立保存，切换时自动加载对应 Key。


## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](./LICENSE)

---

如果这个项目对你有帮助，请给个 ⭐ Star 支持一下！

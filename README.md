# 岗位分析助手

AI 驱动的智能求职分析工具，输入公司和岗位，自动生成深度岗位分析报告。

## 功能特点

- **四层分析框架**：
  1. 岗位基础画像（公司现状、部门归属、业务定位）
  2. 真实工作内容还原（职责、KPI、工作状态）
  3. 人才画像深度挖掘（门槛、素质、加分项、风险提示）
  4. 综合评估（评分、投递建议、准备策略）

- **智能搜索**：自动搜索公司融资动态、舆情、业务动态、招聘趋势
- **流式输出**：AI 分析结果实时展示
- **JD 支持**：可粘贴完整岗位描述进行精准分析

## 技术栈

- **框架**: Next.js 16 + React 19 + TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **AI**: DeepSeek API (通过 Vercel AI SDK)
- **搜索**: Mock 数据（可替换为真实搜索 API）

## 快速开始

### 1. 安装依赖

```bash
cd ~/code/job-analyzer
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，添加你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

获取 API Key：[DeepSeek 开放平台](https://platform.deepseek.com/)

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
job-analyzer/
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts    # AI 分析 API
│   │   ├── page.tsx                 # 主界面
│   │   └── layout.tsx               # 根布局
│   ├── components/ui/               # shadcn 组件
│   ├── lib/
│   │   ├── prompts.ts               # AI Prompt 模板
│   │   ├── search.ts                # 搜索服务 (mock)
│   │   └── utils.ts                 # 工具函数
│   └── ...
├── .env.example                     # 环境变量示例
└── README.md
```

## 后续优化方向

1. **接入真实搜索**：替换 `src/lib/search.ts` 中的 mock 数据为真实搜索 API
   - 推荐：SerpAPI、Bing Search API、Tavily

2. **历史记录**：添加分析历史保存功能

3. **结果导出**：支持导出 PDF 或 Markdown 格式的报告

4. **更多 AI 模型**：支持切换不同 AI 模型（OpenAI、Claude 等）

## License

MIT

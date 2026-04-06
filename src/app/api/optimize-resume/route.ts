import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

// 创建 DeepSeek provider
function getAIProvider(apiKey: string, provider: string) {
  const key = apiKey || '';
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey: key || process.env.OPENAI_API_KEY || '' });
    case 'anthropic':
      return createAnthropic({ apiKey: key || process.env.ANTHROPIC_API_KEY || '' });
    case 'moonshot':
      return createMoonshotAI({ apiKey: key || process.env.MOONSHOT_API_KEY || '' });
    case 'gemini':
      return createGoogleGenerativeAI({ apiKey: key || process.env.GEMINI_API_KEY || '' });
    case 'perplexity':
      return createOpenAI({ apiKey: key || process.env.PERPLEXITY_API_KEY || '', baseURL: 'https://api.perplexity.ai' });
    case 'deepseek':
    default:
      return createDeepSeek({ apiKey: key || process.env.DEEPSEEK_API_KEY || '' });
  }
}

// 简历优化系统 prompt
const OPTIMIZE_SYSTEM_PROMPT = `你是一位资深的职业顾问和简历优化专家，拥有超过15年的求职辅导经验。

你的核心能力：
- 精准提炼岗位JD的关键要求
- 在不改变原意的前提下优化简历表达
- 保持简历原结构，只做精准润色

你的工作原则：
- 保持诚实：不编造经历，只优化表达方式
- 精准匹配：针对JD关键词进行点对点优化
- 最小改动：尽量贴合原句结构和描述，只修改必要部分
- 格式统一：每句经历前的总结控制在4-6个字
- **客观中立，拒绝迎合**：优化建议必须基于简历实际内容，不为讨好用户而刻意美化。若简历确有短板，如实指出；若确有亮点，精准提炼。永远说真话，不说用户想听的话。`;

// 构建简历优化 prompt（支持已解析的岗位信息和已分析的深度报告）
function buildOptimizePrompt(resume: string, jobText: string, jobInfo?: { company?: string; position?: string; jd?: string; analyzedContent?: string }): string {
  const jdContent = jobInfo?.jd || jobText;
  const header = jobInfo?.company || jobInfo?.position
    ? `**公司：** ${jobInfo.company || '未知公司'}\n**岗位：** ${jobInfo.position || '未知职位'}\n\n`
    : '';
  const analyzedSection = jobInfo?.analyzedContent
    ? `

## 🔍 深度岗位分析报告（已生成）

以下是该岗位的深度分析结果，优化时请结合该报告进行针对性调整：

${jobInfo.analyzedContent}

---
`
    : '';

  return `请根据以下目标岗位JD，对我的简历进行分析和优化。${analyzedSection}

## 目标岗位JD

${header}${jdContent}

---

## 我的原始简历

${resume}

---

请按以下结构输出：

## 🎯 JD核心要求分析

分析目标岗位的核心职责、关键技能和经验要求。

## 🔑 ATS关键词建议

列出建议在简历中增加或调整的关键词，以提高系统匹配度和ATS通过率。

## 👤 个人评价

针对职位要求和简历背景，写一段**50-100字**的个人评价/自我总结，要求：
- 突出与目标岗位高度匹配的核心优势
- 点明与JD要求对应的关键能力和经验亮点
- 体现个人特色和职业价值主张
- 语言专业、简洁有力、有记忆点

## ✨ 优化后的简历

**直接输出优化后的完整简历，格式要求：**

1. **关键词匹配优化**（核心要求）：
   - **必须**将JD中的核心关键词自然融入简历描述中
   - 如果JD要求不明确，则分析公司业务/行业特点，增加相关契合度关键词
   - 关键词融入要自然流畅，不生硬堆砌
   - 优先在以下内容中植入关键词：技能列表、项目描述、职责描述

2. **Markdown格式美化**：
   - 姓名和标题使用 **粗体**
   - 公司和职位名称使用 **粗体**
   - 时间段使用 *斜体* 或常规字体
   - 核心成果使用 **粗体** 突出

3. **经历描述格式**：
   - 每段经历使用 bullet point 列表
   - 每句以 **4-6字总结** 开头，后跟冒号
   - 示例：
     - **用户增长**：通过数据分析优化产品功能，**DAU提升30%**
     - **跨部门协作**：协调设计、开发团队，**主导3个核心功能上线**

4. **保持原结构**：
   - 不改变简历的整体板块顺序
   - 尽量贴合原句的结构和描述
   - 只修改与JD不匹配的表述
   - 针对JD关键词点对点优化

5. **排版要求**：
   - 板块之间使用空行分隔
   - 列表项对齐统一
   - 重点数据 **加粗** 显示`;
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('X-API-Key') || '';
    const aiProvider = req.headers.get('X-AI-Provider') || 'deepseek';
    const { resume, jobText, jobInfo } = await req.json() as { resume: string; jobText?: string; jobInfo?: { company?: string; position?: string; jd?: string; analyzedContent?: string } };

    const rawJobText = jobText || '';

    if (!resume || !resume.trim()) {
      return Response.json(
        { error: '请先选择或上传简历' },
        { status: 400 }
      );
    }

    if (!rawJobText && !jobInfo?.jd) {
      return Response.json(
        { error: '请输入岗位信息' },
        { status: 400 }
      );
    }

    console.log('[API] 收到简历优化请求');
    console.log('[API] 简历长度:', resume.length);
    console.log('[API] 岗位信息长度:', (rawJobText || jobInfo?.jd || '').length);

    const userPrompt = buildOptimizePrompt(resume, rawJobText, jobInfo);

    // 流式返回优化结果
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const result = await streamText({
          model: (() => {
        const provider = getAIProvider(apiKey, aiProvider);
        switch (aiProvider) {
          case 'openai':
            return provider('gpt-4o');
          case 'anthropic':
            return provider('claude-3-sonnet-20240229');
          case 'moonshot':
            return provider('moonshot-v1-8k');
          case 'gemini':
            return provider('gemini-1.5-pro');
          case 'perplexity':
            return provider('sonar-pro');
          case 'deepseek':
          default:
            return provider('deepseek-chat');
        }
      })(),
          system: OPTIMIZE_SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.7,
        });

        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }

        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (error) {
    console.error('Optimize error:', error);
    return Response.json(
      { error: '简历优化过程中出现错误，请稍后重试' },
      { status: 500 }
    );
  }
}

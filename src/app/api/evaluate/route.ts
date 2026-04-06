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

// 构建简历评估 prompt
function buildEvaluatePrompt(resume: string, jobInfo: {
  company: string;
  position: string;
  jd: string;
}): string {
  return `请作为一名在相关行业拥有超过20年经验的资深招聘经理，严格依据以下职位的要求，对候选人的简历进行深度评估。

## 职位信息

**公司名称：** ${jobInfo.company}
**职位名称：** ${jobInfo.position}

**职位描述：**
${jobInfo.jd}

---

## 候选人简历

${resume}

---

请按以下结构输出评估报告：

## 📋 关键资格分析

### 硬技能
识别并列出简历中与职位描述最匹配的关键技术、工具和专业知识。

### 软技能
评估简历中体现出的领导力、解决问题能力、沟通和团队协作能力。

### 经验匹配度
分析其工作经历与项目经验是否与岗位要求高度相关。

### 加分项
指出行业认证、专业领域的深度以及对候选人独特优势的塑造。

---

## 🎯 综合评估与风险提示

### 亮点总结
总结是什么让这位候选人脱颖而出。

### 潜在风险 (Red Flags)
指出简历中可能存在的疑虑或需要警惕的信号。

---

## 📊 总体匹配度评分

请给出0-100分的匹配度评分，并简要说明理由。
`;
}

// 简历评估系统 prompt
const EVALUATE_SYSTEM_PROMPT = `你是一名拥有超过20年经验的资深招聘经理，擅长深度分析候选人简历与职位的匹配度。

你的评估风格：
- 专业客观：基于事实进行分析，不带有个人偏见
- 深入细致：不仅看表面匹配，更关注深层能力
- 诚实直接：敢于指出问题和风险
- 建设性：提供有价值的反馈建议

评估时请特别注意：
1. 技能的真实性和深度（区分"了解"、"熟悉"、"精通"）
2. 工作经历的时间连贯性和合理性
3. 项目经验的具体贡献和成果
4. 职业发展轨迹的逻辑性
5. 潜在的风险信号（频繁跳槽、履历空白、夸大描述等）`;

export async function POST(req: Request) {
  try {
    // 获取 API Key from header
    const apiKey = req.headers.get('X-API-Key') || '';
    const aiProvider = req.headers.get('X-AI-Provider') || 'deepseek';
    // 获取用户输入
    const { resume, jobText } = await req.json();

    if (!resume || !resume.trim()) {
      return Response.json(
        { error: '请先输入简历内容' },
        { status: 400 }
      );
    }

    if (!jobText || !jobText.trim()) {
      return Response.json(
        { error: '请输入岗位信息' },
        { status: 400 }
      );
    }

    console.log('[API] 收到简历评估请求');
    console.log('[API] 简历长度:', resume.length);
    console.log('[API] 岗位信息长度:', jobText.length);

    // 简单解析岗位信息（提取公司和职位）
    const companyMatch = jobText.match(/公司名称[：:]\s*(.+)/);
    const positionMatch = jobText.match(/岗位名称[：:]\s*(.+)/);

    const company = companyMatch?.[1]?.trim() || '未知公司';
    const position = positionMatch?.[1]?.trim() || '未知职位';

    // 构建评估 prompt
    const userPrompt = buildEvaluatePrompt(resume, {
      company,
      position,
      jd: jobText,
    });

    // 选择模型
    const model = (() => {
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
    })();

    // 流式返回评估结果
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 调用 AI 生成评估报告
        const result = await streamText({
          model,
          system: EVALUATE_SYSTEM_PROMPT,
          prompt: userPrompt,
          temperature: 0.7,
        });

        // 流式转发 AI 响应
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
    console.error('Evaluation error:', error);
    return Response.json(
      { error: '评估过程中出现错误，请稍后重试' },
      { status: 500 }
    );
  }
}

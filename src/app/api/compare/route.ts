import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from '@/lib/prompts';

function getAIProvider(apiKey: string, provider: string) {
  const key = apiKey || '';
  switch (provider) {
    case 'openai':
      return createOpenAI({ apiKey: key || process.env.OPENAI_API_KEY || '' });
    case 'anthropic':
      return createAnthropic({ apiKey: key || process.env.ANTHROPIC_API_KEY || '' });
    case 'deepseek':
    default:
      return createDeepSeek({ apiKey: key || process.env.DEEPSEEK_API_KEY || '' });
  }
}

export async function POST(req: Request) {
  try {
    const apiKey = req.headers.get('X-API-Key') || '';
    const aiProvider = req.headers.get('X-AI-Provider') || 'deepseek';
    const { jobs } = await req.json();

    if (!jobs || !Array.isArray(jobs) || jobs.length !== 2) {
      return Response.json(
        { error: '请选择两个岗位进行对比' },
        { status: 400 }
      );
    }

    // 验证岗位数据
    for (const job of jobs) {
      if (!job.company || !job.position || !job.content) {
        return Response.json(
          { error: '岗位信息不完整' },
          { status: 400 }
        );
      }
    }

    const userPrompt = buildComparePrompt(jobs);

    const result = streamText({
      model: (() => {
        const provider = getAIProvider(apiKey, aiProvider);
        switch (aiProvider) {
          case 'openai':
            return provider('gpt-4');
          case 'anthropic':
            return provider('claude-3-sonnet-20240229');
          case 'deepseek':
          default:
            return provider('deepseek-chat');
        }
      })(),
      system: COMPARE_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Compare error:', error);
    return Response.json(
      { error: '对比分析过程中出现错误' },
      { status: 500 }
    );
  }
}

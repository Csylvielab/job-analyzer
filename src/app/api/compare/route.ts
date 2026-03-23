import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from '@/lib/prompts';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

export async function POST(req: Request) {
  try {
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
      model: deepseek('deepseek-chat'),
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

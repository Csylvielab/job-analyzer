import { streamText, generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { mockSearch } from '@/lib/search';
import { SYSTEM_PROMPT, PARSER_SYSTEM_PROMPT, buildUserPrompt } from '@/lib/prompts';

// 创建 AI provider (API Key and provider from request header)
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
    case 'deepseek':
    default:
      return createDeepSeek({ apiKey: key || process.env.DEEPSEEK_API_KEY || '' });
  }
}

// 常见的省份和城市名，需要过滤掉
const LOCATION_NAMES = new Set([
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆',
  '天津', '苏州', '长沙', '郑州', '东莞', '青岛', '昆明', '宁波', '合肥', '佛山',
  '福州', '沈阳', '济南', '厦门', '哈尔滨', '长春', '石家庄', '南宁', '贵阳', '南昌',
  '四川', '浙江', '广东', '江苏', '山东', '河南', '湖北', '湖南', '河北', '福建',
  '安徽', '陕西', '山西', '辽宁', '吉林', '黑龙江', '云南', '贵州', '广西', '江西',
  '甘肃', '青海', '宁夏', '西藏', '新疆', '内蒙古', '海南', '台湾', '香港', '澳门',
  '中国', '新区', '开发区', '高新区', '园区', '广场', '大厦', '中心', '大楼',
]);

// 过滤掉地址/省份，验证公司名
function validateCompanyName(company: string): string {
  if (!company) return '';

  // 如果公司名完全是地址，返回空
  if (LOCATION_NAMES.has(company)) return '';

  // 如果公司名以省份开头（如"四川极米科技"），提取后面的部分
  for (const loc of LOCATION_NAMES) {
    if (company.startsWith(loc) && company.length > loc.length) {
      // 返回去掉省份后的部分
      const remaining = company.slice(loc.length).trim();
      if (remaining) return remaining;
    }
  }

  return company;
}

// 解析用户输入
async function parseUserInput(rawText: string, apiKey: string, aiProvider: string): Promise<{
  company: string;
  position: string;
  jd: string;
  missingFields: string[];
  confidence: 'high' | 'medium' | 'low';
}> {
  const { text } = await generateText({
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
    system: PARSER_SYSTEM_PROMPT,
    prompt: `请从以下文本中提取公司和岗位信息：\n\n${rawText}`,
    temperature: 0.1,
  });

  try {
    // 尝试解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let company = parsed.company?.trim() || '';
      const position = parsed.position?.trim() || '';
      const jd = parsed.jd?.trim() || rawText;

      // 验证公司名，过滤掉地址/省份
      company = validateCompanyName(company);

      // 判断缺失字段
      const missingFields: string[] = [];
      if (!company) missingFields.push('公司名称');
      if (!position) missingFields.push('岗位名称');
      if (!jd || jd === rawText) missingFields.push('岗位描述');

      // 判断置信度
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (company && position) {
        confidence = missingFields.includes('岗位描述') ? 'medium' : 'high';
      } else if (company || position) {
        confidence = 'low';
      }

      return {
        company,
        position,
        jd,
        missingFields,
        confidence,
      };
    }
  } catch {
    // JSON 解析失败，尝试文本提取
  }

  // 如果 JSON 解析失败，做简单提取
  const companyMatch = rawText.match(/([\u4e00-\u9fa5]{2,10}(?:公司|集团|科技|网络|互联网))/);
  const positionMatch = rawText.match(/([\u4e00-\u9fa5]{2,10}(?:经理|工程师|专员|主管|总监|运营|产品|开发|设计))/);

  const extractedCompany = companyMatch ? companyMatch[1] : '';
  const company = validateCompanyName(extractedCompany);
  const position = positionMatch ? positionMatch[1] : '';

  const missingFields: string[] = [];
  if (!company) missingFields.push('公司名称');
  if (!position) missingFields.push('岗位名称');

  return {
    company,
    position,
    jd: rawText,
    missingFields,
    confidence: company && position ? 'medium' : 'low',
  };
}

export async function POST(req: Request) {
  try {
    // 获取 API Key and provider from header
    const apiKey = req.headers.get('X-API-Key') || '';
    const aiProvider = req.headers.get('X-AI-Provider') || 'deepseek';
    // 获取用户输入
    const { text: rawText } = await req.json();

    if (!rawText || !rawText.trim()) {
      return Response.json(
        { error: '请输入岗位信息' },
        { status: 400 }
      );
    }

    console.log('[API] 收到用户输入:', rawText.slice(0, 100) + '...');

    // 第一步：解析用户输入
    const { company, position, jd, missingFields, confidence } = await parseUserInput(rawText, apiKey, aiProvider);

    console.log('[API] 解析结果:', { company, position, missingFields, confidence });

    // 如果有重要字段缺失，返回警告信息
    if (!company || !position) {
      const missingList = missingFields.join('、');
      return Response.json(
        {
          error: `无法识别以下信息：${missingList}`,
          details: {
            missingFields,
            parsed: { company, position },
            suggestion: '请在输入中明确包含公司和岗位名称，例如：\n"字节跳动 产品经理" 或 "腾讯 - 后端开发工程师"',
          },
        },
        { status: 400 }
      );
    }

    // 如果置信度低，给出警告但仍继续
    if (confidence === 'low') {
      console.log('[API] 解析置信度较低，可能存在识别错误');
    }

    // 第二步：执行搜索（mock）
    const searchResults = await mockSearch(company);
    console.log('[API] 搜索结果已生成，公司:', company);

    // 第三步：构建分析 prompt
    const userPrompt = buildUserPrompt({
      company,
      position,
      jd,
      searchResults,
    });

    // 先返回解析信息，再流式返回分析结果
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // 发送解析后的基本信息
        const infoChunk = `🔍 已识别信息\n公司名称：${company}\n岗位名称：${position}${missingFields.includes('岗位描述') ? '\n⚠️ 未识别到详细岗位描述，将基于岗位名称进行分析' : ''}\n\n---\n\n`;
        controller.enqueue(encoder.encode(infoChunk));

        // 发送免责声明
        const disclaimerChunk = `> ⚠️ **信息准确性声明**：本报告基于 AI 分析和公开信息生成，可能存在同名公司混淆、信息过时或偏差等问题。建议面试前通过官方渠道核实公司信息。\n\n`;
        controller.enqueue(encoder.encode(disclaimerChunk));

        // 调用 AI 生成分析报告
        const result = await streamText({
          model: (() => {
        const provider = getAIProvider(apiKey, aiProvider);
        switch (aiProvider) {
          case 'openai':
            return provider('gpt-4');
          case 'anthropic':
            return provider('claude-3-sonnet-20240229');
          case 'moonshot':
            return provider('moonshot-v1-8k');
          case 'gemini':
            return provider('gemini-1.5-pro');
          case 'deepseek':
          default:
            return provider('deepseek-chat');
        }
      })(),
          system: SYSTEM_PROMPT,
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
    console.error('Analysis error:', error);
    return Response.json(
      { error: '分析过程中出现错误，请稍后重试' },
      { status: 500 }
    );
  }
}

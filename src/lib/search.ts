/**
 * 搜索服务
 * - 优先级：bing → google → serpapi → mock
 * - bing/google/serpapi 需要配置 API Key
 */

export interface SearchResult {
  category: string;
  query: string;
  results: string[];
  sources: string[];
}

// 通过 Google Custom Search API 搜索（免费配额：100次/天）
async function googleSearch(company: string, apiKey: string, cx: string): Promise<SearchResult[] | null> {
  if (!apiKey || !cx) return null;

  const queries = [
    { q: `${company} 融资 投资`, category: '公司融资动态' },
    { q: `${company} 裁员 口碑 脉脉`, category: '公司舆情' },
    { q: `${company} 最新动态 业务`, category: '业务动态' },
  ];

  const results: SearchResult[] = [];

  for (const { q, category } of queries) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?q=${encodeURIComponent(q)}&cx=${cx}&key=${apiKey}&num=5&hl=zh-CN`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.items && data.items.length > 0) {
        const items = data.items.slice(0, 3).map((item: any) =>
          `${item.title} - ${item.snippet}`
        );
        results.push({
          category,
          query: q,
          results: items,
          sources: data.items.slice(0, 3).map((item: any) => item.link),
        });
      }
    } catch (e) {
      console.error('Google search error:', e);
    }
  }

  return results;
}

// 生成模拟搜索结果（当没有配置真实搜索 API 时使用）
async function mockSearchFallback(company: string): Promise<SearchResult[]> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  await delay(150);

  return [
    {
      category: "公司信息提示",
      query: `${company} 公司信息`,
      results: [
        `⚠️ 注意：由于可能存在同名公司，以下信息仅供参考，请通过官方渠道核实公司全称、所属集团、办公地址等信息`,
        `建议面试前确认：1) 公司全称和工商注册信息 2) 所属集团或投资方 3) 主要办公地址 4) 公司规模`,
        `常见混淆情况：母公司 vs 子公司、知名品牌 vs 地方同名公司、已注销公司与新成立公司`
      ],
      sources: ["提示"]
    },
    {
      category: "公开信息检索",
      query: `${company} 相关信息`,
      results: [
        `系统检测到搜索词 "${company}"，但无法确定是否为用户目标公司`,
        `建议用户自行核实：该公司是否与目标岗位匹配、是否为知名品牌的子公司或关联公司`,
        `⚠️ 如果 ${company} 是知名大公司，但搜索结果显示为小公司信息，可能存在同名混淆`
      ],
      sources: ["提示"]
    },
    {
      category: "风险提示",
      query: `信息核实建议`,
      results: [
        `所有搜索结果仅供参考，实际公司信息请以面试时的官方介绍为准`,
        `建议在面试时主动询问：公司组织架构、业务规模、核心产品，发展历程等`,
        `可通过天眼查/企查查核实：公司成立时间、注册资本、法人代表、关联企业`
      ],
      sources: ["建议"]
    }
  ];
}

// 通过 SerpAPI 搜索
async function serpapiSearch(company: string, apiKey: string): Promise<SearchResult[]> {
  if (!apiKey) return mockSearchFallback(company);

  const queries = [
    `${company} 融资 投资`,
    `${company} 裁员 口碑`,
    `${company} 最新动态 业务`
  ];

  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const url = `https://serpapi.com/search.json?q=${encodeURIComponent(q)}&api_key=${apiKey}&num=3`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.organic_results) {
        const texts = data.organic_results.slice(0, 3).map((r: any) =>
          `${r.title} - ${r.snippet}`
        );
        if (texts.length > 0) {
          results.push({
            category: q.includes('融资') ? '公司融资动态' : q.includes('裁员') ? '公司舆情' : '业务动态',
            query: q,
            results: texts,
            sources: data.organic_results.slice(0, 3).map((r: any) => r.link)
          });
        }
      }
    } catch (e) {
      console.error('SerpAPI search error:', e);
    }
  }

  return results.length > 0 ? results : mockSearchFallback(company);
}

// 通过 Bing Search API 搜索
async function bingSearch(company: string, apiKey: string): Promise<SearchResult[]> {
  if (!apiKey) return serpapiSearch(company, '');

  const endpoint = 'https://api.bing.microsoft.com/v7.0';
  const queries = [
    `${company} 融资 投资`,
    `${company} 裁员 口碑`,
    `${company} 最新动态`
  ];

  const results: SearchResult[] = [];

  for (const q of queries) {
    try {
      const url = `${endpoint}/search?q=${encodeURIComponent(q)}&count=3`;
      const res = await fetch(url, {
        headers: { 'Ocp-Apim-Subscription-Key': apiKey }
      });
      const data = await res.json();

      if (data.webPages?.value) {
        const texts = data.webPages.value.map((r: any) =>
          `${r.name} - ${r.snippet}`
        );
        if (texts.length > 0) {
          results.push({
            category: q.includes('融资') ? '公司融资动态' : q.includes('裁员') ? '公司舆情' : '业务动态',
            query: q,
            results: texts,
            sources: data.webPages.value.map((r: any) => r.url)
          });
        }
      }
    } catch (e) {
      console.error('Bing search error:', e);
    }
  }

  return results.length > 0 ? results : serpapiSearch(company, '');
}

// 主入口：传入 searchApiType、searchApiKey 和 searchApiCx（cx 仅用于 Google）
export async function mockSearch(
  company: string,
  searchApiType?: string,
  searchApiKey?: string,
  searchApiCx?: string
): Promise<SearchResult[]> {
  if (searchApiType === 'google' && searchApiKey && searchApiCx) {
    console.log('[Search] 使用 Google Custom Search API');
    const results = await googleSearch(company, searchApiKey, searchApiCx);
    return results && results.length > 0 ? results : mockSearchFallback(company);
  }
  if (searchApiType === 'bing' && searchApiKey) {
    console.log('[Search] 使用 Bing Search API');
    const results = await bingSearch(company, searchApiKey);
    return results && results.length > 0 ? results : mockSearchFallback(company);
  }
  if (searchApiType === 'serpapi' && searchApiKey) {
    console.log('[Search] 使用 SerpAPI');
    const results = await serpapiSearch(company, searchApiKey);
    return results && results.length > 0 ? results : mockSearchFallback(company);
  }
  // 未配置或为 'none'，用 Mock
  console.log('[Search] 未配置搜索 API，使用 Mock 数据');
  return mockSearchFallback(company);
}

// 搜索查询配置（用于参考）
export function getSearchQueries(company: string) {
  return [
    { category: "公司融资动态", queries: [`${company} 融资`, `${company} 投资方`, `${company} IPO`] },
    { category: "公司舆情", queries: [`${company} 裁员`, `${company} 口碑`, `${company} 脉脉`] },
    { category: "业务动态", queries: [`${company} 新产品`, `${company} 业务调整`, `${company} 最新动态`] },
    { category: "招聘动态", queries: [`${company} 招聘`, `${company} 岗位 拉勾`, `${company} 岗位 Boss直聘`] }
  ];
}

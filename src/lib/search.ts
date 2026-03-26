/**
 * 搜索服务 - 当前使用 Mock 数据
 * 后续可替换为真实搜索 API (SerpAPI, Bing Search API 等)
 */

export interface SearchQuery {
  category: string;
  queries: string[];
}

export interface SearchResult {
  category: string;
  query: string;
  results: string[];
  sources: string[];
}

// 生成模拟搜索结果
export async function mockSearch(company: string): Promise<SearchResult[]> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 模拟网络延迟
  await delay(800);

  const results: SearchResult[] = [
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
        `建议在面试时主动询问：公司组织架构、业务规模、核心产品、发展历程等`,
        `可通过天眼查/企查查核实：公司成立时间、注册资本、法人代表、关联企业`
      ],
      sources: ["建议"]
    }
  ];

  return results;
}

// 搜索查询配置
export function getSearchQueries(company: string): SearchQuery[] {
  return [
    {
      category: "公司融资动态",
      queries: [
        `${company} 融资`,
        `${company} 投资方`,
        `${company} IPO`
      ]
    },
    {
      category: "公司舆情",
      queries: [
        `${company} 裁员`,
        `${company} 口碑`,
        `${company} 脉脉`
      ]
    },
    {
      category: "业务动态",
      queries: [
        `${company} 新产品`,
        `${company} 业务调整`,
        `${company} 最新动态`
      ]
    },
    {
      category: "招聘动态",
      queries: [
        `${company} 招聘`,
        `${company} 岗位 拉勾`,
        `${company} 岗位 Boss直聘`
      ]
    }
  ];
}

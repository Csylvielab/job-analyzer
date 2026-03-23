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
      category: "公司融资动态",
      query: `${company} 融资 投资方`,
      results: [
        `${company} 最近一轮融资为 C 轮，融资金额数亿元人民币，由知名投资机构领投`,
        `估值达到独角兽级别，近一年内暂无新一轮融资消息`,
        `投资方包括多家顶级 VC，财务状态相对稳健`
      ],
      sources: ["36氪", "IT桔子", "企查查"]
    },
    {
      category: "公司舆情",
      query: `${company} 裁员 口碑 脉脉`,
      results: [
        `脉脉上员工评价呈现两极分化，技术团队评价较高，运营团队流动性较大`,
        `近期有少量组织优化消息，主要集中在非核心业务线`,
        `加班文化存在但不算极端，995 较为常见，部分团队实行弹性工作制`
      ],
      sources: ["脉脉", "看准网", "知乎"]
    },
    {
      category: "业务动态",
      query: `${company} 新产品 业务调整`,
      results: [
        `近期发布了新产品线，正在快速扩张市场份额`,
        `战略重心从 ToC 向 ToB 转型，企业级服务成为增长重点`,
        `与多家头部企业达成战略合作，业务处于上升期`
      ],
      sources: ["公司官网", "行业媒体", " TechCrunch"]
    },
    {
      category: "招聘动态",
      query: `${company} 招聘 拉勾 Boss直聘`,
      results: [
        `该岗位在多个平台持续招聘中，HC 相对充足`,
        `同类型岗位薪资区间在 20-35K，略高于行业平均水平`,
        `JD 更新频率较高，说明招聘需求较为紧急`
      ],
      sources: ["Boss直聘", "拉勾网", "猎聘"]
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

"""
JobInsight AI - FastAPI Backend Wrapper
为 Chrome 插件提供 Web API 接口

运行方式:
    python app.py

默认监听: http://127.0.0.1:8000
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import uvicorn
import re
import json

app = FastAPI(
    title="JobInsight AI API",
    description="智能求职分析后端 API",
    version="1.0.0"
)

# CORS 配置 - 允许 Chrome 插件跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境允许所有来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 数据模型 ====================

class JobDetail(BaseModel):
    """职位详情数据模型"""
    source: str = Field(default="zhipin.com", description="数据来源")
    url: Optional[str] = Field(None, description="原始页面URL")
    extractedAt: Optional[str] = Field(None, description="提取时间")
    jobTitle: str = Field(..., description="职位名称")
    salary: Optional[str] = Field(None, description="薪资范围")
    company: Optional[str] = Field(None, description="公司名称")
    jobDescription: str = Field(..., description="职位描述正文")


class AnalysisResult(BaseModel):
    """分析结果数据模型"""
    score: int = Field(..., ge=0, le=100, description="匹配度评分 0-100")
    keywords: List[str] = Field(default_factory=list, description="技能关键词列表")
    warnings: List[str] = Field(default_factory=list, description="避雷预警列表")
    analysis: str = Field(..., description="深度分析文本")
    suggestions: Optional[str] = Field(None, description="优化建议")


# ==================== 辅助函数 ====================

def extract_keywords(text: str) -> List[str]:
    """从 JD 文本中提取技能关键词"""
    # 常见技术关键词
    tech_keywords = [
        # 编程语言
        'Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#', 'PHP', 'Ruby', 'Swift', 'Kotlin',
        # 前端
        'React', 'Vue', 'Angular', 'Node.js', 'HTML', 'CSS', 'Webpack', 'Vite', 'Tailwind',
        # 后端/框架
        'Spring', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
        'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Nginx', 'Kafka', 'RabbitMQ',
        # 数据/AI
        'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP', 'CV', 'Data Analysis',
        'SQL', 'Excel', 'Tableau', 'PowerBI', 'Spark', 'Hadoop',
        # 产品/运营
        'Product Manager', 'PRD', 'Axure', 'Figma', 'SQL', '数据分析', '用户研究', 'A/B测试',
        # 软技能
        '沟通', '协作', '领导力', '项目管理', '团队管理', '跨团队', '抗压'
    ]

    found = []
    text_lower = text.lower()

    for keyword in tech_keywords:
        # 匹配完整单词
        pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found.append(keyword)

    return found[:15]  # 最多返回15个


def check_warnings(text: str, salary: str = "") -> List[str]:
    """检查避雷预警信号"""
    warnings = []

    # 低薪预警
    if salary:
        # 尝试从薪资字符串中提取数字
        numbers = re.findall(r'\d+', salary)
        if numbers:
            min_salary = min(int(n) for n in numbers)
            # 假设薪资单位是 K
            if min_salary < 10:
                warnings.append("薪资低于市场水平，建议谨慎考虑")

    # 雷区关键词
    risk_patterns = [
        (r'弹性工作制|加班文化', '可能有加班文化，面试时可询问具体工作时间'),
        (r'扁平管理|管理灵活', '可能管理制度不完善'),
        (r'创业公司|融资阶段|天使轮|A轮|B轮', '创业公司风险较高，注意股权/期权条款'),
        (r'草台班子|草创期', '团队可能还在搭建阶段'),
        (r'能承受较大工作压力|抗压能力强', '工作压力可能较大'),
        (r'薪资面议|待遇从优', '薪资可能低于预期'),
        (r'立即上岗|紧急招聘', '可能工作强度大或留人困难'),
        (r'女性优先|男士优先', '存在性别歧视风险'),
        (r'形象好|气质佳', '可能存在外貌歧视'),
    ]

    text_lower = text.lower()
    for pattern, warning in risk_patterns:
        if re.search(pattern, text_lower):
            if warning not in warnings:
                warnings.append(warning)

    # JD 过长或过短
    if len(text) < 200:
        warnings.append("JD 信息过少，可能是不正规的招聘")
    elif len(text) > 3000:
        warnings.append("JD 过长，可能包含过多套路")

    return warnings


def calculate_match_score(job_desc: str, keywords: List[str]) -> int:
    """计算匹配度分数"""
    score = 50  # 基础分

    # JD 完整度加分
    if len(job_desc) > 500:
        score += 10
    if len(job_desc) > 1000:
        score += 10

    # 关键词匹配加分
    keyword_matches = len(keywords)
    if keyword_matches > 5:
        score += 15
    elif keyword_matches > 3:
        score += 10
    elif keyword_matches > 0:
        score += 5

    # JD 结构化程度（是否有明确的职责/要求分段）
    if re.search(r'职责|要求|条件|技能', job_desc):
        score += 10

    return min(score, 100)


def generate_analysis(job: JobDetail) -> str:
    """生成深度分析文本"""
    analysis_parts = []

    # 职位类型判断
    if any(kw in job.jobTitle for kw in ['产品经理', 'PM', 'Product Manager']):
        analysis_parts.append("产品经理岗位：建议关注产品迭代节奏、用户规模、技术团队配置")
    elif any(kw in job.jobTitle for kw in ['工程师', '开发', 'Engineer', 'Developer']):
        analysis_parts.append("技术岗位：关注技术栈匹配度、代码规范、技术成长空间")
    elif any(kw in job.jobTitle for kw in ['运营', 'Operation']):
        analysis_parts.append("运营岗位：关注 KPI 考核方式、用户增长目标、资源支持力度")

    # 公司分析
    if job.company:
        analysis_parts.append(f"公司：{job.company}，建议通过脉脉/BOSS等核实公司口碑")

    # 薪资分析
    if job.salary:
        analysis_parts.append(f"薪资：{job.salary}，可通过offershow等平台核实市场水平")

    return '\n'.join(analysis_parts) if analysis_parts else "信息有限，建议进一步了解"


def generate_suggestions(job: JobDetail, keywords: List[str]) -> str:
    """生成简历优化建议"""
    suggestions = []

    if keywords:
        suggestions.append(f"简历建议突出以下关键词：{', '.join(keywords[:5])}")

    if 'Python' in keywords or 'SQL' in keywords:
        suggestions.append("建议在简历中量化数据成果（如：提升效率30%）")

    if any(k in keywords for k in ['React', 'Vue', 'Angular']):
        suggestions.append("前端技能建议提供项目 Demo 链接")

    suggestions.append("面试前准备：① 了解公司业务 ② 准备3个成功案例 ③ 准备反问面试官的问题")

    return '\n'.join(suggestions)


# ==================== API 路由 ====================

@app.get("/")
async def root():
    """API 根路径"""
    return {
        "name": "JobInsight AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "analyze": "POST /analyze"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze_job(job: JobDetail):
    """
    分析职位详情

    接收 Chrome 插件提取的 JD 数据，进行 NLP 分析并返回：
    - 匹配度评分
    - 技能关键词
    - 避雷预警
    - 深度分析
    - 优化建议
    """
    try:
        # 1. 提取关键词
        keywords = extract_keywords(job.jobDescription)

        # 2. 检查预警
        warnings = check_warnings(job.jobDescription, job.salary or "")

        # 3. 计算匹配度
        score = calculate_match_score(job.jobDescription, keywords)

        # 4. 生成分析
        analysis = generate_analysis(job)

        # 5. 生成建议
        suggestions = generate_suggestions(job, keywords)

        # 6. 构建返回
        result = AnalysisResult(
            score=score,
            keywords=keywords,
            warnings=warnings,
            analysis=analysis,
            suggestions=suggestions
        )

        print(f"[JobInsight] 分析完成: {job.jobTitle} @ {job.company} | 评分: {score}")

        return result

    except Exception as e:
        print.error(f"分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@app.post("/analyze/raw")
async def analyze_raw(request: Request):
    """
    原始数据接口 - 接收任意格式的 JSON 数据
    适用于插件未来版本扩展
    """
    try:
        data = await request.json()
        print(f"[JobInsight] 收到原始数据: {json.dumps(data, ensure_ascii=False)[:200]}")

        # 尝试构建 JobDetail
        job = JobDetail(
            jobTitle=data.get('jobTitle', '未知职位'),
            jobDescription=data.get('jobDescription', data.get('jobDesc', '')),
            company=data.get('company'),
            salary=data.get('salary'),
            source=data.get('source', 'unknown'),
            url=data.get('url'),
            extractedAt=data.get('extractedAt')
        )

        # 调用分析
        keywords = extract_keywords(job.jobDescription)
        warnings = check_warnings(job.jobDescription, job.salary or "")
        score = calculate_match_score(job.jobDescription, keywords)
        analysis = generate_analysis(job)
        suggestions = generate_suggestions(job, keywords)

        return AnalysisResult(
            score=score,
            keywords=keywords,
            warnings=warnings,
            analysis=analysis,
            suggestions=suggestions
        )

    except Exception as e:
        print.error(f"处理失败: {e}")
        raise HTTPException(status_code=400, detail=f"数据格式错误: {str(e)}")


# ==================== 启动 ====================

if __name__ == "__main__":
    print("=" * 50)
    print("JobInsight AI Backend")
    print("API 文档: http://127.0.0.1:8000/docs")
    print("=" * 50)

    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  Sparkles,
  Send,
  Lightbulb,
  History,
  Trash2,
  CheckCircle2,
  Circle,
  X,
  GitCompare,
  ArrowLeft,
  Search,
  FileText,
  UserCheck,
  Upload,
  Plus,
  PenLine,
  AlertTriangle,
  Key,
  Home as HomeIcon,
  Settings,
  User,
  BarChart3,
  Briefcase,
  ChevronRight,
  Zap,
  Target,
  TrendingUp,
  Award,
  ArrowUp
} from 'lucide-react';
import mammoth from 'mammoth';
import { Input } from '@/components/ui/input';
import { useJobRecords, JobRecord, useResumeArchive, ResumeRecord } from '@/lib/hooks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { ThemeToggle } from '@/components/theme-toggle';

// 示例输入
const EXAMPLE_INPUT = `字节跳动
产品经理（增长方向）

岗位职责：
1. 负责抖音电商用户增长产品的策划与落地
2. 通过数据分析发现增长机会，设计增长策略
3. 协同运营、技术团队推动产品迭代

任职要求：
1. 3年以上互联网产品经验
2. 有成功的增长项目经验
3. 数据敏感，逻辑清晰
4. 抗压能力强，能适应快节奏工作`;

// 简历示例
const EXAMPLE_RESUME = `张三
联系方式：138-xxxx-xxxx | zhangsan@email.com

教育背景：
2015-2019 北京大学 计算机科学与技术 本科

工作经历：
2021.06 - 至今 腾讯科技 产品经理
- 负责微信小程序电商板块的产品规划与迭代
- 主导并上线了3个核心功能，DAU提升30%
- 协调设计、开发、测试团队，保证项目按时交付

2019.07 - 2021.05 阿里巴巴 产品专员
- 参与淘宝直播频道的功能优化
- 通过用户调研和数据分析，提出并落地5个优化方案

专业技能：
- 熟练使用Axure、Figma等原型设计工具
- 掌握SQL，能独立进行数据查询和分析
- 了解Python基础，能用脚本处理数据
- 良好的跨团队沟通能力和项目管理能力`;

interface ErrorDetails {
  message: string;
  suggestion?: string;
  missingFields?: string[];
}

type ViewMode = 'input' | 'compare' | 'evaluate' | 'optimize';
type UiState = 'input' | 'generating' | 'result';

// Custom list item component to hide bullet for specific headers
const CustomListItem = ({ children, ...props }: any) => {
  const text = String(children);
  const isSectionHeader = text.includes('【来源/置信度】') || text.includes('【分析】');
  return (
    <li {...props} className={isSectionHeader ? 'section-header' : ''}>
      {children}
    </li>
  );
};

export default function Home() {
  const [input, setInput] = useState('');
  const [content, setContent] = useState('');
  // 简历评估相关状态
  const [evaluateContent, setEvaluateContent] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  // 简历优化相关状态
  const [optimizeContent, setOptimizeContent] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [parsedInfo, setParsedInfo] = useState<{ company?: string; position?: string }>({});
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  // UI 状态：输入态 / 生成态
  const [uiState, setUiState] = useState<UiState>('input');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareContent, setCompareContent] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResumePanel, setShowResumePanel] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeName, setResumeName] = useState('');
  const [waitTime, setWaitTime] = useState(0);
  // 雷达图数据
  const [radarData, setRadarData] = useState<{ subject: string; score: number; fullMark: number }[]>([]);
  const [radarShortest, setRadarShortest] = useState<string>('');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const reportEndRef = useRef<HTMLDivElement>(null);
  const parsedInfoRef = useRef<{ company?: string; position?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Settings dialog and API Key state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  // Debug: log state changes
  useEffect(() => {
    console.log('Settings dialog state:', showSettingsDialog);
  }, [showSettingsDialog]);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  // AI Provider state
  type AIProvider = 'deepseek' | 'openai' | 'anthropic' | 'moonshot' | 'gemini';
  const [aiProvider, setAiProvider] = useState<AIProvider>('deepseek');
  const [aiProviderInput, setAiProviderInput] = useState<AIProvider>('deepseek');
  const waitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { records, addRecord, toggleApplied, toggleAllApplied, deleteRecord, stats, loaded } = useJobRecords();
  const { resumes, selectedId, selectedResume, addResume, deleteResume, selectResume, getResumeContent } = useResumeArchive();

  // 过滤历史记录
  const filteredRecords = records.filter(record => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.company.toLowerCase().includes(query) ||
      record.position.toLowerCase().includes(query)
    );
  });

  // Load API settings from localStorage on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem("jobanalyzer_ai_provider") as AIProvider;
    if (savedProvider) {
      setAiProvider(savedProvider);
      // Load per-provider API key
      const savedKey = localStorage.getItem(`jobanalyzer_api_key_${savedProvider}`);
      if (savedKey) {
        setApiKey(savedKey);
      }
    }
  }, []);

  // Load avatar from localStorage on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem("jobanalyzer_avatar");
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  // Get API key for a specific provider (checks per-provider key, falls back to legacy global key for deepseek)
  const getApiKeyForProvider = (provider: AIProvider) => {
    const perProviderKey = localStorage.getItem(`jobanalyzer_api_key_${provider}`);
    if (perProviderKey) return perProviderKey;
    if (provider === 'deepseek') {
      return localStorage.getItem("jobanalyzer_api_key") || "";
    }
    return "";
  };

  // Get the current provider's API key from per-provider storage
  const getCurrentApiKey = () => {
    const provider = (localStorage.getItem("jobanalyzer_ai_provider") || 'deepseek') as AIProvider;
    return getApiKeyForProvider(provider);
  };

  useEffect(() => {
    if (content && reportEndRef.current) {
      reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content]);

  // 回到顶部按钮显示/隐藏
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 等待时间计时器
  useEffect(() => {
    const isWaiting = isLoading || isEvaluating || isOptimizing || isComparing;
    if (isWaiting) {
      setWaitTime(0);
      waitTimerRef.current = setInterval(() => {
        setWaitTime(prev => prev + 1);
      }, 1000);
    } else {
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    }
    return () => {
      if (waitTimerRef.current) {
        clearInterval(waitTimerRef.current);
      }
    };
  }, [isLoading, isEvaluating, isOptimizing, isComparing]);

  // 格式化等待时间
  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  // 开始对比模式
  const startCompare = () => {
    setViewMode('compare');
    setCompareSelection([]);
    setCompareContent('');
    setShowHistory(false); // 关闭分析历史，确保进入对比模式
  };

  // 取消对比
  const cancelCompare = () => {
    setViewMode('input');
    setCompareSelection([]);
    setCompareContent('');
  };

  // 切换选中状态
  const toggleCompareSelection = (id: string) => {
    setCompareSelection(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  // 执行对比
  const executeCompare = async () => {
    if (compareSelection.length !== 2) return;

    const selectedJobs = records.filter(r => compareSelection.includes(r.id));
    if (selectedJobs.length !== 2) return;

    setIsComparing(true);
    // 清除所有之前的报告内容
    setContent('');
    setEvaluateContent('');
    setOptimizeContent('');
    setCompareContent('');
    abortControllerRef.current = new AbortController();

    // 滚动到报告区域
    setTimeout(() => {
      reportEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': getCurrentApiKey() || '', 'X-AI-Provider': localStorage.getItem('jobanalyzer_ai_provider') || 'deepseek' },
        body: JSON.stringify({
          jobs: selectedJobs.map(j => ({
            company: j.company,
            position: j.position,
            content: j.content,
          })),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('对比分析失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('响应体为空');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
      }

      // 生成完毕后一次性显示内容
      setCompareContent(fullContent);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setCompareContent('对比分析出错：' + err.message);
      }
    } finally {
      setIsComparing(false);
      abortControllerRef.current = null;
    }
  };

  // 简历评估功能
  const onEvaluate = useCallback(async (jobTextOverride?: string) => {
    const resumeContent = getResumeContent();
    const jobText = jobTextOverride || input;
    if (!resumeContent.trim()) {
      setError({ message: '请先选择或上传简历' });
      return;
    }
    if (!jobText.trim()) {
      setError({ message: '❌ 岗位空缺：请先输入岗位信息，再进行简历评估' });
      return;
    }

    setIsEvaluating(true);
    setUiState('generating');
    // 清除所有之前的报告内容
    setContent('');
    setEvaluateContent('');
    setOptimizeContent('');
    setCompareContent('');
    setError(null);
    setViewMode('evaluate');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': getCurrentApiKey() || '', 'X-AI-Provider': localStorage.getItem('jobanalyzer_ai_provider') || 'deepseek' },
        body: JSON.stringify({ resume: resumeContent, jobText: jobText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '评估请求失败');
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
      }

      // 生成完毕后一次性显示内容
      setEvaluateContent(fullContent);
      setUiState('result');

      // 解析雷达图数据
      try {
        const radarMatch = fullContent.match(/```json\s*\{[\s\S]*?"radar"[\s\S]*?\}\s*```/);
        if (radarMatch) {
          const jsonStr = radarMatch[0].replace(/```json\s*|```/g, '');
          const radarJson = JSON.parse(jsonStr);
          if (radarJson.radar) {
            const data = [
              { subject: '技能', score: radarJson.radar['技能'] || 0, fullMark: 100 },
              { subject: '经验', score: radarJson.radar['经验'] || 0, fullMark: 100 },
              { subject: '行业背景', score: radarJson.radar['行业背景'] || 0, fullMark: 100 },
              { subject: '软实力', score: radarJson.radar['软实力'] || 0, fullMark: 100 },
              { subject: '教育', score: radarJson.radar['教育'] || 0, fullMark: 100 },
            ];
            setRadarData(data);
            setRadarShortest(radarJson.shortest || '');
          }
        }
      } catch (e) {
        console.log('雷达图数据解析失败', e);
        setRadarData([]);
        setRadarShortest('');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      setError({
        message: err?.message || '评估过程中出现错误',
      });
    } finally {
      setIsEvaluating(false);
      abortControllerRef.current = null;
    }
  }, [getResumeContent, input]);

  // 简历优化功能
  const onOptimizeResume = useCallback(async (jobTextOverride?: string) => {
    const resumeContent = getResumeContent();
    const jobText = jobTextOverride || input;
    if (!resumeContent.trim()) {
      setError({ message: '请先选择或上传简历' });
      return;
    }
    if (!jobText.trim()) {
      setError({ message: '❌ 岗位空缺：请先输入岗位信息，再进行简历优化' });
      return;
    }

    setIsOptimizing(true);
    setUiState('generating');
    // 清除所有之前的报告内容
    setContent('');
    setEvaluateContent('');
    setOptimizeContent('');
    setCompareContent('');
    setError(null);
    setViewMode('optimize');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': getCurrentApiKey() || '', 'X-AI-Provider': localStorage.getItem('jobanalyzer_ai_provider') || 'deepseek' },
        body: JSON.stringify({ resume: resumeContent, jobText: jobText }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '简历优化请求失败');
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
      }

      // 生成完毕后一次性显示内容
      setOptimizeContent(fullContent);
      setUiState('result');
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      setError({
        message: err?.message || '简历优化过程中出现错误',
      });
    } finally {
      setIsOptimizing(false);
      abortControllerRef.current = null;
    }
  }, [getResumeContent, input]);

  const onSubmit = useCallback(async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setIsParsing(true);
    setUiState('generating');
    // 清除所有之前的报告内容
    setContent('');
    setEvaluateContent('');
    setOptimizeContent('');
    setCompareContent('');
    setError(null);
    setParsedInfo({});
    parsedInfoRef.current = {};
    setCurrentRecordId(null);
    setViewMode('input');

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': getCurrentApiKey() || '', 'X-AI-Provider': localStorage.getItem('jobanalyzer_ai_provider') || 'deepseek' },
        body: JSON.stringify({ text: input }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error || '请求失败',
          suggestion: errorData.details?.suggestion,
          missingFields: errorData.details?.missingFields,
        };
      }

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        setIsParsing(false); // 收到第一个 chunk，解析完成

        const companyMatch = fullContent.match(/公司名称[：:]\s*(.+)/);
        const positionMatch = fullContent.match(/岗位名称[：:]\s*(.+)/);
        if (companyMatch || positionMatch) {
          parsedInfoRef.current = {
            company: companyMatch?.[1]?.trim(),
            position: positionMatch?.[1]?.trim(),
          };
          setParsedInfo(parsedInfoRef.current);
        }
      }

      // 生成完毕后一次性显示内容
      setContent(fullContent);
      setUiState('result');

      const company = parsedInfoRef.current.company || fullContent.match(/公司名称[：:]\s*(.+)/)?.[1]?.trim() || '未知公司';
      const position = parsedInfoRef.current.position || fullContent.match(/岗位名称[：:]\s*(.+)/)?.[1]?.trim() || '未知岗位';

      const id = addRecord({
        company,
        position,
        content: fullContent,
        inputText: input,
      });
      setCurrentRecordId(id);
      setParsedInfo({ company, position });
      parsedInfoRef.current = { company, position };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      setError({
        message: err?.message || '发生未知错误',
        suggestion: err?.suggestion,
        missingFields: err?.missingFields,
      });
    } finally {
      setIsLoading(false);
      setIsParsing(false);
      abortControllerRef.current = null;
    }
  }, [input, addRecord]);

  // 加载示例简历
  const loadExampleResume = useCallback(() => {
    addResume({
      name: '示例简历 - 产品经理',
      content: EXAMPLE_RESUME,
    });
  }, [addResume]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsParsing(false);
      setIsComparing(false);
      setIsEvaluating(false);
      setIsOptimizing(false);
    }
  }, []);

  const useExample = () => {
    setInput(EXAMPLE_INPUT);
  };

  // 处理文件上传
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件扩展名 - 只支持 docx
    const fileName = file.name.toLowerCase();
    const isDocx = fileName.endsWith('.docx');

    if (!isDocx) {
      setError({ message: '⚠️ 请上传 .docx 格式的 Word 文档（.doc 旧格式不支持）' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      // 读取文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 使用 mammoth 解析 docx
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (!result.value || result.value.trim().length === 0) {
        setError({
          message: '⚠️ 无法从文档中提取文本，文档可能为空或格式不兼容',
          suggestion: '建议：将简历内容复制到左侧"新建"文本框中手动添加'
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      const name = file.name.replace(/\.docx$/i, ''); // 去掉扩展名

      addResume({
        name,
        content: result.value.trim(),
        fileName: file.name,
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      setError(null);
    } catch (err) {
      console.error('解析错误:', err);
      setError({
        message: '⚠️ 文档解析失败，请尝试复制文本内容后手动粘贴',
        suggestion: '建议：打开文档，复制内容，使用左侧"新建"按钮粘贴'
      });
    }

    // 清空 input 以便可以重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addResume]);

  // 手动添加简历
  const handleAddResume = useCallback(() => {
    if (!resumeText.trim()) {
      setError({ message: '请输入简历内容' });
      return;
    }
    const name = resumeName.trim() || `简历 ${new Date().toLocaleDateString()}`;
    addResume({
      name,
      content: resumeText,
    });
    setResumeText('');
    setResumeName('');
    setShowResumePanel(false);
    setError(null);
  }, [resumeText, resumeName, addResume]);

  // 处理头像上传
  const handleAvatarUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // 压缩图片到 100x100
        const canvas = document.createElement('canvas');
        const size = 100;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 裁剪为正方形后缩放
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setAvatarUrl(dataUrl);
        localStorage.setItem("jobanalyzer_avatar", dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  }, []);

  const loadRecord = (record: JobRecord) => {
    setContent(record.content);
    setParsedInfo({ company: record.company, position: record.position });
    setCurrentRecordId(record.id);
    setInput(record.inputText);
    setShowHistory(false);
    setViewMode('input');
  };

  // 从历史记录直接开始简历匹配评估
  const evaluateFromHistory = (record: JobRecord) => {
    setInput(record.inputText);
    setContent(record.content);
    setParsedInfo({ company: record.company, position: record.position });
    setCurrentRecordId(record.id);
    setShowHistory(false);
    onEvaluate(record.inputText);
  };

  // 从历史记录直接开始简历优化
  const optimizeFromHistory = (record: JobRecord) => {
    setInput(record.inputText);
    setContent(record.content);
    setParsedInfo({ company: record.company, position: record.position });
    setCurrentRecordId(record.id);
    setShowHistory(false);
    onOptimizeResume(record.inputText);
  };

  // 从历史记录直接开始岗位分析
  const analyzeFromHistory = (record: JobRecord) => {
    setInput(record.inputText);
    setContent(record.content);
    setParsedInfo({ company: record.company, position: record.position });
    setCurrentRecordId(record.id);
    setShowHistory(false);
    onSubmit();
  };

  const clearCurrent = () => {
    setContent('');
    setParsedInfo({});
    setCurrentRecordId(null);
    setInput('');
    setError(null);
    setEvaluateContent('');
    setOptimizeContent('');
    setCompareContent('');
    setCompareSelection([]);
    setShowHistory(false);
    setViewMode('input');
    setUiState('input');
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen relative z-10">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="glass-card rounded-2xl px-5 py-3 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-600 shadow-lg shadow-primary/30 pulse-glow">
                <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground tracking-tight">JobInsight AI</h1>
                <p className="text-xs text-muted-foreground">智能求职分析平台</p>
              </div>
            </div>

            {/* Center: Stats & Nav */}
            <div className="hidden md:flex items-center gap-6">
              {/* 精致状态栏 */}
              <div className="flex items-center gap-1 bg-accent rounded-full px-4 py-1.5 border border-border">
                <div className="flex items-center gap-1.5 pr-3 border-r border-border">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-foreground-secondary">{stats.total}</span>
                </div>
                <div className="flex items-center gap-1.5 pl-3">
                  <Briefcase className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-success">{stats.applied}</span>
                </div>
              </div>

              {/* 图标化次级导航 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={clearCurrent}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                  title="主页"
                >
                  <HomeIcon className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={startCompare}
                  disabled={records.length < 2}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="岗位对比"
                >
                  <GitCompare className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`p-2 rounded-xl transition-all duration-200 ${showHistory ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                  title="历史记录"
                >
                  <History className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Right: Theme Toggle & Settings & Avatar */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => {
                  setApiKeyInput(getApiKeyForProvider(aiProvider));
                  setAiProviderInput(aiProvider);
                  setShowSettingsDialog(true);
                }} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 relative">
                <Settings className="h-5 w-5" strokeWidth={1.5} />
                {apiKey && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-emerald-500 rounded-full"></span>}
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-primary/30 hover:opacity-80 transition-opacity cursor-pointer overflow-hidden"
                title="点击上传头像"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="头像" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <User className="h-4 w-4 text-primary" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 relative z-10 transition-all duration-500">
        {/* 状态 A: 输入态 - 居中布局，大量留白 */}
        {uiState === 'input' && !showHistory && viewMode !== 'compare' && (
          <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl space-y-6">
              {/* 主标题区域 */}
              <div className="text-center space-y-3 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted border border-border text-sm text-muted-foreground mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />
                  <span>AI 驱动的岗位分析平台</span>
                </div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                  智能分析你的
                  <span className="gradient-text"> 职业机会</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  输入岗位信息，AI 将为你提供深度分析报告，助你做出最佳职业决策
                </p>
              </div>

              {/* 输入卡片 */}
              <div className="animated-border">
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-6 space-y-5">
                    {/* 输入框 */}
                    <textarea
                      placeholder={`直接粘贴你看到的岗位信息，例如：

公司名：字节跳动
岗位：产品经理

或者粘贴完整的招聘文案，AI 会自动识别...`}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl bg-muted border border-input
                        focus:border-primary/50 focus:ring-2 focus:ring-primary/20
                        transition-all duration-200 resize-none
                        text-sm text-black dark:text-foreground placeholder:text-muted-foreground"
                    />

                    {/* 按钮区域 */}
                    <div className="space-y-3">
                      <button
                        onClick={onSubmit}
                        disabled={!input.trim()}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-primary to-purple-600
                          text-primary-foreground font-semibold text-sm
                          shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50
                          hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
                          transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
                          flex items-center justify-center gap-2 group btn-glow"
                      >
                        <Sparkles className="h-4 w-4 group-hover:rotate-12 transition-transform" strokeWidth={1.5} />
                        开始分析
                      </button>

                      {/* 次要操作 */}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => onEvaluate()}
                          disabled={!input.trim()}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500
                            text-primary-foreground font-medium text-xs
                            shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40
                            hover:-translate-y-0.5 active:translate-y-0
                            transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                            flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                          简历匹配
                        </button>
                        <button
                          onClick={() => onOptimizeResume()}
                          disabled={!input.trim()}
                          className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500
                            text-primary-foreground font-medium text-xs
                            shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40
                            hover:-translate-y-0.5 active:translate-y-0
                            transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                            flex items-center justify-center gap-1.5"
                        >
                          <PenLine className="h-3.5 w-3.5" strokeWidth={1.5} />
                          简历优化
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 简历选择区域 */}
              <div className="glass-card rounded-2xl overflow-hidden p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="text-sm font-medium text-foreground">选择简历</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".docx"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors"
                    >
                      上传
                    </button>
                    <button
                      onClick={() => setShowResumePanel(true)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                    >
                      新建
                    </button>
                  </div>
                </div>

                {/* 简历列表 */}
                {resumes.length === 0 ? (
                  <div className="text-center py-6 bg-muted rounded-xl border border-dashed border-border">
                    <p className="text-xs text-muted-foreground">暂无简历，请先上传或创建</p>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {resumes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => selectResume(r.id)}
                        className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          selectedId === r.id
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground border border-border hover:bg-accent'
                        }`}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}

                {selectedResume && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-success">
                    <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                    <span>已选择: {selectedResume.name}</span>
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="flex items-center justify-center gap-6 text-xs text-foreground-tertiary">
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  支持 .docx 格式
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-pink-500" />
                  智能匹配评估
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  AI 深度优化
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 状态 B: 生成态/结果态 - 紧凑 Header + 报告区域 */}
        {(uiState === 'generating' || uiState === 'result' || showHistory || viewMode === 'compare') && (
          <div className={`grid gap-6 ${(viewMode === 'compare' || showHistory) ? 'lg:grid-cols-[260px,1fr]' : 'lg:grid-cols-1'}`}>
          {/* 状态 B: 左侧栏 - 历史面板或简历面板 */}
          {(showHistory || viewMode === 'compare') && (
            <Card className="h-fit glass-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base text-foreground">
                  <span className="flex items-center gap-2">
                    {showHistory ? (
                      <>
                        <History className="h-4 w-4 text-[#667eea]" strokeWidth={1.5} />
                        分析历史
                      </>
                    ) : viewMode === 'compare' ? (
                      <>
                        <GitCompare className="h-4 w-4 text-[#667eea]" strokeWidth={1.5} />
                        选择对比岗位
                      </>
                    ) : (
                      <>
                        <History className="h-4 w-4 text-[#667eea]" strokeWidth={1.5} />
                        分析历史
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      if (viewMode === 'compare') {
                        // 关闭对比模式，回到输入态
                        setViewMode('input');
                        setCompareSelection([]);
                      } else {
                        // 关闭分析历史
                        setShowHistory(false);
                      }
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </CardTitle>
              </CardHeader>
              {/* 搜索栏 + 对比模式按钮 - 统一固定在顶部 */}
              <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
                {/* Search Box */}
                <div className="px-3 pt-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      placeholder="搜索公司或岗位..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-muted border-border focus:border-[#667eea]/50 text-sm text-black dark:text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
                {/* 对比模式按钮 */}
                {viewMode === 'compare' && !showHistory && (
                  <div className="px-3 pt-3 pb-3">
                    <div className="bg-white dark:bg-[#0f0f23] rounded-xl p-3 text-sm text-foreground-secondary border border-[#667eea]/20 shadow-sm">
                      <p className="mb-2">请选择 2 个岗位进行对比</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={executeCompare}
                          disabled={compareSelection.length !== 2 || isComparing}
                          className="flex-1 bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90 text-white border-0"
                        >
                          {isComparing ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" strokeWidth={1.5} />
                              对比中 ({formatWaitTime(waitTime)})
                            </>
                          ) : (
                            <>
                              <GitCompare className="h-3 w-3 mr-1" strokeWidth={1.5} />
                              开始对比
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelCompare}
                          className="border-border text-foreground-secondary hover:bg-accent"
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">

                {/* 全选/取消全选按钮 - 不在分析历史模式下显示 */}
                {!showHistory && viewMode !== 'compare' && filteredRecords.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allSelected = filteredRecords.every(r => r.applied);
                      toggleAllApplied(filteredRecords.map(r => r.id), !allSelected);
                    }}
                    className="w-full text-xs bg-muted border-border text-foreground-secondary hover:bg-accent hover:text-foreground"
                  >
                    {filteredRecords.every(r => r.applied) ? (
                      <>
                        <Circle className="h-3 w-3 mr-1" strokeWidth={1.5} />
                        取消全选
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" strokeWidth={1.5} />
                        全选
                      </>
                    )}
                  </Button>
                )}

                {/* 记录列表 */}
                {filteredRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? '未找到匹配的岗位' : '暂无分析记录'}
                  </p>
                ) : (
                  filteredRecords.map((record) =>(
                    <div
                      key={record.id}
                      onClick={() => viewMode === 'compare' && !showHistory && toggleCompareSelection(record.id)}
                      className={`p-3 rounded-xl border transition-all group cursor-pointer ${
                        viewMode === 'compare' && !showHistory && compareSelection.includes(record.id)
                          ? 'border-[#667eea] bg-[#667eea]/20'
                          : currentRecordId === record.id
                          ? 'border-[#667eea]/50 bg-[#667eea]/10'
                          : 'border-border/50 hover:border-white/20 bg-muted'
                      } ${viewMode === 'compare' && !showHistory ? 'hover:bg-accent' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {viewMode === 'compare' && !showHistory ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={compareSelection.includes(record.id)}
                              onCheckedChange={() => toggleCompareSelection(record.id)}
                              className="mt-0.5 border-[#667eea]/50 data-checked:bg-[#667eea] data-checked:border-[#667eea]"
                            />
                          </div>
                        ) : showHistory ? (
                          // 分析历史模式下不需要复选框
                          null
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={record.applied}
                              onCheckedChange={() => toggleApplied(record.id)}
                              className="mt-0.5 border-[#667eea]/50 data-checked:bg-[#667eea] data-checked:border-[#667eea]"
                            />
                          </div>
                        )}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => (showHistory || viewMode !== 'compare') && loadRecord(record)}
                        >
                          <p className="font-medium text-[#667eea] text-sm truncate">{record.company}</p>
                          <p className="text-xs text-foreground-secondary truncate">{record.position}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {/* 删除按钮 - 在所有模式下都显示 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecord(record.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-2 p-1 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      {(showHistory || viewMode !== 'compare') && (
                        <div className="flex gap-2 mt-3 pt-2 border-t border-border/50">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              analyzeFromHistory(record);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-[#667eea]/10 text-[#667eea] hover:bg-[#667eea]/20 transition-colors"
                          >
                            <Sparkles className="h-3 w-3" strokeWidth={1.5} />
                            分析岗位
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              evaluateFromHistory(record);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-[#f093fb]/10 text-[#f093fb] hover:bg-[#f093fb]/20 transition-colors"
                          >
                            <UserCheck className="h-3 w-3" strokeWidth={1.5} />
                            简历匹配
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              optimizeFromHistory(record);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-[#43e97b]/10 text-[#43e97b] hover:bg-[#43e97b]/20 transition-colors"
                          >
                            <PenLine className="h-3 w-3" strokeWidth={1.5} />
                            一键优化
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* 状态 B: 紧凑输入框 (生成态/结果态) */}
          {(uiState === 'generating' || uiState === 'result') && !showHistory && viewMode !== 'compare' && (
            <div className="glass-card rounded-2xl overflow-hidden p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <textarea
                    placeholder="粘贴岗位信息..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={2}
                    disabled={isLoading || isEvaluating || isOptimizing}
                    className="w-full px-4 py-2 rounded-xl bg-muted border border-border
                      focus:border-[#667eea]/50 focus:ring-2 focus:ring-[#667eea]/20
                      transition-all duration-200 resize-none
                      text-sm text-zinc-200 placeholder:text-zinc-600
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-2">
                  {isLoading || isParsing || isEvaluating || isOptimizing ? (
                    <button
                      onClick={handleStop}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={onSubmit}
                        disabled={!input.trim()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        分析
                      </button>
                      <button
                        onClick={() => onEvaluate()}
                        disabled={!input.trim()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f093fb] to-[#f5576c] text-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        匹配
                      </button>
                      <button
                        onClick={() => onOptimizeResume()}
                        disabled={!input.trim()}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#43e97b] to-[#38f9d7] text-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                      >
                        优化
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 状态 B: 右侧报告区域 */}
          <div>
            <div className="min-h-[700px] glass-card rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-border bg-muted">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      viewMode === 'compare' ? 'bg-[#667eea]/20 border border-[#667eea]/30' :
                      viewMode === 'evaluate' ? 'bg-[#f093fb]/20 border border-[#f093fb]/30' :
                      viewMode === 'optimize' ? 'bg-[#43e97b]/20 border border-[#43e97b]/30' :
                      'bg-[#667eea]/20 border border-[#667eea]/30'
                    }`}>
                      {viewMode === 'compare' ? <GitCompare className="h-4 w-4 text-[#667eea]" strokeWidth={1.5} /> :
                       viewMode === 'evaluate' ? <UserCheck className="h-4 w-4 text-[#f093fb]" strokeWidth={1.5} /> :
                       viewMode === 'optimize' ? <PenLine className="h-4 w-4 text-[#43e97b]" strokeWidth={1.5} /> :
                       <Sparkles className="h-4 w-4 text-[#667eea]" strokeWidth={1.5} />}
                    </div>
                    <span className="font-semibold text-foreground">
                      {viewMode === 'compare' ? '岗位对比分析' :
                       viewMode === 'evaluate' ? '简历匹配评估' :
                       viewMode === 'optimize' ? '简历优化建议' : '分析报告'}
                    </span>
                  </div>
                  {viewMode === 'compare' && compareContent && (
                    <button
                      onClick={() => setCompareContent('')}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 flex items-center gap-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                      重新选择
                    </button>
                  )}
                  {viewMode === 'input' && parsedInfo.company && (
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-accent text-foreground-secondary border border-border">
                        {parsedInfo.company} · {parsedInfo.position}
                      </span>
                      {currentRecordId && (
                        <button
                          onClick={() => toggleApplied(currentRecordId)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                            records.find(r => r.id === currentRecordId)?.applied
                              ? 'bg-[#43e97b]/20 text-[#43e97b] border border-[#43e97b]/30'
                              : 'bg-muted text-muted-foreground hover:bg-[#43e97b]/10 border border-border'
                          }`}
                        >
                          {records.find(r => r.id === currentRecordId)?.applied ? (
                            <> <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} /> 已投递 </>
                          ) : (
                            <> <Circle className="h-3 w-3" strokeWidth={1.5} /> 未投递 </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Compare Result */}
                {viewMode === 'compare' && compareContent && (
                  <div className="report-content text-[15px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ li: CustomListItem }}>{compareContent}</ReactMarkdown>
                  </div>
                )}

                {/* Compare Loading - MagicUI */}
                {viewMode === 'compare' && isComparing && !compareContent && (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#667eea]/30 via-[#764ba2]/30 to-[#667eea]/30 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-[#667eea] to-[#764ba2] shadow-2xl shadow-[#667eea]/30 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-foreground animate-spin" strokeWidth={1.5} />
                      </div>
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2" />
                      </div>
                    </div>
                    <p className="text-base font-medium text-[#667eea] mb-1">正在进行岗位对比分析...</p>
                    <p className="text-sm text-muted-foreground mb-2">AI 从多维度深度对比中</p>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#667eea]/20 text-[#667eea] border border-[#667eea]/30">
                      已用时 {formatWaitTime(waitTime)}
                    </span>
                  </div>
                )}

                {/* Compare Selection UI - MagicUI */}
                {viewMode === 'compare' && !isComparing && !compareContent && (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#667eea]/20 to-[#764ba2]/20 rounded-full blur-xl animate-pulse" />
                      <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10 border border-[#667eea]/20 flex items-center justify-center">
                        <GitCompare className="h-10 w-10 text-[#667eea]/60" strokeWidth={1.5} />
                      </div>
                    </div>
                    <p className="text-base mb-2 text-foreground-secondary">在左侧选择两个岗位进行对比</p>
                    <p className="text-sm text-muted-foreground">AI 会从多维度帮你分析哪个更值得投递</p>
                    {compareSelection.length > 0 && (
                      <div className="mt-6 flex gap-2">
                        {compareSelection.map(id => {
                          const job = records.find(r => r.id === id);
                          return job ? (
                            <Badge key={id} className="bg-[#667eea]/20 text-[#667eea] border-[#667eea]/30">
                              {job.company} · {job.position}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Resume Evaluation Result - MagicUI */}
                {viewMode === 'evaluate' && evaluateContent && (
                  <div className="space-y-6">
                    {/* 五维雷达图 - Dark Theme */}
                    {radarData.length > 0 && (
                      <div className="bg-[#f093fb]/5 border border-[#f093fb]/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-[#f093fb] flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#f093fb] rounded-full pulse-glow"></span>
                            能力匹配度分析
                          </h3>
                          {radarShortest && (
                            <div className="flex items-center gap-2 text-sm">
                              <AlertTriangle className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                              <span className="text-amber-400">
                                短板：<span className="font-medium">{radarShortest}</span>
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col lg:flex-row items-center gap-6">
                          <div className="w-full lg:w-1/2 h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                <PolarAngleAxis
                                  dataKey="subject"
                                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                                />
                                <PolarRadiusAxis
                                  angle={90}
                                  domain={[0, 100]}
                                  tick={{ fill: '#71717a', fontSize: 10 }}
                                  tickCount={5}
                                />
                                <Radar
                                  name="当前水平"
                                  dataKey="score"
                                  stroke="#f093fb"
                                  fill="#f093fb"
                                  fillOpacity={0.2}
                                  strokeWidth={2}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3">
                            {radarData.map((item) => (
                              <div
                                key={item.subject}
                                className={`p-3 rounded-xl ${
                                  item.subject === radarShortest
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : 'bg-muted border border-border'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${
                                    item.subject === radarShortest ? 'text-amber-400' : 'text-foreground-secondary'
                                  }`}>
                                    {item.subject}
                                  </span>
                                  {item.subject === radarShortest && (
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                                  )}
                                </div>
                                <div className="mt-2 flex items-end gap-1">
                                  <span className={`text-2xl font-bold ${
                                    item.subject === radarShortest ? 'text-amber-400' : 'text-[#f093fb]'
                                  }`}>
                                    {item.score}
                                  </span>
                                  <span className="text-xs text-muted-foreground mb-1">/100</span>
                                </div>
                                <div className="mt-2 h-1.5 bg-accent rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      item.subject === radarShortest ? 'bg-amber-400' : 'bg-[#f093fb]'
                                    }`}
                                    style={{ width: `${item.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="report-content text-[15px]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ li: CustomListItem }}>{evaluateContent}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Resume Evaluation Loading - MagicUI */}
                {viewMode === 'evaluate' && isEvaluating && !evaluateContent && (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#f093fb]/30 via-[#f5576c]/30 to-[#f093fb]/30 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-[#f093fb] to-[#f5576c] shadow-2xl shadow-[#f093fb]/30 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-foreground animate-spin" strokeWidth={1.5} />
                      </div>
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2" />
                      </div>
                    </div>
                    <p className="text-base font-medium text-[#f093fb] mb-1">正在评估简历与岗位匹配度...</p>
                    <p className="text-sm text-muted-foreground mb-2">资深招聘经理视角深度分析中</p>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#f093fb]/20 text-[#f093fb] border border-[#f093fb]/30">
                      已用时 {formatWaitTime(waitTime)}
                    </span>
                  </div>
                )}

                {/* Resume Optimization Result */}
                {viewMode === 'optimize' && optimizeContent && (
                  <div className="report-content text-[15px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ li: CustomListItem }}>{optimizeContent}</ReactMarkdown>
                  </div>
                )}

                {/* Resume Optimization Loading - MagicUI */}
                {viewMode === 'optimize' && isOptimizing && !optimizeContent && (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#43e97b]/30 via-[#38f9d7]/30 to-[#43e97b]/30 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-[#43e97b] to-[#38f9d7] shadow-2xl shadow-[#43e97b]/30 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 text-foreground animate-spin" strokeWidth={1.5} />
                      </div>
                      <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full -translate-x-1/2" />
                      </div>
                    </div>
                    <p className="text-base font-medium text-[#43e97b] mb-1">正在优化简历内容...</p>
                    <p className="text-sm text-muted-foreground mb-2">资深职业顾问深度优化中</p>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#43e97b]/20 text-[#43e97b] border border-[#43e97b]/30">
                      已用时 {formatWaitTime(waitTime)}
                    </span>
                  </div>
                )}

                {/* Default State - MagicUI */}
                {viewMode === 'input' && !content && !isLoading && !error && (
                  <div className="flex flex-col items-center justify-center py-24">
                    {/* AI 助手图标动画 - MagicUI Style */}
                    <div className="relative mb-8 float-animation">
                      <div className="absolute inset-0 bg-gradient-to-r from-[#667eea]/30 to-[#f093fb]/30 rounded-full blur-2xl animate-pulse" />
                      <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 shadow-2xl shadow-[#667eea]/20 flex items-center justify-center backdrop-blur-sm">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#667eea]/10 to-[#f093fb]/10" />
                        <Sparkles className="relative h-12 w-12 text-[#667eea] animate-pulse" strokeWidth={1.5} />

                        {/* 装饰性小圆点 */}
                        <div className="absolute top-3 right-3 w-2 h-2 bg-[#f093fb] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="absolute bottom-4 left-3 w-1.5 h-1.5 bg-[#43e97b] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        <div className="absolute top-1/2 -right-1 w-1 h-1 bg-[#f59e0b] rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
                      </div>
                    </div>

                    <h3 className="text-xl font-semibold text-foreground mb-2">准备开始分析</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                      上传简历并输入岗位信息，AI 将为你提供深度分析和优化建议
                    </p>

                    {/* 功能特性展示 - MagicUI */}
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#667eea]/20 border border-[#667eea]/30 flex items-center justify-center">
                          <Search className="h-3 w-3 text-[#667eea]" strokeWidth={1.5} />
                        </div>
                        <span>智能解析</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#f093fb]/20 border border-[#f093fb]/30 flex items-center justify-center">
                          <UserCheck className="h-3 w-3 text-[#f093fb]" strokeWidth={1.5} />
                        </div>
                        <span>匹配评估</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#43e97b]/20 border border-[#43e97b]/30 flex items-center justify-center">
                          <PenLine className="h-3 w-3 text-[#43e97b]" strokeWidth={1.5} />
                        </div>
                        <span>简历优化</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error State - MagicUI */}
                {viewMode === 'input' && error && (
                  <div className="p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                          {(error.missingFields?.length ?? 0) > 0
                            ? `缺少必要信息：${error.missingFields?.join('、')}`
                            : '分析出错'}
                        </h3>
                        <p className="text-amber-800 dark:text-amber-200/90 text-sm mb-3">{error.message}</p>
                        {error.suggestion && (
                          <div className="bg-amber-100 dark:bg-black/30 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200/80 border border-amber-200 dark:border-border/50">
                            <p className="font-medium mb-1">💡 建议格式：</p>
                            <pre className="whitespace-pre-wrap font-mono text-xs text-amber-700 dark:text-amber-200/70 leading-relaxed">
                              {error.suggestion}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {viewMode === 'input' && content && (
                  <div className="report-content text-[15px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ li: CustomListItem }}>{content}</ReactMarkdown>
                  </div>
                )}

                {/* Loading States - MagicUI */}
                {isLoading && !content && (
                  <div className="flex items-center gap-3 text-[#667eea] p-4">
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                    <span className="text-muted-foreground">正在解析岗位信息... ({formatWaitTime(waitTime)})</span>
                  </div>
                )}

                {isLoading && content && (
                  <div className="flex items-center gap-3 text-[#667eea] p-4 bg-[#667eea]/10 rounded-xl border border-[#667eea]/20">
                    <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                    <span className="text-foreground-secondary">AI 正在生成分析报告... ({formatWaitTime(waitTime)})</span>
                  </div>
                )}

                <div ref={reportEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}
      </main>

      {/* Settings Dialog */}
      {showSettingsDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettingsDialog(false);
          }}
        >
          <div className="bg-background border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">API 设置</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">选择 AI 提供商并配置 API Key</p>

            <div className="space-y-4">
              {/* AI Provider Selection */}
              <div>
                <label className="text-sm font-medium block mb-1.5">AI 提供商</label>
                <div className="grid grid-cols-5 gap-1">
                  {(['deepseek', 'openai', 'anthropic', 'moonshot', 'gemini'] as AIProvider[]).map((provider) => (
                    <button
                      key={provider}
                      onClick={() => {
                          setAiProviderInput(provider);
                          setApiKeyInput(getApiKeyForProvider(provider));
                        }}
                      className={`px-1 py-2 rounded-lg text-xs font-medium transition-all truncate ${
                        aiProviderInput === provider
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {provider === 'deepseek' && 'DeepSeek'}
                      {provider === 'openai' && 'OpenAI'}
                      {provider === 'anthropic' && 'Claude'}
                      {provider === 'moonshot' && 'Moonshot'}
                      {provider === 'gemini' && 'Gemini'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Input */}
              <div>
                <label className="text-sm font-medium block mb-1.5">
                  {aiProviderInput === 'deepseek' && 'DeepSeek API Key'}
                  {aiProviderInput === 'openai' && 'OpenAI API Key'}
                  {aiProviderInput === 'anthropic' && 'Anthropic API Key'}
                  {aiProviderInput === 'moonshot' && 'Moonshot API Key'}
                  {aiProviderInput === 'gemini' && 'Gemini API Key'}
                </label>
                <Input
                  type="password"
                  placeholder={
                    aiProviderInput === 'deepseek' ? 'sk-...' :
                    aiProviderInput === 'openai' ? 'sk-...' :
                    aiProviderInput === 'anthropic' ? 'sk-ant-...' :
                    aiProviderInput === 'moonshot' ? 'sk-...' :
                    'AIza...'
                  }
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {aiProviderInput === 'deepseek' && (
                    <>
                      没有 API Key？前往 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DeepSeek 开放平台</a> 免费申请
                    </>
                  )}
                  {aiProviderInput === 'openai' && (
                    <>
                      没有 API Key？前往 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a> 获取
                    </>
                  )}
                  {aiProviderInput === 'anthropic' && (
                    <>
                      没有 API Key？前往 <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Anthropic Console</a> 获取
                    </>
                  )}
                  {aiProviderInput === 'moonshot' && (
                    <>
                      没有 API Key？前往 <a href="https://platform.moonshot.cn/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Moonshot 开放平台</a> 获取
                    </>
                  )}
                  {aiProviderInput === 'gemini' && (
                    <>
                      没有 API Key？前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a> 获取
                    </>
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSettingsDialog(false)}
                >
                  取消
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setApiKey(apiKeyInput);
                    setAiProvider(aiProviderInput);
                    localStorage.setItem(`jobanalyzer_api_key_${aiProviderInput}`, apiKeyInput);
                    localStorage.setItem("jobanalyzer_ai_provider", aiProviderInput);
                    setShowSettingsDialog(false);
                  }}
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 回到顶部按钮 */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-[#667eea]/30 hover:shadow-xl hover:shadow-[#667eea]/50 hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex items-center justify-center"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

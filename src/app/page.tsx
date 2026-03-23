'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles, Send, Lightbulb, History, Trash2, CheckCircle2, Circle, X, GitCompare, ArrowLeft, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useJobRecords, JobRecord } from '@/lib/hooks';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface ErrorDetails {
  message: string;
  suggestion?: string;
  missingFields?: string[];
}

type ViewMode = 'input' | 'compare';

export default function Home() {
  const [input, setInput] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<ErrorDetails | null>(null);
  const [parsedInfo, setParsedInfo] = useState<{ company?: string; position?: string }>({});
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [compareContent, setCompareContent] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const reportEndRef = useRef<HTMLDivElement>(null);

  const { records, addRecord, toggleApplied, deleteRecord, stats, loaded } = useJobRecords();

  // 过滤历史记录
  const filteredRecords = records.filter(record => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      record.company.toLowerCase().includes(query) ||
      record.position.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    if (content && reportEndRef.current) {
      reportEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [content]);

  // 开始对比模式
  const startCompare = () => {
    setViewMode('compare');
    setCompareSelection([]);
    setCompareContent('');
    setShowHistory(true);
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
    setCompareContent('');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setCompareContent(prev => prev + chunk);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setCompareContent('对比分析出错：' + err.message);
      }
    } finally {
      setIsComparing(false);
      abortControllerRef.current = null;
    }
  };

  const onSubmit = useCallback(async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setIsParsing(true);
    setContent('');
    setError(null);
    setParsedInfo({});
    setCurrentRecordId(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setContent((prev) => prev + chunk);
        setIsParsing(false); // 收到第一个 chunk，解析完成

        if (!parsedInfo.company) {
          const companyMatch = fullContent.match(/公司名称[：:]\s*(.+)/);
          const positionMatch = fullContent.match(/岗位名称[：:]\s*(.+)/);
          if (companyMatch || positionMatch) {
            setParsedInfo({
              company: companyMatch?.[1]?.trim(),
              position: positionMatch?.[1]?.trim(),
            });
          }
        }
      }

      const company = parsedInfo.company || fullContent.match(/公司名称[：:]\s*(.+)/)?.[1]?.trim() || '未知公司';
      const position = parsedInfo.position || fullContent.match(/岗位名称[：:]\s*(.+)/)?.[1]?.trim() || '未知岗位';

      const id = addRecord({
        company,
        position,
        content: fullContent,
        inputText: input,
      });
      setCurrentRecordId(id);
      setParsedInfo({ company, position });
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
  }, [input, parsedInfo, addRecord]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setIsParsing(false);
      setIsComparing(false);
    }
  }, []);

  const useExample = () => {
    setInput(EXAMPLE_INPUT);
  };

  const loadRecord = (record: JobRecord) => {
    setContent(record.content);
    setParsedInfo({ company: record.company, position: record.position });
    setCurrentRecordId(record.id);
    setInput(record.inputText);
    setShowHistory(false);
    setViewMode('input');
  };

  const clearCurrent = () => {
    setContent('');
    setParsedInfo({});
    setCurrentRecordId(null);
    setInput('');
    setError(null);
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#00AEEF]/20 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00AEEF] to-[#0077B6] shadow-lg shadow-[#00AEEF]/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#00AEEF] tracking-tight">岗位分析助手</h1>
                <p className="text-sm text-[#0077B6]">AI 驱动的求职决策工具</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <Badge variant="secondary" className="bg-[#00AEEF]/10 text-[#0077B6] border-[#00AEEF]/30">
                  共分析 {stats.total} 个岗位
                </Badge>
                <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  已投递 {stats.applied}
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="border-[#00AEEF]/30 text-[#0077B6] hover:bg-[#00AEEF]/10"
              >
                <History className="h-4 w-4 mr-2" />
                历史记录
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className={`grid gap-6 ${viewMode === 'compare' ? 'lg:grid-cols-[280px,2fr]' : 'lg:grid-cols-[280px,1fr,1.5fr]'}`}>
          {/* Left: History Panel */}
          {showHistory && (
            <Card className="h-fit border-[#00AEEF]/20 bg-white/90 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base text-[#0077B6]">
                  <span className="flex items-center gap-2">
                    {viewMode === 'compare' ? (
                      <>
                        <GitCompare className="h-4 w-4" />
                        选择对比岗位
                      </>
                    ) : (
                      <>
                        <History className="h-4 w-4" />
                        分析历史
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setShowHistory(false);
                      setViewMode('input');
                    }}
                    className="text-[#0077B6]/50 hover:text-[#0077B6]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0077B6]/50" />
                  <Input
                    placeholder="搜索公司或岗位..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 border-[#00AEEF]/20 focus:border-[#00AEEF] text-sm"
                  />
                </div>

                {viewMode === 'compare' && (
                  <div className="bg-[#00AEEF]/5 rounded-lg p-3 text-sm text-[#0077B6]">
                    <p className="mb-2">请选择 2 个岗位进行对比</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={executeCompare}
                        disabled={compareSelection.length !== 2 || isComparing}
                        className="flex-1 bg-[#00AEEF] hover:bg-[#0077B6]"
                      >
                        {isComparing ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            对比中
                          </>
                        ) : (
                          <>
                            <GitCompare className="h-3 w-3 mr-1" />
                            开始对比
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelCompare}
                        className="border-[#00AEEF]/30"
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                )}

                {filteredRecords.length === 0 ? (
                  <p className="text-sm text-[#0077B6]/60 text-center py-4">
                    {searchQuery ? '未找到匹配的岗位' : '暂无分析记录'}
                  </p>
                ) : (
                  filteredRecords.map((record) =>(
                    <div
                      key={record.id}
                      className={`p-3 rounded-xl border transition-all group ${
                        viewMode === 'compare' && compareSelection.includes(record.id)
                          ? 'border-[#00AEEF] bg-[#00AEEF]/10'
                          : currentRecordId === record.id
                          ? 'border-[#00AEEF] bg-[#00AEEF]/5'
                          : 'border-[#00AEEF]/10 hover:border-[#00AEEF]/30 bg-white/50'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {viewMode === 'compare' ? (
                          <Checkbox
                            checked={compareSelection.includes(record.id)}
                            onCheckedChange={() => toggleCompareSelection(record.id)}
                            className="mt-0.5 border-[#00AEEF]/50 data-[state=checked]:bg-[#00AEEF] data-[state=checked]:border-[#00AEEF]"
                          />
                        ) : (
                          <Checkbox
                            checked={record.applied}
                            onCheckedChange={() => toggleApplied(record.id)}
                            className="mt-0.5 border-[#00AEEF]/50 data-[state=checked]:bg-[#00AEEF] data-[state=checked]:border-[#00AEEF]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => viewMode !== 'compare' && loadRecord(record)}
                        >
                          <p className="font-medium text-[#0077B6] text-sm truncate">{record.company}</p>
                          <p className="text-xs text-[#0077B6]/70 truncate">{record.position}</p>
                          <p className="text-xs text-[#0077B6]/50 mt-1">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {viewMode !== 'compare' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecord(record.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Middle: Input Form - Hidden in compare mode */}
          {viewMode !== 'compare' && (
          <div className={`space-y-4 ${showHistory ? '' : 'lg:col-span-1'}`}>
            <Card className="border-[#00AEEF]/20 bg-white/90 backdrop-blur shadow-lg shadow-[#00AEEF]/5">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base text-[#0077B6]">
                  <Send className="h-4 w-4" />
                  输入岗位信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`直接粘贴你看到的岗位信息，例如：

公司名：字节跳动
岗位：产品经理

或者粘贴完整的招聘文案，AI 会自动识别...`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={12}
                  disabled={isLoading}
                  className="resize-none border-[#00AEEF]/20 focus:border-[#00AEEF] focus:ring-[#00AEEF]/20 bg-white/80"
                />

                <div className="flex gap-2">
                  {isLoading || isParsing ? (
                    <Button variant="destructive" className="flex-1" onClick={handleStop}>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isParsing ? '解析中...点击停止' : '停止生成'}
                    </Button>
                  ) : (
                    <Button
                      onClick={onSubmit}
                      disabled={!input.trim()}
                      className="flex-1 bg-gradient-to-r from-[#00AEEF] to-[#0077B6] hover:from-[#0095CC] hover:to-[#006699] text-white shadow-lg shadow-[#00AEEF]/30"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      开始分析
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={useExample}
                    className="text-sm text-[#00AEEF] hover:text-[#0077B6] flex items-center gap-1 transition-colors"
                    disabled={isLoading}
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    查看示例
                  </button>

                  <div className="flex items-center gap-2">
                    {content && (
                      <button
                        onClick={clearCurrent}
                        className="text-sm text-[#0077B6]/60 hover:text-red-500 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        清空
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compare Button */}
            {records.length >= 2 && (
              <Card className="border-[#00AEEF]/10 bg-gradient-to-br from-[#00AEEF]/10 to-[#0077B6]/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0077B6] mb-1">岗位对比</h3>
                      <p className="text-xs text-[#0077B6]/70">选择两个岗位进行深度对比分析</p>
                    </div>
                    <Button
                      onClick={startCompare}
                      className="bg-[#00AEEF] hover:bg-[#0077B6] text-white"
                      size="sm"
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      开始对比
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips Card */}
            <Card className="border-[#00AEEF]/10 bg-gradient-to-br from-[#00AEEF]/5 to-transparent">
              <CardContent className="pt-6">
                <h3 className="text-sm font-semibold text-[#0077B6] mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#00AEEF]" />
                  使用提示
                </h3>
                <ul className="text-sm text-[#0077B6]/80 space-y-2">
                  <li className="flex gap-2">
                    <span className="text-[#00AEEF]">•</span>
                    <span>直接粘贴招聘网站的内容即可</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#00AEEF]">•</span>
                    <span>支持 Boss直聘、拉勾、猎聘等格式</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#00AEEF]">•</span>
                    <span>历史记录中可选中两个岗位进行对比</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Right: Analysis Result */}
          <div className={viewMode === 'compare' || !showHistory ? 'lg:col-span-2' : ''}>
            <Card className="min-h-[700px] border-[#00AEEF]/20 bg-white/90 backdrop-blur shadow-lg shadow-[#00AEEF]/5">
              <CardHeader className="border-b border-[#00AEEF]/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#0077B6]">
                    {viewMode === 'compare' ? (
                      <span className="flex items-center gap-2">
                        <GitCompare className="h-5 w-5" />
                        岗位对比分析
                      </span>
                    ) : (
                      '分析报告'
                    )}
                  </CardTitle>
                  {viewMode === 'compare' && compareContent && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompareContent('')}
                      className="border-[#00AEEF]/30"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      重新选择
                    </Button>
                  )}
                  {viewMode === 'input' && parsedInfo.company && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#00AEEF]/10 text-[#0077B6] border-[#00AEEF]/30">
                        {parsedInfo.company} · {parsedInfo.position}
                      </Badge>
                      {currentRecordId && (
                        <button
                          onClick={() => toggleApplied(currentRecordId)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            records.find(r => r.id === currentRecordId)?.applied
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                          }`}
                        >
                          {records.find(r => r.id === currentRecordId)?.applied ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              已投递
                            </>
                          ) : (
                            <>
                              <Circle className="h-3.5 w-3.5" />
                              未投递
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Compare Result */}
                {viewMode === 'compare' && compareContent && (
                  <div className="report-content text-[15px]">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{compareContent}</ReactMarkdown>
                  </div>
                )}

                {/* Compare Selection UI */}
                {viewMode === 'compare' && !compareContent && (
                  <div className="flex flex-col items-center justify-center py-24 text-[#0077B6]/40">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#00AEEF]/10 to-[#0077B6]/10 flex items-center justify-center mb-6">
                      <GitCompare className="h-10 w-10 text-[#00AEEF]/40" />
                    </div>
                    <p className="text-base mb-2">在左侧选择两个岗位进行对比</p>
                    <p className="text-sm text-[#0077B6]/30">AI 会从多维度帮你分析哪个更值得投递</p>
                    {compareSelection.length > 0 && (
                      <div className="mt-6 flex gap-2">
                        {compareSelection.map(id => {
                          const job = records.find(r => r.id === id);
                          return job ? (
                            <Badge key={id} className="bg-[#00AEEF]/10 text-[#0077B6] border-[#00AEEF]/30">
                              {job.company} · {job.position}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Normal Analysis Result */}
                {viewMode === 'input' && !content && !isLoading && !error && (
                  <div className="flex flex-col items-center justify-center py-24 text-[#0077B6]/40">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#00AEEF]/10 to-[#0077B6]/10 flex items-center justify-center mb-6">
                      <Sparkles className="h-10 w-10 text-[#00AEEF]/40" />
                    </div>
                    <p className="text-base mb-2">输入岗位信息，开始你的专属分析</p>
                    <p className="text-sm text-[#0077B6]/30">AI 会自动识别公司、岗位和 JD 内容</p>
                  </div>
                )}

                {viewMode === 'input' && error && (
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-amber-800 mb-2">
                          {(error.missingFields?.length ?? 0) > 0
                            ? `缺少必要信息：${error.missingFields?.join('、')}`
                            : '分析出错'}
                        </h3>
                        <p className="text-amber-700 text-sm mb-3">{error.message}</p>
                        {error.suggestion && (
                          <div className="bg-white/70 rounded-lg p-3 text-sm text-amber-800">
                            <p className="font-medium mb-1">💡 建议格式：</p>
                            <pre className="whitespace-pre-wrap font-mono text-xs text-amber-700 leading-relaxed">
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                  </div>
                )}

                {isLoading && !content && (
                  <div className="flex items-center gap-3 text-[#0077B6] p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>正在解析岗位信息...</span>
                  </div>
                )}

                {isLoading && content && (
                  <div className="flex items-center gap-3 text-[#0077B6] p-4 bg-[#00AEEF]/5 rounded-xl">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>AI 正在生成分析报告...</span>
                  </div>
                )}

                <div ref={reportEndRef} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

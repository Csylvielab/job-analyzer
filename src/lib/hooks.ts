import { useState, useEffect, useCallback } from 'react';

export interface JobRecord {
  id: string;
  company: string;
  position: string;
  content: string;
  createdAt: number;
  applied: boolean;
  inputText: string;
}

const STORAGE_KEY = 'job-analyzer-records';
const RESUME_ARCHIVE_KEY = 'job-analyzer-resume-archive';
const SELECTED_RESUME_KEY = 'job-analyzer-selected-resume';

// 简历档案接口
export interface ResumeRecord {
  id: string;
  name: string;
  content: string;
  fileName?: string;
  fileType?: string;
  createdAt: number;
  updatedAt: number;
}

// 简历档案管理 hook
export function useResumeArchive() {
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // 从 localStorage 加载
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(RESUME_ARCHIVE_KEY);
      const storedSelected = localStorage.getItem(SELECTED_RESUME_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setResumes(parsed);
        } catch {
          console.error('Failed to parse stored resumes');
        }
      }
      if (storedSelected) {
        setSelectedId(storedSelected);
      }
      setLoaded(true);
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      localStorage.setItem(RESUME_ARCHIVE_KEY, JSON.stringify(resumes));
    }
  }, [resumes, loaded]);

  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      if (selectedId) {
        localStorage.setItem(SELECTED_RESUME_KEY, selectedId);
      } else {
        localStorage.removeItem(SELECTED_RESUME_KEY);
      }
    }
  }, [selectedId, loaded]);

  // 添加简历
  const addResume = useCallback((resume: Omit<ResumeRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newResume: ResumeRecord = {
      ...resume,
      id: now.toString(),
      createdAt: now,
      updatedAt: now,
    };
    setResumes((prev) => [newResume, ...prev]);
    setSelectedId(newResume.id);
    return newResume.id;
  }, []);

  // 更新简历
  const updateResume = useCallback((id: string, updates: Partial<Omit<ResumeRecord, 'id'>>) => {
    setResumes((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
      )
    );
  }, []);

  // 删除简历
  const deleteResume = useCallback((id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  }, [selectedId]);

  // 选择简历
  const selectResume = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  // 获取选中的简历
  const selectedResume = resumes.find((r) => r.id === selectedId);

  // 获取简历内容
  const getResumeContent = useCallback(() => {
    return selectedResume?.content || '';
  }, [selectedResume]);

  return {
    resumes,
    selectedId,
    selectedResume,
    loaded,
    addResume,
    updateResume,
    deleteResume,
    selectResume,
    getResumeContent,
  };
}

export function useJobRecords() {
  const [records, setRecords] = useState<JobRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 从 localStorage 加载记录
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRecords(parsed);
        } catch {
          console.error('Failed to parse stored records');
        }
      }
      setLoaded(true);
    }
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (loaded && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    }
  }, [records, loaded]);

  // 添加新记录
  const addRecord = useCallback((record: Omit<JobRecord, 'id' | 'createdAt' | 'applied'>) => {
    const newRecord: JobRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: Date.now(),
      applied: false,
    };
    setRecords((prev) => [newRecord, ...prev]);
    return newRecord.id;
  }, []);

  // 更新记录
  const updateRecord = useCallback((id: string, updates: Partial<JobRecord>) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id ? { ...record, ...updates } : record
      )
    );
  }, []);

  // 切换投递状态
  const toggleApplied = useCallback((id: string) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === id ? { ...record, applied: !record.applied } : record
      )
    );
  }, []);

  // 全选/取消全选投递状态
  const toggleAllApplied = useCallback((ids: string[], applied: boolean) => {
    setRecords((prev) =>
      prev.map((record) =>
        ids.includes(record.id) ? { ...record, applied } : record
      )
    );
  }, []);

  // 删除记录
  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== id));
  }, []);

  // 清空所有记录
  const clearAll = useCallback(() => {
    if (confirm('确定要清空所有历史记录吗？')) {
      setRecords([]);
    }
  }, []);

  // 获取单个记录
  const getRecord = useCallback(
    (id: string) => records.find((r) => r.id === id),
    [records]
  );

  // 统计数据
  const stats = {
    total: records.length,
    applied: records.filter((r) => r.applied).length,
    notApplied: records.filter((r) => !r.applied).length,
  };

  return {
    records,
    loaded,
    addRecord,
    updateRecord,
    toggleApplied,
    toggleAllApplied,
    deleteRecord,
    clearAll,
    getRecord,
    stats,
  };
}

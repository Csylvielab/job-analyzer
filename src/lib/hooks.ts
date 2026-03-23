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
    deleteRecord,
    clearAll,
    getRecord,
    stats,
  };
}

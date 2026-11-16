import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, Lock, Upload } from 'lucide-react';
import { AttendanceRecord } from '../types/attendance';
import { TransactionRecord } from '../types/transaction';

export interface ClassroomExportPayload {
  version: number;
  exportedAt: string;
  classroomName: string;
  classroomAddress: string;
  data: {
    transactions: TransactionRecord[];
    attendanceRecords: AttendanceRecord[];
    hiddenStudentIds: string[];
  };
}

interface DataManagementModuleProps {
  transactions: TransactionRecord[];
  attendanceRecords: AttendanceRecord[];
  hiddenStudentIds: string[];
  classroomAddress: string;
  onRequestUnlock: (featureName: string) => void;
}

export const DataManagementModule: React.FC<DataManagementModuleProps> = ({
  transactions,
  attendanceRecords,
  hiddenStudentIds,
  classroomAddress,
  onRequestUnlock,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearSet = new Set<number>([currentYear - 1, currentYear, currentYear + 1]);
    transactions.forEach((t) => {
      const d = new Date(t.createdAt);
      if (!Number.isNaN(d.getTime())) yearSet.add(d.getFullYear());
    });
    attendanceRecords.forEach((r) => {
      const y = Number(r.date.slice(0, 4));
      if (!Number.isNaN(y) && y > 2000) yearSet.add(y);
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions, attendanceRecords]);

  const selectedMonthPreviewCounts = useMemo(() => {
    const txCount = transactions.filter((tx) => {
      const d = new Date(tx.createdAt);
      return (
        !Number.isNaN(d.getTime()) &&
        d.getFullYear() === selectedYear &&
        d.getMonth() + 1 === selectedMonth
      );
    }).length;
    const monthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-`;
    const attCount = attendanceRecords.filter((rec) => rec.date.startsWith(monthPrefix)).length;
    return { txCount, attCount };
  }, [transactions, attendanceRecords, selectedYear, selectedMonth]);

  const handleExportJson = () => {
    const payload: ClassroomExportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      classroomName: '教室系統',
      classroomAddress,
      data: {
        transactions,
        attendanceRecords,
        hiddenStudentIds,
      },
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const today = new Date();
    const dateStamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(
      2,
      '0'
    )}${String(today.getDate()).padStart(2, '0')}`;

    const link = document.createElement('a');
    link.href = url;
    link.download = `教室系統_所有資料備份_${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="data-heading" className="space-y-6">
      {/* Page Title & Unboxed Summary */}
      <div className="space-y-1.5">
        <h1
          id="data-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 text-balance"
        >
          資料處理
        </h1>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600 tabular-nums">
          <span>
            交易紀錄 <strong className="font-semibold text-slate-900">{transactions.length}</strong> 筆
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            學生出席紀錄{' '}
            <strong className="font-semibold text-slate-900">{attendanceRecords.length}</strong> 筆
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>
            隱藏名單 <strong className="font-semibold text-slate-900">{hiddenStudentIds.length}</strong> 人
          </span>
        </div>
      </div>

      {/* Two-Column Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: JSON Backup (Unlocked) & Restore (Locked) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">系統資料備份與還原（JSON）</h2>
            <p className="text-sm text-slate-500">
              將交易紀錄、學生出席紀錄及隱藏名單完整匯出為 JSON 備份；如需從備份檔案還原資料，請解鎖完整功能。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              導出JSON (所有資料)
            </button>

            <button
              type="button"
              onClick={() => onRequestUnlock('資料還原（導入 JSON）')}
              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-600" aria-hidden="true" />
              <span>導入JSON (所有資料)</span>
              <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Card 2: Monthly Comprehensive Report (Locked) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">月度整全報表</h2>
            <p className="text-sm text-slate-500">
              選擇年份及月份，整合產生該月份的交易紀錄及所有學生出席紀錄，支援預覽、列印及下載 PDF。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <select
              aria-label="選擇報表年份"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-10 px-3 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 cursor-pointer tabular-nums"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>

            <select
              aria-label="選擇報表月份"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-10 px-3 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 cursor-pointer tabular-nums"
            >
              {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => onRequestUnlock('月度整全報表')}
              className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>出整全報表</span>
              <Lock className="h-3.5 w-3.5 text-blue-200" aria-hidden="true" />
            </button>
          </div>

          <p className="text-xs text-slate-500 tabular-nums pt-1 border-t border-slate-100">
            {selectedYear} 年 {selectedMonth} 月包含：交易紀錄{' '}
            <strong className="font-semibold text-slate-700">
              {selectedMonthPreviewCounts.txCount}
            </strong>{' '}
            筆 · 學生出席紀錄{' '}
            <strong className="font-semibold text-slate-700">
              {selectedMonthPreviewCounts.attCount}
            </strong>{' '}
            筆
          </p>
        </div>
      </div>
    </section>
  );
};

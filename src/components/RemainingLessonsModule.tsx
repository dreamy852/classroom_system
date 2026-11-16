import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  EyeOff,
  Search,
  XCircle,
} from 'lucide-react';
import {
  LessonFilter,
  RemainingLessonStatus,
  SortDirection,
  SortField,
  StudentLessonSummary,
} from '../types/student';

interface RemainingLessonsModuleProps {
  summaries: StudentLessonSummary[];
  onHideStudent: (studentId: string) => void;
  onUnhideStudent: (studentId: string) => void;
}

function getStatusMeta(status: RemainingLessonStatus): {
  rank: number;
  textColor: string;
  icon: React.ReactNode;
} {
  if (status === '催繳') {
    return {
      rank: 0,
      textColor: 'text-red-700',
      icon: <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />,
    };
  }
  if (status === '快用完') {
    return {
      rank: 1,
      textColor: 'text-amber-700',
      icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />,
    };
  }
  return {
    rank: 2,
    textColor: 'text-emerald-700',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />,
  };
}

export const RemainingLessonsModule: React.FC<RemainingLessonsModuleProps> = ({
  summaries,
  onHideStudent,
  onUnhideStudent,
}) => {
  const [viewMode, setViewMode] = useState<'visible' | 'hidden'>('visible');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LessonFilter>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const visibleStudents = useMemo(
    () => summaries.filter((s) => !s.isHidden),
    [summaries]
  );
  const hiddenStudents = useMemo(
    () => summaries.filter((s) => s.isHidden),
    [summaries]
  );

  const activePool = viewMode === 'visible' ? visibleStudents : hiddenStudents;

  const stats = useMemo(() => {
    const totalStudents = visibleStudents.length;
    const totalRemaining = visibleStudents.reduce((sum, s) => sum + s.remainingLessons, 0);
    const goodCount = visibleStudents.filter((s) => s.status === '良好').length;
    const soonCount = visibleStudents.filter((s) => s.status === '快用完').length;
    const urgeCount = visibleStudents.filter((s) => s.status === '催繳').length;
    return {
      totalStudents,
      totalRemaining: Math.round(totalRemaining * 10) / 10,
      goodCount,
      soonCount,
      urgeCount,
    };
  }, [visibleStudents]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = activePool.filter((student) => {
      const matchesQuery =
        q === '' ||
        student.studentName.toLowerCase().includes(q) ||
        student.studentId.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (viewMode === 'visible') {
        if (statusFilter === 'good') return student.status === '良好';
        if (statusFilter === 'soon') return student.status === '快用完';
        if (statusFilter === 'urge') return student.status === '催繳';
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.studentName.localeCompare(b.studentName, 'zh-Hant');
      } else if (sortField === 'remainingLessons') {
        comparison = a.remainingLessons - b.remainingLessons;
      } else {
        comparison = getStatusMeta(a.status).rank - getStatusMeta(b.status).rank;
        if (comparison === 0) {
          comparison = a.remainingLessons - b.remainingLessons;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [activePool, searchQuery, statusFilter, viewMode, sortField, sortDirection]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <section aria-labelledby="remaining-heading" className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1
            id="remaining-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 text-balance"
          >
            剩餘堂數紀錄
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600 tabular-nums">
            <span>
              顯示學生 <strong className="font-semibold text-slate-900">{stats.totalStudents}</strong> 人
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              總剩餘堂數{' '}
              <strong className="font-semibold text-slate-900">{stats.totalRemaining}</strong> 堂
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              快用完{' '}
              <strong className={stats.soonCount > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-slate-900'}>
                {stats.soonCount}
              </strong>{' '}
              人
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              催繳{' '}
              <strong className={stats.urgeCount > 0 ? 'font-semibold text-red-700' : 'font-semibold text-slate-900'}>
                {stats.urgeCount}
              </strong>{' '}
              人
            </span>
          </div>
          <p className="text-xs text-slate-500">
            計算方式：剩餘堂數 = 購買堂數（連試堂視為 1 整堂課）− 已上堂數（出席狀況為「是」）
          </p>
        </div>

        {/* Toggle Visible / Hidden List */}
        <div
          role="group"
          aria-label="顯示名單模式"
          className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setViewMode('visible')}
            className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'visible'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            正常顯示 ({visibleStudents.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hidden')}
            className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              viewMode === 'hidden'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            隱藏名單 ({hiddenStudents.length})
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋學生姓名或 5 位數 ID..."
              aria-label="搜尋學生姓名或編號"
              className="w-full h-10 pl-9 pr-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            />
          </div>

          {viewMode === 'visible' && (
            <div
              role="group"
              aria-label="按狀態篩選"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
            >
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                全部 ({visibleStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('good')}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'good'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                良好 ({stats.goodCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('soon')}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'soon'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                快用完 ({stats.soonCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('urge')}
                className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'urge'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                催繳 ({stats.urgeCount})
              </button>
            </div>
          )}
        </div>

        {/* Table or Empty State */}
        {activePool.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-medium text-slate-900">
              {viewMode === 'hidden' ? '目前沒有已隱藏的學生' : '目前沒有任何學生紀錄'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              {viewMode === 'hidden'
                ? '被隱藏的學生會顯示在此處，您可以隨時取消隱藏。'
                : '於「交易紀錄」新增交易後，系統會自動計算每位學生的剩餘堂數。'}
            </p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-base font-medium text-slate-900">找不到符合條件的學生</p>
            <p className="mt-1.5 text-sm text-slate-500">
              請嘗試更改搜尋關鍵字或切換篩選條件。
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="inline-flex items-center h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                顯示全部學生
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 pl-5 pr-3 w-14 font-mono">
                    #
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('name')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      學生姓名（附 ID）
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    購買堂數
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    已上堂數
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('remainingLessons')}
                      className="inline-flex items-center justify-end gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      剩餘堂數
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('status')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      狀態
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAndSorted.map((student, index) => {
                  const statusMeta = getStatusMeta(student.status);

                  return (
                    <tr key={student.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-5 pr-3 font-mono text-xs text-slate-400 tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {student.studentName}{' '}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          ({student.studentId})
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {student.purchasedLessons}{' '}
                        <span className="font-sans text-xs font-normal text-slate-500">堂</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {student.attendedLessons}{' '}
                        <span className="font-sans text-xs font-normal text-slate-500">堂</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        <span
                          className={
                            student.remainingLessons <= 0
                              ? 'text-red-700'
                              : student.remainingLessons <= 2
                                ? 'text-amber-700'
                                : 'text-slate-900'
                          }
                        >
                          {student.remainingLessons}
                        </span>{' '}
                        <span className="font-sans text-xs font-normal text-slate-500">堂</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusMeta.textColor}`}
                        >
                          {statusMeta.icon}
                          {student.status}
                        </span>
                      </td>

                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        {viewMode === 'visible' ? (
                          <button
                            type="button"
                            onClick={() => onHideStudent(student.studentId)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <EyeOff className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            隱藏
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onUnhideStudent(student.studentId)}
                            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-blue-800 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50/70 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                            取消隱藏
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

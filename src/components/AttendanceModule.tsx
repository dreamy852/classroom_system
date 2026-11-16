import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Copy,
  Lock,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AttendanceFilter,
  AttendanceRecord,
  AttendanceSortField,
  SortDirection,
} from '../types/attendance';
import { StudentIdentity } from '../types/student';

interface AttendanceModuleProps {
  records: AttendanceRecord[];
  students: StudentIdentity[];
  onAddRecord: (data: Omit<AttendanceRecord, 'id' | 'atnId' | 'createdAt'>) => void;
  onUpdateRecord: (
    id: string,
    data: Omit<AttendanceRecord, 'id' | 'atnId' | 'createdAt'>
  ) => void;
  onToggleAttended: (id: string, attended: boolean) => void;
  onDeleteRecord: (id: string) => void;
  isAddModalOpen: boolean;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
  onRequestUnlock: (featureName: string) => void;
}

function getTodayDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  records,
  students,
  onAddRecord,
  onUpdateRecord,
  onToggleAttended,
  onDeleteRecord,
  isAddModalOpen,
  onOpenAddModal,
  onCloseAddModal,
  onRequestUnlock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceFilter>('all');
  const [sortField, setSortField] = useState<AttendanceSortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Form modal state (used for Add, Edit, and Copy)
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'copy' | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [formStudentId, setFormStudentId] = useState('');
  const [formDate, setFormDate] = useState(getTodayDateString);
  const [formStartTime, setFormStartTime] = useState('16:00');
  const [formEndTime, setFormEndTime] = useState('17:00');
  const [formAttended, setFormAttended] = useState(false);
  const [formError, setFormError] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const studentSelectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (isAddModalOpen) {
      setModalMode('add');
      setEditingRecordId(null);
      setFormStudentId(students[0]?.id ?? '');
      setFormDate(getTodayDateString());
      setFormStartTime('16:00');
      setFormEndTime('17:00');
      setFormAttended(false);
      setFormError('');
      const timer = window.setTimeout(() => {
        studentSelectRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isAddModalOpen, students]);

  useEffect(() => {
    if (!modalMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFormModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMode]);

  const closeFormModal = () => {
    setModalMode(null);
    setEditingRecordId(null);
    setFormError('');
    onCloseAddModal();
  };

  const openEditModal = (record: AttendanceRecord) => {
    setDeletingId(null);
    setModalMode('edit');
    setEditingRecordId(record.id);
    setFormStudentId(record.studentId);
    setFormDate(record.date);
    setFormStartTime(record.startTime);
    setFormEndTime(record.endTime);
    setFormAttended(record.attended);
    setFormError('');
    window.setTimeout(() => {
      dateInputRef.current?.focus();
    }, 40);
  };

  const openCopyModal = (record: AttendanceRecord) => {
    setDeletingId(null);
    setModalMode('copy');
    setEditingRecordId(null);
    setFormStudentId(record.studentId);
    setFormDate(record.date);
    setFormStartTime(record.startTime);
    setFormEndTime(record.endTime);
    setFormAttended(record.attended);
    setFormError('');
    window.setTimeout(() => {
      dateInputRef.current?.focus();
    }, 40);
  };

  const stats = useMemo(() => {
    const total = records.length;
    const attendedCount = records.filter((r) => r.attended).length;
    const pendingCount = total - attendedCount;
    return { total, attendedCount, pendingCount };
  }, [records]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = records.filter((rec) => {
      if (statusFilter === 'yes' && !rec.attended) return false;
      if (statusFilter === 'no' && rec.attended) return false;
      if (q === '') return true;
      return (
        rec.studentName.toLowerCase().includes(q) ||
        rec.studentId.toLowerCase().includes(q) ||
        rec.atnId.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'atnId') {
        comparison = a.atnId.localeCompare(b.atnId);
      } else if (sortField === 'studentName') {
        comparison = a.studentName.localeCompare(b.studentName, 'zh-Hant');
      } else {
        comparison = a.date.localeCompare(b.date);
        if (comparison === 0) {
          comparison = a.startTime.localeCompare(b.startTime);
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [records, searchQuery, statusFilter, sortField, sortDirection]);

  const handleToggleSort = (field: AttendanceSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedStudent = students.find((s) => s.id === formStudentId);
    if (!selectedStudent) {
      setFormError('請選擇學生（如無學生，請先於「交易紀錄」加入學生）');
      return;
    }
    if (!formDate) {
      setFormError('請選擇日期');
      dateInputRef.current?.focus();
      return;
    }
    if (!formStartTime || !formEndTime) {
      setFormError('請輸入開始時間及結束時間');
      return;
    }
    if (formEndTime <= formStartTime) {
      setFormError('結束時間必須晚於開始時間');
      return;
    }

    const payload = {
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      attended: formAttended,
    };

    if (modalMode === 'edit' && editingRecordId) {
      onUpdateRecord(editingRecordId, payload);
    } else {
      onAddRecord(payload);
    }
    closeFormModal();
  };

  return (
    <section aria-labelledby="attendance-heading" className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <h1
            id="attendance-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 text-balance"
          >
            學生出席紀錄
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600 tabular-nums">
            <span>
              總紀錄 <strong className="font-semibold text-slate-900">{stats.total}</strong> 筆
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              已出席（是）{' '}
              <strong className="font-semibold text-emerald-700">{stats.attendedCount}</strong> 堂
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              尚未出席（否）{' '}
              <strong className="font-semibold text-slate-900">{stats.pendingCount}</strong> 堂
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRequestUnlock('列印學生出勤紀錄')}
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="h-4 w-4 text-slate-600" aria-hidden="true" />
          <span>列印學生出勤紀錄</span>
          <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
        </button>
      </div>

      {/* Table Container */}
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
              placeholder="搜尋學生姓名、5位數ID或出席編號..."
              aria-label="搜尋學生姓名"
              className="w-full h-10 pl-9 pr-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            />
          </div>

          <div
            role="group"
            aria-label="按出席狀況篩選"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
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
              全部 ({records.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('yes')}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'yes'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              是 ({stats.attendedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('no')}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === 'no'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              否 ({stats.pendingCount})
            </button>
          </div>
        </div>

        {/* Table or Empty State */}
        {records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-medium text-slate-900">尚未有任何出席紀錄</p>
            <p className="mt-1.5 text-sm text-slate-500">
              可在此預先規劃「否（尚未出席）」課程，或紀錄已出席課堂。
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onOpenAddModal}
                disabled={students.length === 0}
                className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                新增出席紀錄
              </button>
            </div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-base font-medium text-slate-900">找不到符合條件的出席紀錄</p>
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
                顯示全部紀錄
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th scope="col" className="py-3 pl-5 pr-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('atnId')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      出席編號 (Atn_Id)
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('date')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      日期
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    開始時間
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    結束時間
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('studentName')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      學生姓名 (ID)
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    出席狀況
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredAndSorted.map((record) => {
                  const isDeleting = deletingId === record.id;

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 pl-5 pr-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {record.atnId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-900 tabular-nums whitespace-nowrap">
                        {record.date}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {record.startTime}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {record.endTime}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {record.studentName}{' '}
                        <span className="font-mono text-xs font-normal text-slate-500">
                          ({record.studentId})
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div
                          role="group"
                          aria-label={`${record.studentName} ${record.date} 出席狀況`}
                          className="inline-flex items-center p-0.5 bg-slate-100 rounded-md"
                        >
                          <button
                            type="button"
                            onClick={() => onToggleAttended(record.id, true)}
                            aria-pressed={record.attended === true}
                            className={`h-7 px-2.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              record.attended
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            是
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleAttended(record.id, false)}
                            aria-pressed={record.attended === false}
                            className={`h-7 px-2.5 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap ${
                              !record.attended
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            否
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        {isDeleting ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-600 mr-1">確定刪除？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteRecord(record.id);
                                setDeletingId(null);
                              }}
                              className="inline-flex items-center h-9 px-3 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              確認刪除
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(null)}
                              className="inline-flex items-center h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openCopyModal(record)}
                              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-blue-800 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50/70 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                              複製
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(record)}
                              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingId(record.id)}
                              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-red-700 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                              刪除
                            </button>
                          </div>
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

      {/* Add / Edit / Copy Attendance Form Modal ("新增出席表") */}
      {modalMode !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="attendance-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeFormModal();
            }
          }}
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 id="attendance-modal-title" className="text-base font-semibold text-slate-900">
                  {modalMode === 'edit' ? '編輯出席紀錄' : '新增出席表'}
                </h2>
                {modalMode === 'copy' && (
                  <p className="text-xs text-blue-700 mt-0.5">
                    已帶入複製資料，可直接調整日期後新增紀錄
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeFormModal}
                aria-label="關閉視窗"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Student Select */}
              <div className="space-y-1.5">
                <label htmlFor="atn-student" className="block text-sm font-medium text-slate-700">
                  學生姓名（5位數 ID）
                </label>
                {students.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    目前未有學生資料，請先於「交易紀錄」加入交易以建立學生。
                  </p>
                ) : (
                  <select
                    ref={studentSelectRef}
                    id="atn-student"
                    value={formStudentId}
                    onChange={(e) => {
                      setFormStudentId(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label htmlFor="atn-date" className="block text-sm font-medium text-slate-700">
                  日期
                </label>
                <input
                  ref={dateInputRef}
                  id="atn-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => {
                    setFormDate(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>

              {/* Start Time & End Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="atn-start" className="block text-sm font-medium text-slate-700">
                    開始時間
                  </label>
                  <input
                    id="atn-start"
                    type="time"
                    value={formStartTime}
                    onChange={(e) => {
                      setFormStartTime(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="atn-end" className="block text-sm font-medium text-slate-700">
                    結束時間
                  </label>
                  <input
                    id="atn-end"
                    type="time"
                    value={formEndTime}
                    onChange={(e) => {
                      setFormEndTime(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Attended Status */}
              <div className="space-y-1.5">
                <span className="block text-sm font-medium text-slate-700">出席狀況</span>
                <div role="group" aria-label="出席狀況" className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAttended(true)}
                    aria-pressed={formAttended === true}
                    className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      formAttended
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    是（已出席）
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAttended(false)}
                    aria-pressed={formAttended === false}
                    className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      !formAttended
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    否（尚未出席）
                  </button>
                </div>
              </div>

              {formError && (
                <p className="text-xs font-medium text-red-600" role="alert">
                  {formError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeFormModal}
                  className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={students.length === 0}
                  className="h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {modalMode === 'edit' ? '儲存變更' : '新增紀錄'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};

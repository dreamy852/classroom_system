import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  BarChart3,
  FileText,
  Lock,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { StudentFormat, StudentIdentity } from '../types/student';
import {
  PaymentFilter,
  PaymentStatus,
  SortDirection,
  TransactionRecord,
  TransactionSortField,
} from '../types/transaction';
import { DocumentPreviewModal, DocumentType } from './DocumentPreviewModal';

interface TransactionLogModuleProps {
  transactions: TransactionRecord[];
  students: StudentIdentity[];
  classroomAddress: string;
  onAddTransaction: (data: Omit<TransactionRecord, 'id' | 'studentId'>) => void;
  onUpdateTransaction: (id: string, data: Omit<TransactionRecord, 'id' | 'studentId'>) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
  onDeleteTransaction: (id: string) => void;
  isModalOpen: boolean;
  onOpenAddModal: () => void;
  onCloseModal: () => void;
  onRequestUnlock: (featureName: string) => void;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 1,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTodayInputDate(): string {
  return formatDate(new Date().toISOString());
}

function toLocalNoonIso(dateInput: string): string {
  const parts = dateInput.split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    const [y, m, d] = parts;
    return new Date(y, m - 1, d, 12, 0, 0, 0).toISOString();
  }
  return new Date().toISOString();
}

export const TransactionLogModule: React.FC<TransactionLogModuleProps> = ({
  transactions,
  students,
  classroomAddress,
  onAddTransaction,
  onUpdateTransaction,
  onUpdatePaymentStatus,
  onDeleteTransaction,
  isModalOpen,
  onOpenAddModal,
  onCloseModal,
  onRequestUnlock,
}) => {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [scopeMode, setScopeMode] = useState<'month' | 'all'>('month');

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [sortField, setSortField] = useState<TransactionSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Editing target id (null means adding new record)
  const [editingRecord, setEditingRecord] = useState<TransactionRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Document preview state (報價單 / 收據)
  const [previewDoc, setPreviewDoc] = useState<{
    record: TransactionRecord;
    docType: DocumentType;
  } | null>(null);

  // Form fields shared between Add and Edit modal
  const [studentName, setStudentName] = useState('');
  const [format, setFormat] = useState<StudentFormat>('小組');
  const [txDate, setTxDate] = useState(getTodayInputDate);
  const [price, setPrice] = useState('');
  const [lessons, setLessons] = useState('');
  const [includesTrial, setIncludesTrial] = useState(false);
  const [trialFee, setTrialFee] = useState('0');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('已付錢');
  const [formError, setFormError] = useState('');

  // Inline delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeModalOpen = isModalOpen || isEditModalOpen;

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>([
      now.getFullYear() - 1,
      now.getFullYear(),
      now.getFullYear() + 1,
    ]);
    transactions.forEach((t) => {
      const d = new Date(t.createdAt);
      if (!Number.isNaN(d.getTime())) {
        yearSet.add(d.getFullYear());
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [transactions]);

  useEffect(() => {
    if (isModalOpen) {
      setEditingRecord(null);
      setStudentName('');
      setFormat('小組');
      const monthPadded = String(selectedMonth).padStart(2, '0');
      const isCurrentMonth =
        selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
      setTxDate(isCurrentMonth ? getTodayInputDate() : `${selectedYear}-${monthPadded}-01`);
      setPrice('');
      setLessons('');
      setIncludesTrial(false);
      setTrialFee('0');
      setSubject('');
      setGrade('');
      setPaymentStatus('已付錢');
      setFormError('');
      const timer = window.setTimeout(() => {
        nameInputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(timer);
    }
  }, [isModalOpen, selectedYear, selectedMonth]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeModalOpen) {
        setIsEditModalOpen(false);
        setEditingRecord(null);
        onCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalOpen, onCloseModal]);

  // Base list in current scope (selected month or all months)
  const scopedTransactions = useMemo(() => {
    if (scopeMode === 'all') return transactions;
    return transactions.filter((item) => {
      const d = new Date(item.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  }, [transactions, scopeMode, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    const count = scopedTransactions.length;
    const paidRecords = scopedTransactions.filter((t) => t.paymentStatus === '已付錢');
    const unpaidCount = count - paidRecords.length;
    const paidRevenue = paidRecords.reduce(
      (sum, t) => sum + t.price + (t.includesTrial ? t.trialFee : 0),
      0
    );
    const totalLessons = scopedTransactions.reduce((sum, t) => sum + t.lessons, 0);
    return {
      count,
      paidCount: paidRecords.length,
      unpaidCount,
      paidRevenue: Math.round(paidRevenue * 100) / 100,
      totalLessons,
    };
  }, [scopedTransactions]);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = scopedTransactions.filter((item) => {
      if (paymentFilter === 'paid' && item.paymentStatus !== '已付錢') return false;
      if (paymentFilter === 'unpaid' && item.paymentStatus !== '未付錢') return false;
      if (q === '') return true;
      return (
        item.studentName.toLowerCase().includes(q) ||
        item.studentId.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        item.grade.toLowerCase().includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'price') {
        comparison = a.price - b.price;
      } else if (sortField === 'lessons') {
        comparison = a.lessons - b.lessons;
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [scopedTransactions, searchQuery, paymentFilter, sortField, sortDirection]);

  const handleToggleSort = (field: TransactionSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openEditModal = (record: TransactionRecord) => {
    setDeletingId(null);
    setEditingRecord(record);
    setStudentName(record.studentName);
    setFormat(record.format);
    setTxDate(formatDate(record.createdAt));
    setPrice(String(record.price));
    setLessons(String(record.lessons));
    setIncludesTrial(record.includesTrial);
    setTrialFee(String(record.includesTrial ? record.trialFee : 0));
    setSubject(record.subject);
    setGrade(record.grade);
    setPaymentStatus(record.paymentStatus);
    setFormError('');
    setIsEditModalOpen(true);
    window.setTimeout(() => {
      nameInputRef.current?.focus();
    }, 40);
  };

  const closeActiveModal = () => {
    setIsEditModalOpen(false);
    setEditingRecord(null);
    onCloseModal();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = studentName.trim();
    const trimmedSubject = subject.trim();
    const trimmedGrade = grade.trim();
    const parsedPrice = Number(price);
    const parsedLessons = Number(lessons);
    const parsedTrialFee = includesTrial ? Number(trialFee) : 0;

    if (!trimmedName) {
      setFormError('請輸入學生姓名');
      nameInputRef.current?.focus();
      return;
    }
    if (!txDate) {
      setFormError('請選擇交易日期');
      return;
    }
    if (price.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('請輸入有效的價錢（0 或以上）');
      return;
    }
    if (lessons.trim() === '' || Number.isNaN(parsedLessons) || parsedLessons < 0) {
      setFormError('請輸入有效的堂數（0 或以上）');
      return;
    }
    if (
      includesTrial &&
      (trialFee.trim() === '' || Number.isNaN(parsedTrialFee) || parsedTrialFee < 0)
    ) {
      setFormError('請輸入有效的試堂費（0 或以上）');
      return;
    }
    if (!trimmedSubject) {
      setFormError('請輸入科目');
      return;
    }
    if (!trimmedGrade) {
      setFormError('請輸入年級');
      return;
    }

    const payload = {
      studentName: trimmedName,
      format,
      price: Math.round(parsedPrice * 100) / 100,
      lessons: Math.round(parsedLessons * 10) / 10,
      includesTrial,
      trialFee: includesTrial ? Math.round(parsedTrialFee * 100) / 100 : 0,
      subject: trimmedSubject,
      grade: trimmedGrade,
      paymentStatus,
      createdAt: toLocalNoonIso(txDate),
    };

    if (editingRecord) {
      onUpdateTransaction(editingRecord.id, payload);
    } else {
      onAddTransaction(payload);
    }
    closeActiveModal();
  };

  return (
    <section aria-labelledby="transactions-heading" className="space-y-6">
      {/* Page Title, Unboxed Summary Strip & Monthly Revenue Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h1
            id="transactions-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 text-balance"
          >
            交易紀錄
          </h1>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600 tabular-nums">
            <span>
              {scopeMode === 'month' ? `${selectedYear}年${selectedMonth}月` : '全部'}紀錄{' '}
              <strong className="font-semibold text-slate-900">{stats.count}</strong> 筆
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              已收款（實收）{' '}
              <strong className="font-semibold text-emerald-700">
                {formatCurrency(stats.paidRevenue)}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              未付錢{' '}
              <strong className={stats.unpaidCount > 0 ? 'font-semibold text-amber-700' : 'font-semibold text-slate-900'}>
                {stats.unpaidCount}
              </strong>{' '}
              筆
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>
              總堂數 <strong className="font-semibold text-slate-900">{stats.totalLessons}</strong> 堂
            </span>
          </div>
        </div>

        {/* Year / Month Selector + Revenue Statement Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScopeMode('month')}
              className={`h-8 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scopeMode === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              按月份
            </button>
            <button
              type="button"
              onClick={() => setScopeMode('all')}
              className={`h-8 px-2.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                scopeMode === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部時間
            </button>
          </div>

          <select
            aria-label="選擇年份"
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setScopeMode('month');
            }}
            className="h-10 px-3 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 cursor-pointer tabular-nums"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y} 年
              </option>
            ))}
          </select>

          <select
            aria-label="選擇月份"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(Number(e.target.value));
              setScopeMode('month');
            }}
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
            onClick={() => onRequestUnlock('月度收入結算單')}
            className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-blue-800 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50/70 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="h-4 w-4 text-blue-700" aria-hidden="true" />
            <span>出收入結算單</span>
            <Lock className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
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
              placeholder="搜尋學生姓名、ID、科目或年級..."
              aria-label="搜尋交易紀錄"
              className="w-full h-10 pl-9 pr-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
            />
          </div>

          <div
            role="group"
            aria-label="按付款狀態篩選"
            className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
          >
            <button
              type="button"
              onClick={() => setPaymentFilter('all')}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              全部 ({scopedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('paid')}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'paid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              已付錢 ({stats.paidCount})
            </button>
            <button
              type="button"
              onClick={() => setPaymentFilter('unpaid')}
              className={`h-8 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                paymentFilter === 'unpaid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              未付錢 ({stats.unpaidCount})
            </button>
          </div>
        </div>

        {/* Table or Empty State */}
        {transactions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-base font-medium text-slate-900">尚未有任何交易紀錄</p>
            <p className="mt-1.5 text-sm text-slate-500">
              點擊下方按鈕加入第一筆交易紀錄，即可追蹤學費、堂數及試堂費。
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                加入第一筆交易
              </button>
            </div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-base font-medium text-slate-900">
              {scopeMode === 'month'
                ? `${selectedYear} 年 ${selectedMonth} 月找不到符合條件的交易紀錄`
                : '找不到符合條件的交易紀錄'}
            </p>
            <p className="mt-1.5 text-sm text-slate-500">
              請嘗試切換年份／月份、更改搜尋關鍵字或檢視全部時間。
            </p>
            <div className="mt-5 flex items-center justify-center gap-2.5">
              {scopeMode === 'month' && (
                <button
                  type="button"
                  onClick={() => setScopeMode('all')}
                  className="inline-flex items-center h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  顯示全部時間
                </button>
              )}
              {(searchQuery !== '' || paymentFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPaymentFilter('all');
                  }}
                  className="inline-flex items-center h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  清除篩選
                </button>
              )}
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
                      onClick={() => handleToggleSort('createdAt')}
                      className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      日期
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    學生編號
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    學生姓名
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    形式
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    科目
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    年級
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('lessons')}
                      className="inline-flex items-center justify-end gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      堂數
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => handleToggleSort('price')}
                      className="inline-flex items-center justify-end gap-1.5 text-slate-700 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                    >
                      價錢
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    是否連試堂
                  </th>
                  <th scope="col" className="py-3 px-3 text-right whitespace-nowrap">
                    試堂費
                  </th>
                  <th scope="col" className="py-3 px-3 whitespace-nowrap">
                    付款狀態
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
                      <td className="py-3 pl-5 pr-3 font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDate(record.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {record.studentId}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                        {record.studentName}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {record.format}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {record.subject}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {record.grade}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {record.lessons}{' '}
                        <span className="font-sans text-xs font-normal text-slate-500">堂</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(record.price)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={
                            record.includesTrial
                              ? 'text-xs font-medium text-blue-700'
                              : 'text-xs text-slate-500'
                          }
                        >
                          {record.includesTrial ? '是' : '否'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {record.includesTrial ? formatCurrency(record.trialFee) : '—'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <select
                          aria-label={`${record.studentName} 付款狀態`}
                          value={record.paymentStatus}
                          onChange={(e) =>
                            onUpdatePaymentStatus(record.id, e.target.value as PaymentStatus)
                          }
                          className={`h-8 px-2 text-xs font-medium bg-white border rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600/15 ${
                            record.paymentStatus === '已付錢'
                              ? 'text-emerald-700 border-emerald-200 hover:border-emerald-300'
                              : 'text-amber-700 border-amber-200 hover:border-amber-300'
                          }`}
                        >
                          <option value="已付錢">已付錢</option>
                          <option value="未付錢">未付錢</option>
                        </select>
                      </td>
                      <td className="py-3 pl-3 pr-5 text-right whitespace-nowrap">
                        {isDeleting ? (
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className="text-xs text-slate-600 mr-1">確定刪除？</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTransaction(record.id);
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
                              onClick={() => setPreviewDoc({ record, docType: 'quotation' })}
                              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-blue-800 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50/70 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-700" aria-hidden="true" />
                              報價單
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ record, docType: 'receipt' })}
                              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <ReceiptText className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                              收據
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

      {/* Add / Edit Transaction Modal */}
      {activeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transaction-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeActiveModal();
            }
          }}
        >
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 id="transaction-modal-title" className="text-base font-semibold text-slate-900">
                {editingRecord ? '編輯交易紀錄' : '加入交易紀錄'}
              </h2>
              <button
                type="button"
                onClick={closeActiveModal}
                aria-label="關閉視窗"
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Student Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="tx-student-name" className="block text-sm font-medium text-slate-700">
                    學生姓名（不重複，自動配對 5 位數 ID）
                  </label>
                  <input
                    ref={nameInputRef}
                    id="tx-student-name"
                    list="classroom-student-names"
                    type="text"
                    value={studentName}
                    onChange={(e) => {
                      setStudentName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="選擇現有學生或輸入新姓名"
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  <datalist id="classroom-student-names">
                    {students.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.id} · {s.name}
                      </option>
                    ))}
                  </datalist>
                  {studentName.trim() !== '' && (() => {
                    const matched = students.find(
                      (s) => s.name.toLowerCase() === studentName.trim().toLowerCase()
                    );
                    return matched ? (
                      <p className="text-xs text-emerald-700">
                        已配對現有學生：{matched.name}（ID：<span className="font-mono">{matched.id}</span>）
                      </p>
                    ) : (
                      <p className="text-xs text-blue-700">
                        新學生：儲存時將自動配發 5 位數學生 ID
                      </p>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tx-date" className="block text-sm font-medium text-slate-700">
                    交易日期
                  </label>
                  <input
                    id="tx-date"
                    type="date"
                    value={txDate}
                    onChange={(e) => {
                      setTxDate(e.target.value);
                      if (formError) setFormError('');
                    }}
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Subject & Grade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="tx-subject" className="block text-sm font-medium text-slate-700">
                    科目
                  </label>
                  <input
                    id="tx-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="例如：數學"
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tx-grade" className="block text-sm font-medium text-slate-700">
                    年級
                  </label>
                  <input
                    id="tx-grade"
                    type="text"
                    value={grade}
                    onChange={(e) => {
                      setGrade(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="例如：中三"
                    className="w-full h-10 px-3 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Price & Lessons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="tx-price" className="block text-sm font-medium text-slate-700">
                    價錢（HKD）
                  </label>
                  <input
                    id="tx-price"
                    type="number"
                    min="0"
                    step="any"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="例如：1600"
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tx-lessons" className="block text-sm font-medium text-slate-700">
                    堂數
                  </label>
                  <input
                    id="tx-lessons"
                    type="number"
                    min="0"
                    step="0.5"
                    value={lessons}
                    onChange={(e) => {
                      setLessons(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="例如：8"
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Includes Trial & Trial Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-700">是否連試堂</span>
                  <div
                    role="group"
                    aria-label="是否連試堂"
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setIncludesTrial(true)}
                      aria-pressed={includesTrial === true}
                      className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        includesTrial
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      是
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIncludesTrial(false);
                        setTrialFee('0');
                      }}
                      aria-pressed={includesTrial === false}
                      className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        !includesTrial
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      否
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="tx-trial-fee" className="block text-sm font-medium text-slate-700">
                    試堂費（HKD）
                  </label>
                  <input
                    id="tx-trial-fee"
                    type="number"
                    min="0"
                    step="any"
                    disabled={!includesTrial}
                    value={includesTrial ? trialFee : '0'}
                    onChange={(e) => {
                      setTrialFee(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="例如：200"
                    className="w-full h-10 px-3 font-mono text-sm text-slate-900 bg-white border border-slate-300 rounded-lg tabular-nums placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </div>

              {/* Format & Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-700">形式</span>
                  <div role="group" aria-label="上課形式" className="grid grid-cols-2 gap-2">
                    {(['小組', '個人'] as const).map((formatOption) => (
                      <button
                        key={formatOption}
                        type="button"
                        onClick={() => setFormat(formatOption)}
                        aria-pressed={format === formatOption}
                        className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          format === formatOption
                            ? 'bg-blue-50 border-blue-600 text-blue-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {formatOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-sm font-medium text-slate-700">付款狀態</span>
                  <div role="group" aria-label="付款狀態" className="grid grid-cols-2 gap-2">
                    {(['已付錢', '未付錢'] as const).map((statusOption) => (
                      <button
                        key={statusOption}
                        type="button"
                        onClick={() => setPaymentStatus(statusOption)}
                        aria-pressed={paymentStatus === statusOption}
                        className={`h-10 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          paymentStatus === statusOption
                            ? statusOption === '已付錢'
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-700'
                              : 'bg-amber-50 border-amber-600 text-amber-700'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {statusOption}
                      </button>
                    ))}
                  </div>
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
                  onClick={closeActiveModal}
                  className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {editingRecord ? '儲存變更' : '確認加入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quotation / Receipt Preview Modal */}
      <DocumentPreviewModal
        record={previewDoc?.record ?? null}
        docType={previewDoc?.docType ?? null}
        classroomAddress={classroomAddress}
        onClose={() => setPreviewDoc(null)}
      />
    </section>
  );
};

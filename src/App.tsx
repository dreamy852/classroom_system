/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { AttendanceModule } from './components/AttendanceModule';
import { CalendarModule } from './components/CalendarModule';
import { DataManagementModule } from './components/DataManagementModule';
import { RemainingLessonsModule } from './components/RemainingLessonsModule';
import { TransactionLogModule } from './components/TransactionLogModule';
import { UnlockFeatureOverlay } from './components/UnlockFeatureOverlay';
import { AttendanceRecord } from './types/attendance';
import {
  RemainingLessonStatus,
  StudentIdentity,
  StudentLessonSummary,
} from './types/student';
import { PaymentStatus, TransactionRecord } from './types/transaction';

const TRANSACTIONS_STORAGE_KEY = 'lee_sir_classroom_transactions_v1';
const ATTENDANCE_STORAGE_KEY = 'lee_sir_classroom_attendance_v1';
const HIDDEN_STUDENTS_STORAGE_KEY = 'lee_sir_classroom_hidden_students_v1';
const CLASSROOM_ADDRESS = '[你的教室地址]';

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function makeCurrentMonthIso(dayOffsetBack: number): string {
  const now = new Date();
  const targetDay = Math.max(1, now.getDate() - dayOffsetBack);
  const d = new Date(now.getFullYear(), now.getMonth(), targetDay, 12, 0, 0, 0);
  return d.toISOString();
}

function makeWeekDayYmd(weekdayIndex: number): string {
  const now = new Date();
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const target = new Date(
    sunday.getFullYear(),
    sunday.getMonth(),
    sunday.getDate() + weekdayIndex
  );
  return formatYmd(target);
}

const INITIAL_TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'tx-1',
    studentId: '10001',
    studentName: '陳小明',
    format: '小組',
    price: 1600,
    lessons: 8,
    includesTrial: false,
    trialFee: 0,
    subject: '數學',
    grade: '中三',
    paymentStatus: '已付錢',
    createdAt: makeCurrentMonthIso(0),
  },
  {
    id: 'tx-2',
    studentId: '10002',
    studentName: '林詩涵',
    format: '個人',
    price: 2400,
    lessons: 2,
    includesTrial: true,
    trialFee: 250,
    subject: '物理',
    grade: '中五',
    paymentStatus: '未付錢',
    createdAt: makeCurrentMonthIso(1),
  },
  {
    id: 'tx-3',
    studentId: '10003',
    studentName: '張子軒',
    format: '小組',
    price: 1200,
    lessons: 2,
    includesTrial: false,
    trialFee: 0,
    subject: '英文',
    grade: '中四',
    paymentStatus: '已付錢',
    createdAt: makeCurrentMonthIso(2),
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'atn-seed-1',
    atnId: 'ATN-0001',
    date: makeWeekDayYmd(1),
    startTime: '16:00',
    endTime: '17:30',
    studentId: '10001',
    studentName: '陳小明',
    attended: true,
    createdAt: makeCurrentMonthIso(2),
  },
  {
    id: 'atn-seed-2',
    atnId: 'ATN-0002',
    date: makeWeekDayYmd(2),
    startTime: '17:00',
    endTime: '18:30',
    studentId: '10002',
    studentName: '林詩涵',
    attended: true,
    createdAt: makeCurrentMonthIso(2),
  },
  {
    id: 'atn-seed-3',
    atnId: 'ATN-0003',
    date: makeWeekDayYmd(1),
    startTime: '18:00',
    endTime: '19:30',
    studentId: '10003',
    studentName: '張子軒',
    attended: true,
    createdAt: makeCurrentMonthIso(2),
  },
  {
    id: 'atn-seed-4',
    atnId: 'ATN-0004',
    date: makeWeekDayYmd(3),
    startTime: '18:00',
    endTime: '19:30',
    studentId: '10003',
    studentName: '張子軒',
    attended: true,
    createdAt: makeCurrentMonthIso(1),
  },
  {
    id: 'atn-seed-5',
    atnId: 'ATN-0005',
    date: makeWeekDayYmd(2),
    startTime: '18:00',
    endTime: '19:30',
    studentId: '10003',
    studentName: '張子軒',
    attended: true,
    createdAt: makeCurrentMonthIso(1),
  },
  {
    id: 'atn-seed-6',
    atnId: 'ATN-0006',
    date: makeWeekDayYmd(4),
    startTime: '16:00',
    endTime: '17:30',
    studentId: '10001',
    studentName: '陳小明',
    attended: false,
    createdAt: makeCurrentMonthIso(0),
  },
  {
    id: 'atn-seed-7',
    atnId: 'ATN-0007',
    date: makeWeekDayYmd(6),
    startTime: '10:30',
    endTime: '12:00',
    studentId: '10002',
    studentName: '林詩涵',
    attended: false,
    createdAt: makeCurrentMonthIso(0),
  },
];

function isValidFiveDigitId(val: unknown): val is string {
  return typeof val === 'string' && /^\d{5}$/.test(val);
}

function generateNextFiveDigitId(existingIds: Set<string>): string {
  let num = 10001;
  existingIds.forEach((id) => {
    const parsed = Number(id);
    if (!Number.isNaN(parsed) && parsed >= num && parsed < 99999) {
      num = parsed + 1;
    }
  });
  while (existingIds.has(String(num))) {
    num += 1;
  }
  return String(num);
}

function generateNextAtnId(existing: AttendanceRecord[]): string {
  let maxNum = 0;
  existing.forEach((rec) => {
    const match = /^ATN-(\d+)$/i.exec(rec.atnId);
    if (match) {
      const parsed = Number(match[1]);
      if (!Number.isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  });
  return `ATN-${String(maxNum + 1).padStart(4, '0')}`;
}

function normalizeTransactions(rawList: unknown[]): TransactionRecord[] {
  const nameToId = new Map<string, { id: string; canonicalName: string }>();
  const usedIds = new Set<string>();

  rawList.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    if (typeof rec.studentName !== 'string') return;
    const cleanName = rec.studentName.trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    if (!nameToId.has(key) && isValidFiveDigitId(rec.studentId) && !usedIds.has(rec.studentId)) {
      nameToId.set(key, { id: rec.studentId, canonicalName: cleanName });
      usedIds.add(rec.studentId);
    }
  });

  const normalized: TransactionRecord[] = [];
  rawList.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const rec = item as Record<string, unknown>;
    if (typeof rec.id !== 'string' || typeof rec.studentName !== 'string') return;
    const cleanName = rec.studentName.trim();
    if (!cleanName) return;

    const key = cleanName.toLowerCase();
    let identity = nameToId.get(key);
    if (!identity) {
      const newId = generateNextFiveDigitId(usedIds);
      usedIds.add(newId);
      identity = { id: newId, canonicalName: cleanName };
      nameToId.set(key, identity);
    }

    const paymentStatus: PaymentStatus = rec.paymentStatus === '未付錢' ? '未付錢' : '已付錢';
    normalized.push({
      id: rec.id,
      studentId: identity.id,
      studentName: identity.canonicalName,
      format: rec.format === '個人' ? '個人' : '小組',
      price: typeof rec.price === 'number' && !Number.isNaN(rec.price) ? Math.max(0, rec.price) : 0,
      lessons:
        typeof rec.lessons === 'number' && !Number.isNaN(rec.lessons)
          ? Math.max(0, rec.lessons)
          : 0,
      includesTrial: Boolean(rec.includesTrial),
      trialFee:
        typeof rec.trialFee === 'number' && !Number.isNaN(rec.trialFee)
          ? Math.max(0, rec.trialFee)
          : 0,
      subject: typeof rec.subject === 'string' ? rec.subject : '',
      grade: typeof rec.grade === 'string' ? rec.grade : '',
      paymentStatus,
      createdAt: typeof rec.createdAt === 'string' ? rec.createdAt : new Date().toISOString(),
    });
  });

  return normalized;
}

function loadInitialTransactions(): TransactionRecord[] {
  try {
    const saved = window.localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return normalizeTransactions(parsed);
      }
    }
  } catch {
    // Fallback to initial transactions
  }
  return INITIAL_TRANSACTIONS;
}

function loadInitialAttendance(): AttendanceRecord[] {
  try {
    const saved = window.localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is AttendanceRecord =>
            Boolean(item) &&
            typeof item.id === 'string' &&
            typeof item.atnId === 'string' &&
            typeof item.date === 'string' &&
            typeof item.startTime === 'string' &&
            typeof item.endTime === 'string' &&
            typeof item.studentId === 'string' &&
            typeof item.studentName === 'string'
        );
      }
    }
  } catch {
    // Fallback to initial attendance
  }
  return INITIAL_ATTENDANCE;
}

function loadHiddenStudentIds(): string[] {
  try {
    const saved = window.localStorage.getItem(HIDDEN_STUDENTS_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === 'string');
      }
    }
  } catch {
    // Ignore malformed data
  }
  return [];
}

function computeLessonStatus(remaining: number): RemainingLessonStatus {
  if (remaining > 2) return '良好';
  if (remaining > 0) return '快用完';
  return '催繳';
}

type UnlockedTab = 'transactions' | 'attendance' | 'remaining' | 'data';
type ActiveTab = UnlockedTab | 'calendar';

export default function App() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>(loadInitialTransactions);
  const [attendanceRecords, setAttendanceRecords] =
    useState<AttendanceRecord[]>(loadInitialAttendance);
  const [hiddenStudentIds, setHiddenStudentIds] = useState<string[]>(loadHiddenStudentIds);

  const [activeTab, setActiveTab] = useState<ActiveTab>('transactions');
  const [lastUnlockedTab, setLastUnlockedTab] = useState<UnlockedTab>('transactions');
  const [modalUnlockFeature, setModalUnlockFeature] = useState<string | null>(null);
  const [isAddTransactionModalOpen, setIsAddTransactionModalOpen] = useState(false);
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);

  const activeUnlockFeature =
    activeTab === 'calendar' ? '日曆系統' : modalUnlockFeature;
  const isScreenDimmed = activeUnlockFeature !== null;

  useEffect(() => {
    try {
      window.localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
    } catch {
      // Ignore storage quota errors
    }
  }, [transactions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(attendanceRecords));
    } catch {
      // Ignore storage quota errors
    }
  }, [attendanceRecords]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HIDDEN_STUDENTS_STORAGE_KEY, JSON.stringify(hiddenStudentIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [hiddenStudentIds]);

  const students = useMemo<StudentIdentity[]>(() => {
    const map = new Map<string, StudentIdentity>();
    transactions.forEach((tx) => {
      if (!map.has(tx.studentId)) {
        map.set(tx.studentId, { id: tx.studentId, name: tx.studentName });
      }
    });
    attendanceRecords.forEach((rec) => {
      if (!map.has(rec.studentId)) {
        map.set(rec.studentId, { id: rec.studentId, name: rec.studentName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [transactions, attendanceRecords]);

  const studentSummaries = useMemo<StudentLessonSummary[]>(() => {
    const hiddenSet = new Set(hiddenStudentIds);

    return students.map((stu) => {
      const studentTxs = transactions.filter((tx) => tx.studentId === stu.id);
      const purchasedLessons = studentTxs.reduce(
        (sum, tx) => sum + tx.lessons + (tx.includesTrial ? 1 : 0),
        0
      );
      const attendedLessons = attendanceRecords.filter(
        (rec) => rec.studentId === stu.id && rec.attended
      ).length;
      const remainingLessons = Math.round((purchasedLessons - attendedLessons) * 10) / 10;

      return {
        studentId: stu.id,
        studentName: stu.name,
        purchasedLessons: Math.round(purchasedLessons * 10) / 10,
        attendedLessons,
        remainingLessons,
        status: computeLessonStatus(remainingLessons),
        isHidden: hiddenSet.has(stu.id),
      };
    });
  }, [students, transactions, attendanceRecords, hiddenStudentIds]);

  const resolveStudentIdentity = (
    rawName: string,
    currentTransactions: TransactionRecord[],
    currentAttendance: AttendanceRecord[]
  ): { studentId: string; studentName: string } => {
    const cleanName = rawName.trim();
    const existingTx = currentTransactions.find(
      (tx) => tx.studentName.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existingTx) {
      return { studentId: existingTx.studentId, studentName: existingTx.studentName };
    }
    const existingAtt = currentAttendance.find(
      (rec) => rec.studentName.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existingAtt) {
      return { studentId: existingAtt.studentId, studentName: existingAtt.studentName };
    }
    const usedIds = new Set<string>([
      ...currentTransactions.map((tx) => tx.studentId),
      ...currentAttendance.map((rec) => rec.studentId),
    ]);
    return {
      studentId: generateNextFiveDigitId(usedIds),
      studentName: cleanName,
    };
  };

  const handleAddTransaction = (data: Omit<TransactionRecord, 'id' | 'studentId'>) => {
    setTransactions((prev) => {
      const identity = resolveStudentIdentity(data.studentName, prev, attendanceRecords);
      const newRecord: TransactionRecord = {
        ...data,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: identity.studentId,
        studentName: identity.studentName,
      };
      return [newRecord, ...prev];
    });
  };

  const handleUpdateTransaction = (
    id: string,
    data: Omit<TransactionRecord, 'id' | 'studentId'>
  ) => {
    setTransactions((prev) => {
      const identity = resolveStudentIdentity(data.studentName, prev, attendanceRecords);
      return prev.map((record) =>
        record.id === id
          ? {
              ...record,
              ...data,
              studentId: identity.studentId,
              studentName: identity.studentName,
            }
          : record
      );
    });
  };

  const handleUpdatePaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setTransactions((prev) =>
      prev.map((record) => (record.id === id ? { ...record, paymentStatus } : record))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((record) => record.id !== id));
  };

  const handleAddAttendance = (data: Omit<AttendanceRecord, 'id' | 'atnId' | 'createdAt'>) => {
    setAttendanceRecords((prev) => {
      const nextAtnId = generateNextAtnId(prev);
      const newRecord: AttendanceRecord = {
        ...data,
        id: `atn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        atnId: nextAtnId,
        createdAt: new Date().toISOString(),
      };
      return [newRecord, ...prev];
    });
  };

  const handleUpdateAttendance = (
    id: string,
    data: Omit<AttendanceRecord, 'id' | 'atnId' | 'createdAt'>
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, ...data } : rec))
    );
  };

  const handleToggleAttended = (id: string, attended: boolean) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, attended } : rec))
    );
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendanceRecords((prev) => prev.filter((rec) => rec.id !== id));
  };

  const handleHideStudent = (studentId: string) => {
    setHiddenStudentIds((prev) => (prev.includes(studentId) ? prev : [...prev, studentId]));
  };

  const handleUnhideStudent = (studentId: string) => {
    setHiddenStudentIds((prev) => prev.filter((id) => id !== studentId));
  };

  const handleSelectTab = (tabId: ActiveTab) => {
    setModalUnlockFeature(null);
    if (
      tabId === 'transactions' ||
      tabId === 'attendance' ||
      tabId === 'remaining' ||
      tabId === 'data'
    ) {
      setLastUnlockedTab(tabId);
    }
    setActiveTab(tabId);
  };

  const handleCloseUnlockOverlay = () => {
    setModalUnlockFeature(null);
    if (activeTab === 'calendar') {
      setActiveTab(lastUnlockedTab);
    }
  };

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'transactions', label: '交易紀錄' },
    { id: 'attendance', label: '學生出席紀錄' },
    { id: 'remaining', label: '剩餘堂數紀錄' },
    { id: 'calendar', label: '日曆系統' },
    { id: 'data', label: '資料處理' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative">
      {/* Screen Container: dims smoothly to 50% opacity when an unlock prompt is active */}
      <div
        className={`min-h-screen flex flex-col transition-opacity duration-300 ${
          isScreenDimmed ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {/* Three-Zone Top Bar */}
        <header className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Single-line Brand Wordmark */}
            <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              教室系統
            </span>

            {/* Zone 2: Single-Line Tab Navigation */}
            <nav aria-label="功能模組" className="flex items-center gap-5 sm:gap-7 h-full overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  className={`relative h-full inline-flex items-center text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === tab.id
                      ? 'text-blue-800'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-800"
                    />
                  )}
                </button>
              ))}
            </nav>

            {/* Zone 3: Contextual Primary Action */}
            <div className="shrink-0 min-w-[132px] flex justify-end">
              {activeTab === 'transactions' && (
                <button
                  type="button"
                  onClick={() => setIsAddTransactionModalOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  加入交易紀錄
                </button>
              )}
              {activeTab === 'attendance' && (
                <button
                  type="button"
                  onClick={() => setIsAddAttendanceModalOpen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-blue-800 hover:bg-blue-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  新增出席紀錄
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main
          className={`flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 ${
            isScreenDimmed ? 'pointer-events-none select-none' : ''
          }`}
        >
          {/* Classroom Address Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <span>教室地址：{CLASSROOM_ADDRESS}</span>
            </div>
          </div>

          {activeTab === 'transactions' && (
            <TransactionLogModule
              transactions={transactions}
              students={students}
              classroomAddress={CLASSROOM_ADDRESS}
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onUpdatePaymentStatus={handleUpdatePaymentStatus}
              onDeleteTransaction={handleDeleteTransaction}
              isModalOpen={isAddTransactionModalOpen}
              onOpenAddModal={() => setIsAddTransactionModalOpen(true)}
              onCloseModal={() => setIsAddTransactionModalOpen(false)}
              onRequestUnlock={(feature) => setModalUnlockFeature(feature)}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceModule
              records={attendanceRecords}
              students={students}
              onAddRecord={handleAddAttendance}
              onUpdateRecord={handleUpdateAttendance}
              onToggleAttended={handleToggleAttended}
              onDeleteRecord={handleDeleteAttendance}
              isAddModalOpen={isAddAttendanceModalOpen}
              onOpenAddModal={() => setIsAddAttendanceModalOpen(true)}
              onCloseAddModal={() => setIsAddAttendanceModalOpen(false)}
              onRequestUnlock={(feature) => setModalUnlockFeature(feature)}
            />
          )}

          {activeTab === 'remaining' && (
            <RemainingLessonsModule
              summaries={studentSummaries}
              onHideStudent={handleHideStudent}
              onUnhideStudent={handleUnhideStudent}
            />
          )}

          {activeTab === 'calendar' && <CalendarModule />}

          {activeTab === 'data' && (
            <DataManagementModule
              transactions={transactions}
              attendanceRecords={attendanceRecords}
              hiddenStudentIds={hiddenStudentIds}
              classroomAddress={CLASSROOM_ADDRESS}
              onRequestUnlock={(feature) => setModalUnlockFeature(feature)}
            />
          )}
        </main>
      </div>

      {/* Crisp 100% Opacity Unlock Feature Card floating over the 50% transparent workspace */}
      {activeUnlockFeature && (
        <UnlockFeatureOverlay
          featureName={activeUnlockFeature}
          onReturn={handleCloseUnlockOverlay}
        />
      )}
    </div>
  );
}

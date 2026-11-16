import { StudentFormat } from './student';

export type PaymentStatus = '已付錢' | '未付錢';

export interface TransactionRecord {
  id: string;
  studentId: string; // 5-digit student ID
  studentName: string;
  format: StudentFormat;
  price: number;
  lessons: number;
  includesTrial: boolean;
  trialFee: number;
  subject: string;
  grade: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export type TrialFilter = 'all' | 'withTrial' | 'withoutTrial';
export type PaymentFilter = 'all' | 'paid' | 'unpaid';
export type TransactionSortField = 'createdAt' | 'price' | 'lessons';
export type SortDirection = 'asc' | 'desc';

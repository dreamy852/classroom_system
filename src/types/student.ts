export type StudentFormat = '小組' | '個人';

export type RemainingLessonStatus = '良好' | '快用完' | '催繳';

export interface StudentIdentity {
  id: string; // 5-digit student ID e.g. "10001"
  name: string;
}

export interface StudentLessonSummary {
  studentId: string;
  studentName: string;
  purchasedLessons: number;
  attendedLessons: number;
  remainingLessons: number;
  status: RemainingLessonStatus;
  isHidden: boolean;
}

export type LessonFilter = 'all' | 'good' | 'soon' | 'urge';
export type SortField = 'name' | 'remainingLessons' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface AttendanceRecord {
  id: string;
  atnId: string; // e.g. ATN-0001
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  studentId: string; // 5-digit student ID
  studentName: string;
  attended: boolean; // true = 是, false = 否
  createdAt: string;
}

export type AttendanceFilter = 'all' | 'yes' | 'no';
export type AttendanceSortField = 'date' | 'atnId' | 'studentName';
export type SortDirection = 'asc' | 'desc';

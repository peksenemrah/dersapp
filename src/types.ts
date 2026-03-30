// ─── Auth & Kullanıcı ──────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'teacher';
export type AuthProvider = 'google' | 'email';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  authProvider: AuthProvider;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string;
  createdAt: string;
}

// ─── Akademik Yapı ─────────────────────────────────────────────────────────────

export interface AcademicYear {
  id?: string;
  name: string;         // örn: "2025-2026"
  startDate: string;    // ISO tarih: "2025-09-08"
  endDate: string;
}

export interface AcademicWeek {
  id?: string;
  academicYearId: string;
  weekNumber: number;   // 1-den başlar, eğitim haftası sırası
  startDate: string;
  endDate: string;
  isHoliday: boolean;
  holidayName?: string;
}

export interface Holiday {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  academicYearId: string;
}

// ─── Ders & Program ────────────────────────────────────────────────────────────

export interface Section {
  id?: string;
  name: string;         // örn: "3-A"
  gradeLevel: number;   // 1-4
  academicYearId: string;
}

export interface Lesson {
  id?: string;
  name: string;
  color: string;        // hex renk kodu
  weeklyLimit: number;  // haftalık maksimum saat sayısı
  gradeLevel: number;
}

export interface TeacherAssignment {
  id?: string;
  teacherId: string;
  sectionId: string;
  lessonIds: string[];  // atanan dersler
  academicYearId: string;
}

// Haftalık programdaki bir slot
export interface ScheduleSlot {
  lessonId: string | null;
}

// Günlük program: slot index → ders
export interface DaySchedule {
  [slotIndex: number]: ScheduleSlot;
}

// Haftalık program belgesi
export interface WeeklySchedule {
  id?: string;
  sectionId: string;
  academicYearId: string;
  // key: "0" (Pazartesi) - "4" (Cuma)
  days: {
    [dayIndex: string]: DaySchedule;
  };
}

// ─── Kazanımlar ────────────────────────────────────────────────────────────────

export interface MasterOutcome {
  id?: string;
  lessonId: string;
  weekNumber: number;
  orderIndex: number;   // o haftadaki sıra (1-den başlar)
  code: string;         // örn: "T.3.2.1"
  text: string;
  gradeLevel: number;
  academicYearId: string;
}

export interface OutcomeImport {
  id?: string;
  importedBy: string;
  importedAt: string;
  lessonId: string;
  weekNumber: number;
  count: number;
  status: 'success' | 'partial' | 'failed';
}

// ─── Ders Kayıtları ────────────────────────────────────────────────────────────

export type LessonStatus =
  | 'completed'
  | 'partial'
  | 'postponed'
  | 'not_completed'
  | 'leave';

export interface LessonLog {
  id?: string;
  teacherId: string;
  lessonId: string;
  sectionId: string;
  date: string;         // "YYYY-MM-DD"
  slotIndex: number;    // dersin o günkü kaçıncı saati
  weekNumber: number;
  status: LessonStatus;
  note: string;
  outcomeId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Öğretmen Durum Dönemleri ─────────────────────────────────────────────────

export type TeacherStatusType = 'leave' | 'sick' | 'duty';

export interface TeacherStatusPeriod {
  id?: string;
  teacherId: string;
  type: TeacherStatusType;
  startDate: string;
  endDate: string;
  description?: string;
  createdAt: string;
}

// ─── UI Yardımcı Tipleri ───────────────────────────────────────────────────────

export interface DailySlot {
  slotIndex: number;
  lesson: Lesson | null;
  log: LessonLog | null;
  outcome: MasterOutcome | null;
}

export interface WeeklyHourCount {
  lessonId: string;
  lessonName: string;
  weeklyLimit: number;
  usedCount: number;
}

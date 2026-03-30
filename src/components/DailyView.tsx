import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isWeekend } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle, XCircle, Umbrella, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToCollection,
  addDocument,
  updateDocument,
  where,
} from '../services/firestoreService';
import { STATUS_OPTIONS } from '../constants';
import type {
  AcademicWeek,
  Lesson,
  LessonLog,
  LessonStatus,
  MasterOutcome,
  WeeklySchedule,
  TeacherAssignment,
  DailySlot,
} from '../types';

interface Props {
  academicWeeks: AcademicWeek[];
  lessons: Lesson[];
  masterOutcomes: MasterOutcome[];
  weeklySchedules: WeeklySchedule[];
  teacherAssignments: TeacherAssignment[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const STATUS_ICONS: Record<LessonStatus, typeof CheckCircle> = {
  completed: CheckCircle,
  partial: Clock,
  postponed: AlertCircle,
  not_completed: XCircle,
  leave: Umbrella,
};

export default function DailyView({
  academicWeeks,
  lessons,
  masterOutcomes,
  weeklySchedules,
  teacherAssignments,
  selectedDate,
  onDateChange,
}: Props) {
  const { appUser } = useAuth();
  const [logs, setLogs] = useState<LessonLog[]>([]);
  const [savingSlots, setSavingSlots] = useState<Set<number>>(new Set());

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayIndex = selectedDate.getDay() - 1; // 0=Pazartesi, 4=Cuma

  // Öğretmene atanmış şube ve dersler
  const assignment = teacherAssignments.find((a) =>
    appUser?.role === 'admin' ? true : a.teacherId === appUser?.uid
  );

  // Aktif akademik hafta — tatil haftaları hariç gerçek eğitim haftası numarası
  const currentEducationWeek = getEducationWeekNumber(selectedDate, academicWeeks);
  const currentWeek = academicWeeks.find((w) => {
    const start = parseISO(w.startDate);
    const end = parseISO(w.endDate);
    return selectedDate >= start && selectedDate <= end;
  });

  // Haftalık program
  const schedule = weeklySchedules.find((s) =>
    assignment ? s.sectionId === assignment.sectionId : true
  );

  // O günün ders slotları
  const daySchedule = schedule?.days[String(dayIndex)] ?? {};

  // Ders kayıtlarını dinle
  useEffect(() => {
    if (!appUser) return;
    const constraints = [
      where('date', '==', dateStr),
      ...(appUser.role === 'teacher' ? [where('teacherId', '==', appUser.uid)] : []),
    ];
    const unsub = subscribeToCollection<LessonLog>('lesson_logs', setLogs, constraints);
    return unsub;
  }, [dateStr, appUser]);

  // O günkü slotları oluştur
  const slots: DailySlot[] = Object.entries(daySchedule)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([indexStr, slot]) => {
      const slotIndex = Number(indexStr);
      const lesson = slot.lessonId ? (lessons.find((l) => l.id === slot.lessonId) ?? null) : null;
      const log = logs.find((lg) => lg.slotIndex === slotIndex) ?? null;
      const outcome = lesson
        ? getOutcomeForSlot(lesson.id!, slotIndex, 0, currentEducationWeek, daySchedule, masterOutcomes)
        : null;
      return { slotIndex, lesson, log, outcome };
    });

  // Durum kaydet
  const handleStatusChange = useCallback(
    async (slot: DailySlot, status: LessonStatus) => {
      if (!appUser || !slot.lesson || !assignment) return;
      setSavingSlots((prev) => new Set(prev).add(slot.slotIndex));
      try {
        const now = new Date().toISOString();
        if (slot.log?.id) {
          await updateDocument('lesson_logs', slot.log.id, { status, updatedAt: now });
        } else {
          await addDocument('lesson_logs', {
            teacherId: appUser.uid,
            lessonId: slot.lesson.id,
            sectionId: assignment.sectionId,
            date: dateStr,
            slotIndex: slot.slotIndex,
            weekNumber: currentEducationWeek,
            status,
            note: '',
            outcomeId: slot.outcome?.id ?? null,
            createdAt: now,
            updatedAt: now,
          });
        }
      } finally {
        setSavingSlots((prev) => {
          const next = new Set(prev);
          next.delete(slot.slotIndex);
          return next;
        });
      }
    },
    [appUser, assignment, dateStr, currentEducationWeek]
  );

  // Not kaydet — log yoksa önce oluştur (BUG FIX)
  const handleNoteBlur = useCallback(
    async (slot: DailySlot, note: string) => {
      if (!appUser || !slot.lesson || !assignment) return;
      const now = new Date().toISOString();
      if (slot.log?.id) {
        await updateDocument('lesson_logs', slot.log.id, { note, updatedAt: now });
      } else if (note.trim()) {
        // Log henüz yoksa, 'completed' başlangıç durumuyla oluştur
        await addDocument('lesson_logs', {
          teacherId: appUser.uid,
          lessonId: slot.lesson.id,
          sectionId: assignment.sectionId,
          date: dateStr,
          slotIndex: slot.slotIndex,
          weekNumber: currentEducationWeek,
          status: 'completed' as LessonStatus,
          note,
          outcomeId: slot.outcome?.id ?? null,
          createdAt: now,
          updatedAt: now,
        });
      }
    },
    [appUser, assignment, dateStr, currentEducationWeek]
  );

  if (isWeekend(selectedDate)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-5xl">🌿</div>
        <p className="font-medium" style={{ color: '#5A5A40' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: tr })} — Hafta Sonu
        </p>
        <p className="text-sm" style={{ color: '#6B6B50' }}>Ders kaydı yapılmaz.</p>
        <div className="flex gap-2 mt-2">
          <NavButton onClick={() => onDateChange(addDays(selectedDate, -1))}>
            <ChevronLeft size={16} />
          </NavButton>
          <NavButton onClick={() => onDateChange(addDays(selectedDate, 1))}>
            <ChevronRight size={16} />
          </NavButton>
        </div>
      </div>
    );
  }

  if (currentWeek?.isHoliday) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="text-5xl">📅</div>
        <p className="font-medium" style={{ color: '#5A5A40' }}>
          {currentWeek.holidayName ?? 'Tatil Haftası'}
        </p>
        <p className="text-sm" style={{ color: '#6B6B50' }}>
          {format(selectedDate, 'EEEE, d MMMM yyyy', { locale: tr })}
        </p>
        <div className="flex gap-2 mt-2">
          <NavButton onClick={() => onDateChange(addDays(selectedDate, -1))}>
            <ChevronLeft size={16} />
          </NavButton>
          <NavButton onClick={() => onDateChange(addDays(selectedDate, 1))}>
            <ChevronRight size={16} />
          </NavButton>
        </div>
      </div>
    );
  }

  const signatureLine = buildSignatureLine(slots, selectedDate);

  return (
    <div className="space-y-4">
      {/* Tarih navigasyon */}
      <div className="flex items-center justify-between">
        <button onClick={() => onDateChange(addDays(selectedDate, -1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronLeft size={20} style={{ color: '#5A5A40' }} />
        </button>
        <div className="text-center">
          <p className="font-semibold" style={{ color: '#2C2C1E', fontFamily: 'Georgia, serif' }}>
            {format(selectedDate, 'EEEE', { locale: tr })}
          </p>
          <p className="text-sm" style={{ color: '#6B6B50' }}>
            {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
          </p>
          {currentEducationWeek > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#9E9E9E' }}>
              {currentEducationWeek}. Eğitim Haftası
            </p>
          )}
        </div>
        <button onClick={() => onDateChange(addDays(selectedDate, 1))} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ChevronRight size={20} style={{ color: '#5A5A40' }} />
        </button>
      </div>

      {/* Ders slotları */}
      {slots.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen size={40} style={{ color: '#C5C5B0' }} className="mx-auto mb-2" />
          <p style={{ color: '#6B6B50' }}>Bu gün için ders programı bulunamadı.</p>
        </div>
      ) : (
        slots.map((slot) => (
          <SlotCard
            key={slot.slotIndex}
            slot={slot}
            saving={savingSlots.has(slot.slotIndex)}
            onStatusChange={(status) => handleStatusChange(slot, status)}
            onNoteBlur={(note) => handleNoteBlur(slot, note)}
          />
        ))
      )}

      {/* İmza notu */}
      {slots.length > 0 && (
        <div className="rounded-2xl p-4 text-sm" style={{ backgroundColor: '#F5F5F0', border: '1px solid #E0DDD0' }}>
          <p className="font-medium mb-1" style={{ color: '#5A5A40' }}>Defter İmza Notu</p>
          <p style={{ color: '#2C2C1E', fontFamily: 'Georgia, serif' }}>{signatureLine}</p>
        </div>
      )}
    </div>
  );
}

// ─── SlotCard bileşeni ────────────────────────────────────────────────────────

interface SlotCardProps {
  slot: DailySlot;
  saving: boolean;
  onStatusChange: (status: LessonStatus) => void;
  onNoteBlur: (note: string) => void;
}

function SlotCard({ slot, saving, onStatusChange, onNoteBlur }: SlotCardProps) {
  const [note, setNote] = useState(slot.log?.note ?? '');

  useEffect(() => {
    setNote(slot.log?.note ?? '');
  }, [slot.log?.note]);

  if (!slot.lesson) {
    return (
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#F5F5F0', border: '1px solid #E0DDD0' }}>
        <p className="text-sm" style={{ color: '#9E9E9E' }}>
          {slot.slotIndex + 1}. Saat — Boş
        </p>
      </div>
    );
  }

  const currentStatus = slot.log?.status ?? null;

  return (
    <div className="rounded-3xl p-5 shadow-sm" style={{ backgroundColor: 'white', border: '1px solid #E0DDD0' }}>
      {/* Ders başlığı */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: slot.lesson.color }}
        />
        <span className="font-semibold" style={{ color: '#2C2C1E' }}>
          {slot.slotIndex + 1}. Saat — {slot.lesson.name}
        </span>
        {saving && <span className="text-xs ml-auto" style={{ color: '#9E9E9E' }}>Kaydediliyor…</span>}
      </div>

      {/* Kazanım */}
      {slot.outcome ? (
        <div className="mb-3 p-3 rounded-xl text-sm" style={{ backgroundColor: '#F5F5F0' }}>
          <span className="font-medium text-xs mr-2" style={{ color: '#5A5A40' }}>{slot.outcome.code}</span>
          <span style={{ color: '#2C2C1E' }}>{slot.outcome.text}</span>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF8E1' }}>
          <span style={{ color: '#F57F17' }}>Bu ders saati için kazanım girilmemiş.</span>
        </div>
      )}

      {/* Durum butonları */}
      <div className="flex flex-wrap gap-2 mb-3">
        {STATUS_OPTIONS.map((opt) => {
          const Icon = STATUS_ICONS[opt.value];
          const isActive = currentStatus === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? opt.color : '#F5F5F0',
                color: isActive ? 'white' : '#6B6B50',
                border: isActive ? `1px solid ${opt.color}` : '1px solid #E0DDD0',
              }}
            >
              <Icon size={12} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Not alanı */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => onNoteBlur(note)}
        placeholder="Ders notu ekleyin…"
        rows={2}
        className="w-full text-sm p-3 rounded-xl outline-none resize-none transition-all"
        style={{
          border: '1px solid #E0DDD0',
          backgroundColor: '#F5F5F0',
          color: '#2C2C1E',
        }}
      />
    </div>
  );
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-xl transition-colors"
      style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}
    >
      {children}
    </button>
  );
}

/**
 * Tatil haftaları hariç gerçek eğitim haftası numarasını döndürür.
 * BUG FIX: Tatil haftaları sayıdan çıkarılıyor.
 */
function getEducationWeekNumber(date: Date, academicWeeks: AcademicWeek[]): number {
  const sorted = [...academicWeeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let educationCount = 0;

  for (const week of sorted) {
    const start = parseISO(week.startDate);
    const end = parseISO(week.endDate);
    const isHoliday = week.isHoliday;

    if (!isHoliday) educationCount++;

    if (date >= start && date <= end) {
      return isHoliday ? educationCount : educationCount;
    }
  }
  return 0;
}

/**
 * Belirli bir ders saati için doğru kazanımı hesaplar.
 * O derse ait önceki toplam ders saati sayısına bakarak sıradaki kazanımı seçer.
 */
function getOutcomeForSlot(
  lessonId: string,
  slotIndex: number,
  _dayIndex: number,
  educationWeek: number,
  daySchedule: Record<number, { lessonId: string | null }>,
  outcomes: MasterOutcome[]
): MasterOutcome | null {
  // O güne ait, bu saatten önceki aynı dersin saatlerini say
  const priorSlotsToday = Object.entries(daySchedule)
    .filter(([idxStr, s]) => s.lessonId === lessonId && Number(idxStr) < slotIndex)
    .length;

  // Bu hafta için o derse ait kazanımları sırayla al
  const weekOutcomes = outcomes
    .filter((o) => o.lessonId === lessonId && o.weekNumber === educationWeek)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  // Kazanım index'i: günün bu saatindeki kaçıncı işleniş
  const outcomeIndex = priorSlotsToday;
  return weekOutcomes[outcomeIndex] ?? null;
}

function buildSignatureLine(slots: DailySlot[], date: Date): string {
  const completed = slots.filter((s) => s.log?.status === 'completed').length;
  const total = slots.filter((s) => s.lesson !== null).length;
  const dateFormatted = format(date, 'd MMMM yyyy', { locale: tr });
  return `${dateFormatted} tarihli derse ait ${total} ders saatinden ${completed} tanesi işlenmiştir.`;
}

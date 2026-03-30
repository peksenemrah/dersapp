import { parseISO, format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, DAY_NAMES, SLOT_COUNT } from '../constants';
import type {
  AcademicWeek,
  Lesson,
  LessonLog,
  MasterOutcome,
  WeeklySchedule,
  TeacherAssignment,
} from '../types';

interface Props {
  currentWeek: AcademicWeek | null;
  lessons: Lesson[];
  logs: LessonLog[];
  masterOutcomes: MasterOutcome[];
  weeklySchedules: WeeklySchedule[];
  teacherAssignments: TeacherAssignment[];
  teacherUid: string;
  isAdmin: boolean;
}

export default function WeeklyView({
  currentWeek,
  lessons,
  logs,
  masterOutcomes,
  weeklySchedules,
  teacherAssignments,
  teacherUid,
  isAdmin,
}: Props) {
  const assignment = teacherAssignments.find((a) =>
    isAdmin ? true : a.teacherId === teacherUid
  );
  const schedule = weeklySchedules.find((s) =>
    assignment ? s.sectionId === assignment.sectionId : true
  );

  if (!currentWeek) {
    return (
      <div className="text-center py-12" style={{ color: '#6B6B50' }}>
        Aktif hafta bilgisi bulunamadı.
      </div>
    );
  }

  if (currentWeek.isHoliday) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium" style={{ color: '#5A5A40' }}>
          {currentWeek.holidayName ?? 'Tatil Haftası'}
        </p>
        <p className="text-sm mt-1" style={{ color: '#6B6B50' }}>
          Bu hafta ders kaydı bulunmamaktadır.
        </p>
      </div>
    );
  }

  // BUG FIX: new Date(dateStr) yerine parseISO kullanılıyor (timezone hatası önlenir)
  const weekStart = parseISO(currentWeek.startDate);

  function getLessonForSlot(dayIdx: number, slotIdx: number): Lesson | null {
    const lessonId = schedule?.days[String(dayIdx)]?.[slotIdx]?.lessonId;
    if (!lessonId) return null;
    return lessons.find((l) => l.id === lessonId) ?? null;
  }

  function getLogForSlot(dayIdx: number, slotIdx: number): LessonLog | null {
    const date = format(addDays(weekStart, dayIdx), 'yyyy-MM-dd');
    return logs.find((lg) => lg.date === date && lg.slotIndex === slotIdx) ?? null;
  }

  function getOutcomeForSlot(dayIdx: number, slotIdx: number): MasterOutcome | null {
    const lesson = getLessonForSlot(dayIdx, slotIdx);
    if (!lesson) return null;
    const daySchedule = schedule?.days[String(dayIdx)] ?? {};
    const priorCount = Object.entries(daySchedule)
      .filter(([i, s]) => s.lessonId === lesson.id && Number(i) < slotIdx)
      .length;
    const weekOutcomes = masterOutcomes
      .filter((o) => o.lessonId === lesson.id && o.weekNumber === currentWeek.weekNumber)
      .sort((a, b) => a.orderIndex - b.orderIndex);
    return weekOutcomes[priorCount] ?? null;
  }

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h2 className="font-bold text-lg" style={{ color: '#2C2C1E', fontFamily: 'Georgia, serif' }}>
            {currentWeek.weekNumber}. Hafta
          </h2>
          <p className="text-sm" style={{ color: '#6B6B50' }}>
            {format(weekStart, 'd MMMM', { locale: tr })} –{' '}
            {format(addDays(weekStart, 4), 'd MMMM yyyy', { locale: tr })}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: '#5A5A40', color: 'white' }}
        >
          <Printer size={16} />
          Yazdır
        </button>
      </div>

      {/* Tablo */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="p-3 text-left font-semibold rounded-tl-xl"
                style={{ backgroundColor: '#5A5A40', color: 'white', width: '60px' }}
              >
                Saat
              </th>
              {DAY_NAMES.map((day, idx) => (
                <th
                  key={day}
                  className="p-3 text-center font-semibold"
                  style={{ backgroundColor: '#5A5A40', color: 'white' }}
                >
                  <div>{day}</div>
                  <div className="text-xs font-normal opacity-75">
                    {format(addDays(weekStart, idx), 'd MMM', { locale: tr })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => (
              <tr key={slotIdx} style={{ borderBottom: '1px solid #E0DDD0' }}>
                <td
                  className="p-3 font-medium text-center"
                  style={{ backgroundColor: '#F5F5F0', color: '#5A5A40' }}
                >
                  {slotIdx + 1}
                </td>
                {DAY_NAMES.map((_, dayIdx) => {
                  const lesson = getLessonForSlot(dayIdx, slotIdx);
                  const log = getLogForSlot(dayIdx, slotIdx);
                  const outcome = getOutcomeForSlot(dayIdx, slotIdx);
                  return (
                    <td
                      key={dayIdx}
                      className="p-2 align-top"
                      style={{ backgroundColor: 'white' }}
                    >
                      {lesson ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: lesson.color }}
                            />
                            <span className="font-medium text-xs" style={{ color: '#2C2C1E' }}>
                              {lesson.name}
                            </span>
                          </div>
                          {outcome && (
                            <p className="text-xs leading-tight" style={{ color: '#6B6B50' }}>
                              <span className="font-medium">{outcome.code}</span> {outcome.text}
                            </p>
                          )}
                          {log && (
                            <>
                              <span
                                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor: STATUS_COLORS[log.status] + '22',
                                  color: STATUS_COLORS[log.status],
                                }}
                              >
                                {STATUS_LABELS[log.status]}
                              </span>
                              {log.note && (
                                <p className="text-xs italic" style={{ color: '#9E9E9E' }}>
                                  {log.note}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#C5C5B0' }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

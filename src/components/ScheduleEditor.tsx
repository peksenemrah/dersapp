import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Save } from 'lucide-react';
import { setDocument } from '../services/firestoreService';
import { DAY_NAMES, SLOT_COUNT } from '../constants';
import type { Lesson, WeeklySchedule, Section, WeeklyHourCount } from '../types';

interface Props {
  sections: Section[];
  lessons: Lesson[];
  weeklySchedules: WeeklySchedule[];
  academicYearId: string;
}

export default function ScheduleEditor({ sections, lessons, weeklySchedules, academicYearId }: Props) {
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Mevcut programı yükle veya boş başlat
  const existingSchedule = weeklySchedules.find((s) => s.sectionId === selectedSectionId);

  const [days, setDays] = useState<WeeklySchedule['days']>(() =>
    existingSchedule?.days ?? buildEmptyDays()
  );

  // Şube değişince programı güncelle
  function handleSectionChange(sectionId: string) {
    setSelectedSectionId(sectionId);
    const sch = weeklySchedules.find((s) => s.sectionId === sectionId);
    setDays(sch?.days ?? buildEmptyDays());
    setSaved(false);
  }

  // Haftalık ders saati sayıları — anlık hesaplama
  const hourCounts: WeeklyHourCount[] = useMemo(() => {
    return lessons.map((lesson) => {
      let used = 0;
      for (let d = 0; d < 5; d++) {
        const day = days[String(d)] ?? {};
        for (let s = 0; s < SLOT_COUNT; s++) {
          if (day[s]?.lessonId === lesson.id) used++;
        }
      }
      return {
        lessonId: lesson.id!,
        lessonName: lesson.name,
        weeklyLimit: lesson.weeklyLimit,
        usedCount: used,
      };
    });
  }, [days, lessons]);

  // Slot değişimi — haftalık limit kontrolüyle
  function handleSlotChange(dayIdx: number, slotIdx: number, lessonId: string | null) {
    if (lessonId) {
      const count = hourCounts.find((h) => h.lessonId === lessonId);
      const currentLesson = days[String(dayIdx)]?.[slotIdx]?.lessonId;
      // Aynı slotta farklı ders seçiliyorsa mevcut dersi saymadan değerlendir
      const isSameSlot = currentLesson === lessonId;
      if (!isSameSlot && count && count.usedCount >= count.weeklyLimit) {
        alert(`"${count.lessonName}" dersi için haftalık limit ${count.weeklyLimit} saattir. Zaten ${count.usedCount} saat programa eklenmiş olduğundan yeni ders saati eklenemez.`);
        return;
      }
    }

    setDays((prev) => ({
      ...prev,
      [String(dayIdx)]: {
        ...(prev[String(dayIdx)] ?? {}),
        [slotIdx]: { lessonId },
      },
    }));
    setSaved(false);
  }

  async function handleSave() {
    if (!selectedSectionId || !academicYearId) return;
    setSaving(true);
    try {
      const docId = `${selectedSectionId}_default`;
      await setDocument('weekly_schedules', docId, {
        sectionId: selectedSectionId,
        academicYearId,
        days,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const totalHours = hourCounts.reduce((sum, h) => sum + h.usedCount, 0);

  return (
    <div className="space-y-6">
      {/* Şube seçimi */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#2C2C1E' }}>Şube</label>
          <select
            value={selectedSectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          >
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mt-5 transition-colors"
          style={{ backgroundColor: '#5A5A40', color: 'white', opacity: saving ? 0.7 : 1 }}
        >
          {saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saving ? 'Kaydediliyor…' : saved ? 'Kaydedildi' : 'Kaydet'}
        </button>
        <div className="mt-5 text-sm" style={{ color: '#6B6B50' }}>
          Toplam: <strong>{totalHours}</strong> saat
        </div>
      </div>

      {/* Ders saati sayaçları */}
      <div className="flex flex-wrap gap-2">
        {hourCounts.map((h) => {
          const isOver = h.usedCount > h.weeklyLimit;
          const isNear = h.usedCount === h.weeklyLimit;
          return (
            <div
              key={h.lessonId}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
              style={{
                backgroundColor: isOver ? '#FFEBEE' : isNear ? '#FFF8E1' : '#F5F5F0',
                border: `1px solid ${isOver ? '#FFCDD2' : isNear ? '#FFE0B2' : '#E0DDD0'}`,
                color: isOver ? '#C62828' : isNear ? '#E65100' : '#2C2C1E',
              }}
            >
              {isOver && <AlertTriangle size={12} />}
              {h.lessonName}: {h.usedCount}/{h.weeklyLimit}
            </div>
          );
        })}
      </div>

      {/* Program tablosu */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-3 text-left font-semibold" style={{ backgroundColor: '#5A5A40', color: 'white', width: '60px' }}>Saat</th>
              {DAY_NAMES.map((day) => (
                <th key={day} className="p-3 text-center font-semibold" style={{ backgroundColor: '#5A5A40', color: 'white' }}>
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => (
              <tr key={slotIdx} style={{ borderBottom: '1px solid #E0DDD0' }}>
                <td className="p-3 font-medium text-center" style={{ backgroundColor: '#F5F5F0', color: '#5A5A40' }}>
                  {slotIdx + 1}
                </td>
                {Array.from({ length: 5 }, (_, dayIdx) => {
                  const lessonId = days[String(dayIdx)]?.[slotIdx]?.lessonId ?? '';
                  const lesson = lessons.find((l) => l.id === lessonId);
                  return (
                    <td key={dayIdx} className="p-2" style={{ backgroundColor: 'white' }}>
                      <select
                        value={lessonId}
                        onChange={(e) => handleSlotChange(dayIdx, slotIdx, e.target.value || null)}
                        className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{
                          border: '1px solid #E0DDD0',
                          backgroundColor: lesson ? lesson.color + '22' : '#F5F5F0',
                          color: '#2C2C1E',
                        }}
                      >
                        <option value="">— Boş —</option>
                        {lessons.map((l) => {
                          const count = hourCounts.find((h) => h.lessonId === l.id);
                          const isAtLimit = count ? count.usedCount >= count.weeklyLimit && l.id !== lessonId : false;
                          return (
                            <option key={l.id} value={l.id} disabled={isAtLimit}>
                              {l.name}{isAtLimit ? ` (limit doldu: ${count?.weeklyLimit})` : ''}
                            </option>
                          );
                        })}
                      </select>
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

function buildEmptyDays(): WeeklySchedule['days'] {
  const days: WeeklySchedule['days'] = {};
  for (let d = 0; d < 5; d++) {
    days[String(d)] = {};
    for (let s = 0; s < SLOT_COUNT; s++) {
      days[String(d)][s] = { lessonId: null };
    }
  }
  return days;
}

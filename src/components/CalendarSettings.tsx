import { useState } from 'react';
import { parseISO, format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Save, RefreshCw } from 'lucide-react';
import { addDocument, updateDocument, deleteCollection } from '../services/firestoreService';
import type { AcademicYear, AcademicWeek } from '../types';

interface Props {
  academicYears: AcademicYear[];
  academicWeeks: AcademicWeek[];
  selectedYearId: string;
}

export default function CalendarSettings({ academicYears, academicWeeks, selectedYearId }: Props) {
  const year = academicYears.find((y) => y.id === selectedYearId);

  const [startDate, setStartDate] = useState(year?.startDate ?? '');
  const [endDate, setEndDate] = useState(year?.endDate ?? '');
  const [weekCount, setWeekCount] = useState(36);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const weeks = academicWeeks
    .filter((w) => w.academicYearId === selectedYearId)
    .sort((a, b) => a.weekNumber - b.weekNumber);

  async function handleSaveYear() {
    if (!startDate || !endDate) return;
    setSaving(true);
    try {
      if (year?.id) {
        await updateDocument('academic_years', year.id, { startDate, endDate });
      } else {
        await addDocument('academic_years', {
          name: `${new Date(startDate).getFullYear()}-${new Date(endDate).getFullYear()}`,
          startDate,
          endDate,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateWeeks() {
    if (!startDate || !selectedYearId) return;
    if (!confirm(`${weekCount} haftalık takvim oluşturulacak. Mevcut haftalar silinecek. Devam edilsin mi?`)) return;
    setGenerating(true);
    try {
      // Eski haftaları sil (yalnızca bu yıla ait olanlar)
      for (const w of weeks) {
        if (w.id) await updateDocument('academic_weeks', w.id, { deleted: true }); // soft delete
      }
      await deleteCollection('academic_weeks'); // tam sil

      // Yeni haftaları üret
      const start = parseISO(startDate + 'T00:00:00');
      // Pazartesiye hizala
      const dow = start.getDay();
      const offset = dow === 1 ? 0 : dow === 0 ? 1 : -(dow - 1);
      const monday = addDays(start, offset);

      for (let i = 0; i < weekCount; i++) {
        const wStart = addDays(monday, i * 7);
        const wEnd = addDays(wStart, 4);
        await addDocument('academic_weeks', {
          academicYearId: selectedYearId,
          weekNumber: i + 1,
          startDate: format(wStart, 'yyyy-MM-dd'),
          endDate: format(wEnd, 'yyyy-MM-dd'),
          isHoliday: false,
        });
      }
    } finally {
      setGenerating(false);
    }
  }

  async function toggleHoliday(week: AcademicWeek) {
    if (!week.id) return;
    await updateDocument('academic_weeks', week.id, {
      isHoliday: !week.isHoliday,
    });
  }

  async function updateHolidayName(week: AcademicWeek, name: string) {
    if (!week.id) return;
    await updateDocument('academic_weeks', week.id, { holidayName: name });
  }

  const educationWeekCount = weeks.filter((w) => !w.isHoliday).length;
  const holidayCount = weeks.filter((w) => w.isHoliday).length;

  return (
    <div className="space-y-6">
      {/* Akademik yıl ayarları */}
      <div className="p-4 rounded-2xl space-y-4" style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}>
        <p className="font-semibold" style={{ color: '#2C2C1E' }}>Akademik Yıl</p>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Bitiş</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
            />
          </div>
          <button
            onClick={handleSaveYear}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mt-5"
            style={{ backgroundColor: '#5A5A40', color: 'white', opacity: saving ? 0.7 : 1 }}
          >
            <Save size={16} />
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Hafta Sayısı</label>
            <input
              type="number"
              min={1}
              max={52}
              value={weekCount}
              onChange={(e) => setWeekCount(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
            />
          </div>
          <button
            onClick={handleGenerateWeeks}
            disabled={generating || !startDate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mt-5"
            style={{ backgroundColor: '#7A7A60', color: 'white', opacity: generating ? 0.7 : 1 }}
          >
            <RefreshCw size={16} />
            {generating ? 'Oluşturuluyor…' : 'Haftalık Takvim Oluştur'}
          </button>
        </div>
      </div>

      {/* İstatistikler */}
      {weeks.length > 0 && (
        <div className="flex gap-3">
          <div className="p-3 rounded-xl text-center flex-1" style={{ backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9' }}>
            <p className="text-lg font-bold" style={{ color: '#2E7D32' }}>{educationWeekCount}</p>
            <p className="text-xs" style={{ color: '#2E7D32' }}>Eğitim Haftası</p>
          </div>
          <div className="p-3 rounded-xl text-center flex-1" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE0B2' }}>
            <p className="text-lg font-bold" style={{ color: '#E65100' }}>{holidayCount}</p>
            <p className="text-xs" style={{ color: '#E65100' }}>Tatil Haftası</p>
          </div>
          <div className="p-3 rounded-xl text-center flex-1" style={{ backgroundColor: '#F5F5F0', border: '1px solid #E0DDD0' }}>
            <p className="text-lg font-bold" style={{ color: '#5A5A40' }}>{weeks.length}</p>
            <p className="text-xs" style={{ color: '#5A5A40' }}>Toplam Hafta</p>
          </div>
        </div>
      )}

      {/* Hafta listesi */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {weeks.map((week) => {
          // BUG FIX: parseISO kullanılıyor
          const start = parseISO(week.startDate);
          const end = parseISO(week.endDate);
          return (
            <div
              key={week.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                backgroundColor: week.isHoliday ? '#FFF8E1' : 'white',
                border: `1px solid ${week.isHoliday ? '#FFE0B2' : '#E0DDD0'}`,
              }}
            >
              <span className="text-xs font-bold w-8" style={{ color: '#5A5A40' }}>{week.weekNumber}</span>
              <span className="text-sm flex-1" style={{ color: '#2C2C1E' }}>
                {format(start, 'd MMM', { locale: tr })} – {format(end, 'd MMM yyyy', { locale: tr })}
              </span>
              {week.isHoliday && (
                <input
                  type="text"
                  defaultValue={week.holidayName ?? ''}
                  onBlur={(e) => updateHolidayName(week, e.target.value)}
                  placeholder="Tatil adı"
                  className="px-2 py-1 rounded-lg text-xs outline-none w-36"
                  style={{ border: '1px solid #FFE0B2', backgroundColor: '#FFF8E1', color: '#E65100' }}
                />
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={week.isHoliday}
                  onChange={() => toggleHoliday(week)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs" style={{ color: week.isHoliday ? '#E65100' : '#6B6B50' }}>
                  {week.isHoliday ? 'Tatil' : 'Eğitim'}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

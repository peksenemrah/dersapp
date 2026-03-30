import { useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { addDocument, deleteDocument } from '../services/firestoreService';
import type { Lesson, MasterOutcome, AcademicYear } from '../types';

interface Props {
  lessons: Lesson[];
  masterOutcomes: MasterOutcome[];
  academicYears: AcademicYear[];
  selectedYearId: string;
}

export default function CurriculumEditor({ lessons, masterOutcomes, academicYears, selectedYearId }: Props) {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? '');
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  const year = academicYears.find((y) => y.id === selectedYearId);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  // Filtrelenmiş kazanımlar
  const filtered = masterOutcomes
    .filter((o) => o.lessonId === selectedLessonId && o.weekNumber === selectedWeek && o.academicYearId === selectedYearId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  async function handleAdd() {
    if (!text.trim() || !selectedLessonId || !selectedLesson) return;
    setAdding(true);
    try {
      const maxOrder = filtered.reduce((max, o) => Math.max(max, o.orderIndex), 0);
      await addDocument<Omit<MasterOutcome, 'id'>>('master_outcomes', {
        lessonId: selectedLessonId,
        weekNumber: selectedWeek,
        orderIndex: maxOrder + 1,
        code: code.trim() || `${selectedLesson.name.charAt(0)}.3.${selectedWeek}.${maxOrder + 1}`,
        text: text.trim(),
        gradeLevel: 3,
        academicYearId: selectedYearId,
      });
      setCode('');
      setText('');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kazanımı silmek istediğinizden emin misiniz?')) return;
    await deleteDocument('master_outcomes', id);
  }

  return (
    <div className="space-y-5">
      {/* Filtreler */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Akademik Yıl</label>
          <div className="px-3 py-2 rounded-xl text-sm" style={{ backgroundColor: '#F5F5F0', color: '#2C2C1E', border: '1px solid #E0DDD0' }}>
            {year?.name ?? '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Ders</label>
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          >
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Hafta</label>
          <input
            type="number"
            min={1}
            max={40}
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
        </div>
      </div>

      {/* Kazanım listesi */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#9E9E9E' }}>
            <BookOpen size={32} className="mx-auto mb-2" style={{ color: '#C5C5B0' }} />
            <p>Bu hafta için kazanım girilmemiş.</p>
          </div>
        ) : (
          filtered.map((o, idx) => (
            <div
              key={o.id}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ backgroundColor: '#F5F5F0', border: '1px solid #E0DDD0' }}
            >
              <span className="text-xs font-bold mt-0.5 w-6 text-center" style={{ color: '#5A5A40' }}>{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold mr-2" style={{ color: '#7A7A60' }}>{o.code}</span>
                <span className="text-sm" style={{ color: '#2C2C1E' }}>{o.text}</span>
              </div>
              <button
                onClick={() => handleDelete(o.id!)}
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: '#C62828' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Yeni kazanım ekleme */}
      <div className="p-4 rounded-2xl space-y-3" style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}>
        <p className="font-medium text-sm" style={{ color: '#2C2C1E' }}>Yeni Kazanım Ekle</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kod (örn: T.3.2.1)"
            className="w-36 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Kazanım metnini girin…"
            className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#5A5A40', color: 'white', opacity: adding || !text.trim() ? 0.5 : 1 }}
          >
            <Plus size={16} />
            Ekle
          </button>
        </div>
      </div>
    </div>
  );
}

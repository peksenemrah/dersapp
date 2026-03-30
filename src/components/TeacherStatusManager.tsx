import { useState } from 'react';
import { parseISO, format, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { addDocument, deleteDocument } from '../services/firestoreService';
import type { AppUser, TeacherStatusPeriod } from '../types';

interface Props {
  teachers: AppUser[];
  statusPeriods: TeacherStatusPeriod[];
  adminUid: string;
}

const STATUS_TYPE_LABELS: Record<string, string> = {
  leave: 'İzin',
  sick: 'Rapor',
  duty: 'Görevlendirme',
};

export default function TeacherStatusManager({ teachers, statusPeriods, adminUid }: Props) {
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?.uid ?? '');
  const [type, setType] = useState<'leave' | 'sick' | 'duty'>('leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const teacherPeriods = statusPeriods
    .filter((p) => p.teacherId === selectedTeacherId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  async function handleAdd() {
    if (!startDate || !endDate || !selectedTeacherId) return;
    setSaving(true);
    try {
      await addDocument<Omit<TeacherStatusPeriod, 'id'>>('teacher_status_periods', {
        teacherId: selectedTeacherId,
        type,
        startDate,
        endDate,
        description: description.trim(),
        createdAt: new Date().toISOString(),
      });
      setStartDate('');
      setEndDate('');
      setDescription('');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu dönemi silmek istediğinizden emin misiniz?')) return;
    await deleteDocument('teacher_status_periods', id);
  }

  // Bugün aktif bir dönem var mı?
  const today = new Date();
  const activePeriod = teacherPeriods.find((p) => {
    try {
      return isWithinInterval(today, {
        start: parseISO(p.startDate),
        end: parseISO(p.endDate),
      });
    } catch {
      return false;
    }
  });

  return (
    <div className="space-y-5">
      {/* Öğretmen seçimi */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Öğretmen</label>
        <select
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
        >
          {teachers.map((t) => <option key={t.uid} value={t.uid}>{t.displayName}</option>)}
        </select>
      </div>

      {/* Aktif durum */}
      {activePeriod && (
        <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE0B2' }}>
          <span style={{ color: '#E65100' }}>
            Bugün aktif: <strong>{STATUS_TYPE_LABELS[activePeriod.type]}</strong> —{' '}
            {format(parseISO(activePeriod.startDate), 'd MMM', { locale: tr })} –{' '}
            {format(parseISO(activePeriod.endDate), 'd MMM yyyy', { locale: tr })}
          </span>
        </div>
      )}

      {/* Yeni dönem ekleme */}
      <div className="p-4 rounded-2xl space-y-3" style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}>
        <p className="font-medium text-sm" style={{ color: '#2C2C1E' }}>Yeni Dönem Ekle</p>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Tür</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
            >
              {Object.entries(STATUS_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
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
        </div>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Açıklama (isteğe bağlı)"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !startDate || !endDate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#5A5A40', color: 'white', opacity: saving || !startDate || !endDate ? 0.5 : 1 }}
        >
          <Plus size={16} />
          {saving ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </div>

      {/* Dönem listesi */}
      <div className="space-y-2">
        {teacherPeriods.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: '#9E9E9E' }}>Kayıtlı dönem bulunmuyor.</p>
        ) : (
          teacherPeriods.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}
            >
              <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ backgroundColor: '#F5F5F0', color: '#5A5A40' }}>
                {STATUS_TYPE_LABELS[p.type]}
              </span>
              <span className="flex-1 text-sm" style={{ color: '#2C2C1E' }}>
                {format(parseISO(p.startDate), 'd MMM', { locale: tr })} –{' '}
                {format(parseISO(p.endDate), 'd MMM yyyy', { locale: tr })}
                {p.description && <span className="text-xs ml-2" style={{ color: '#6B6B50' }}>{p.description}</span>}
              </span>
              <button
                onClick={() => handleDelete(p.id!)}
                className="p-1.5 rounded-lg"
                style={{ color: '#C62828' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

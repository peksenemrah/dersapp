import { useState, useMemo } from 'react';
import { Upload, Eye, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { batchAddDocuments, deleteDocument, queryDocuments, where } from '../services/firestoreService';
import type { Lesson, MasterOutcome, AcademicYear } from '../types';

interface Props {
  lessons: Lesson[];
  masterOutcomes: MasterOutcome[];
  academicYears: AcademicYear[];
  selectedYearId: string;
  adminUid?: string;
}

interface ParsedOutcome {
  code: string;
  text: string;
  valid: boolean;
}

export default function BulkOutcomeEntry({ lessons, masterOutcomes, academicYears, selectedYearId }: Props) {
  const [selectedLessonId, setSelectedLessonId] = useState(lessons[0]?.id ?? '');
  const [weekNumber, setWeekNumber] = useState(1);
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<ParsedOutcome[]>([]);
  const [step, setStep] = useState<'input' | 'preview' | 'done'>('input');
  const [saving, setSaving] = useState(false);
  const [deleteWeek, setDeleteWeek] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const year = academicYears.find((y) => y.id === selectedYearId);
  const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

  // Bu hafta için mevcut kazanım sayısı
  const existingCount = masterOutcomes.filter(
    (o) => o.lessonId === selectedLessonId && o.weekNumber === weekNumber && o.academicYearId === selectedYearId
  ).length;

  // Özet: hangi haftalar, kaç kazanım var
  const weekSummary = useMemo(() => {
    const map: Record<number, number> = {};
    masterOutcomes
      .filter((o) => o.lessonId === selectedLessonId && o.academicYearId === selectedYearId)
      .forEach((o) => {
        map[o.weekNumber] = (map[o.weekNumber] ?? 0) + 1;
      });
    return map;
  }, [masterOutcomes, selectedLessonId, selectedYearId]);

  function parseRawText(): ParsedOutcome[] {
    return rawText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Kod - metin ayrımı: "T.3.2.1. Metin" veya "T.3.2.1 Metin" gibi
        const match = line.match(/^([A-ZÇŞİÜÖ0-9.]+\.?\s+)(.*)/);
        if (match) {
          return { code: match[1].trim(), text: match[2].trim(), valid: match[2].trim().length > 0 };
        }
        return { code: '', text: line, valid: line.length > 3 };
      });
  }

  function handlePreview() {
    const parsed = parseRawText();
    setPreview(parsed);
    setStep('preview');
  }

  async function handleSave() {
    if (!selectedLessonId || !selectedLesson) return;
    setSaving(true);
    try {
      const validOnes = preview.filter((p) => p.valid);
      const items: Omit<MasterOutcome, 'id'>[] = validOnes.map((p, idx) => ({
        lessonId: selectedLessonId,
        weekNumber,
        orderIndex: existingCount + idx + 1,
        code: p.code || `${selectedLesson.name.charAt(0)}.${weekNumber}.${existingCount + idx + 1}`,
        text: p.text,
        gradeLevel: 3,
        academicYearId: selectedYearId,
      }));
      await batchAddDocuments('master_outcomes', items);
      setStep('done');
      setRawText('');
      setPreview([]);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWeek() {
    if (deleteWeek === null) return;
    setDeleting(true);
    try {
      const toDelete = await queryDocuments<MasterOutcome>('master_outcomes', [
        where('lessonId', '==', selectedLessonId),
        where('weekNumber', '==', deleteWeek),
        where('academicYearId', '==', selectedYearId),
      ]);
      for (const o of toDelete) {
        if (o.id) await deleteDocument('master_outcomes', o.id);
      }
      setDeleteWeek(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
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
            onChange={(e) => { setSelectedLessonId(e.target.value); setStep('input'); }}
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
            value={weekNumber}
            onChange={(e) => { setWeekNumber(Number(e.target.value)); setStep('input'); }}
            className="w-20 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
        </div>
      </div>

      {/* Hafta özeti */}
      {existingCount > 0 && step === 'input' && (
        <div className="p-3 rounded-xl flex items-center gap-2 text-sm" style={{ backgroundColor: '#FFF8E1', border: '1px solid #FFE0B2' }}>
          <AlertTriangle size={16} style={{ color: '#E65100' }} />
          <span style={{ color: '#E65100' }}>
            {weekNumber}. hafta için <strong>{existingCount}</strong> kazanım zaten girilmiş. Yeni girişler eklenerek sıraya eklenecektir.
          </span>
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-3">
          <label className="block text-sm font-medium" style={{ color: '#2C2C1E' }}>
            Kazanımları yapıştırın (her satır bir kazanım)
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`T.3.2.1. Kelimeleri anlamlarına uygun kullanır.\nT.3.2.2. Hazırlıksız konuşmalar yapar.\nT.3.2.3. Çerçevesi belirli bir konu hakkında konuşur.`}
            rows={10}
            className="w-full p-4 rounded-2xl text-sm outline-none resize-y font-mono"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: '#6B6B50' }}>
              {rawText.split('\n').filter((l) => l.trim()).length} satır girildi
            </span>
            <button
              onClick={handlePreview}
              disabled={!rawText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#5A5A40', color: 'white', opacity: !rawText.trim() ? 0.5 : 1 }}
            >
              <Eye size={16} />
              Önizle
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium" style={{ color: '#2C2C1E' }}>
              Önizleme — {preview.filter((p) => p.valid).length} geçerli / {preview.length} toplam
            </p>
            <button onClick={() => setStep('input')} className="text-sm" style={{ color: '#6B6B50' }}>
              Geri Dön
            </button>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {preview.map((p, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-xl text-sm"
                style={{
                  backgroundColor: p.valid ? '#F0FFF4' : '#FFF3F3',
                  border: `1px solid ${p.valid ? '#C8E6C9' : '#FFCDD2'}`,
                }}
              >
                <span className="w-5 text-xs font-bold mt-0.5" style={{ color: p.valid ? '#2E7D32' : '#C62828' }}>
                  {idx + 1}
                </span>
                {p.code && (
                  <span className="font-semibold text-xs flex-shrink-0" style={{ color: '#5A5A40' }}>{p.code}</span>
                )}
                <span style={{ color: '#2C2C1E' }}>{p.text}</span>
                {!p.valid && <span className="ml-auto text-xs" style={{ color: '#C62828' }}>Geçersiz</span>}
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || preview.filter((p) => p.valid).length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#5A5A40', color: 'white', opacity: saving ? 0.7 : 1 }}
          >
            <Upload size={16} />
            {saving ? 'Kaydediliyor…' : `${preview.filter((p) => p.valid).length} Kazanımı Kaydet`}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="p-4 rounded-2xl flex items-center gap-3" style={{ backgroundColor: '#F0FFF4', border: '1px solid #C8E6C9' }}>
          <Check size={20} style={{ color: '#2E7D32' }} />
          <div>
            <p className="font-medium" style={{ color: '#2E7D32' }}>Kazanımlar başarıyla kaydedildi!</p>
            <button onClick={() => setStep('input')} className="text-sm mt-1" style={{ color: '#5A5A40' }}>
              Yeni kazanım gir →
            </button>
          </div>
        </div>
      )}

      {/* Toplu silme */}
      <div className="pt-4" style={{ borderTop: '1px solid #E0DDD0' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#2C2C1E' }}>Toplu Silme</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={40}
            value={deleteWeek ?? ''}
            onChange={(e) => setDeleteWeek(e.target.value ? Number(e.target.value) : null)}
            placeholder="Hafta no"
            className="w-24 px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
          />
          <span className="text-sm" style={{ color: '#6B6B50' }}>
            {deleteWeek && weekSummary[deleteWeek] !== undefined
              ? `${weekSummary[deleteWeek]} kazanım silinecek`
              : 'Silinecek hafta numarası girin'}
          </span>
          <button
            onClick={handleDeleteWeek}
            disabled={deleteWeek === null || deleting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#FFEBEE', color: '#C62828', opacity: deleteWeek === null ? 0.5 : 1 }}
          >
            <Trash2 size={14} />
            {deleting ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>

        {/* Hafta bazlı özet */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(weekSummary)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([week, count]) => (
              <div
                key={week}
                className="px-2.5 py-1 rounded-lg text-xs"
                style={{ backgroundColor: '#F5F5F0', color: '#5A5A40', border: '1px solid #E0DDD0' }}
              >
                H{week}: {count} kazanım
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

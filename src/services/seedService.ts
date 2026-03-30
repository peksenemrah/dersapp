import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { addDocument, setDocument, batchAddDocuments } from './firestoreService';
import { INITIAL_LESSONS } from '../constants';
import type {
  AcademicYear,
  AcademicWeek,
  Section,
  MasterOutcome,
} from '../types';

export async function seedIfEmpty(adminUid: string): Promise<void> {
  const yearsSnap = await getDocs(collection(db, 'academic_years'));
  if (!yearsSnap.empty) return; // Zaten veri var, seed yapma

  console.log('Veritabanı boş, başlangıç verileri yükleniyor...');

  // 1. Akademik yıl
  const yearData: Omit<AcademicYear, 'id'> = {
    name: '2025-2026',
    startDate: '2025-09-08',
    endDate: '2026-06-12',
  };
  const yearId = await addDocument('academic_years', yearData);

  // 2. Haftaları üret (36 eğitim haftası)
  const weeks = generateAcademicWeeks(yearId, '2025-09-08', 36, [
    { weekNumber: 9, name: 'Yarıyıl Tatili Öncesi' },
    { weekNumber: 10, name: 'Yarıyıl Tatili' },
  ]);
  await batchAddDocuments('academic_weeks', weeks);

  // 3. Şube
  const sectionData: Omit<Section, 'id'> = {
    name: '3-A',
    gradeLevel: 3,
    academicYearId: yearId,
  };
  const sectionId = await addDocument('sections', sectionData);

  // 4. Dersler
  const lessonIds: Record<string, string> = {};
  for (const lesson of INITIAL_LESSONS) {
    const id = await addDocument('lessons', lesson);
    lessonIds[lesson.name] = id;
  }

  // 5. Öğretmen ataması (admin kendi sınıfına atanıyor)
  await addDocument('teacher_assignments', {
    teacherId: adminUid,
    sectionId,
    lessonIds: Object.values(lessonIds),
    academicYearId: yearId,
  });

  // 6. Örnek haftalık program (3-A için)
  const schedule = buildDefaultSchedule(sectionId, yearId, lessonIds);
  await setDocument('weekly_schedules', `${sectionId}_default`, schedule);

  // 7. Örnek kazanımlar (Türkçe için 4 hafta, Matematik için 2 hafta)
  const outcomes = buildSampleOutcomes(yearId, lessonIds);
  await batchAddDocuments('master_outcomes', outcomes);

  console.log('Başlangıç verileri başarıyla yüklendi.');
}

// ─── Yardımcı: Hafta listesi üret ─────────────────────────────────────────────

function generateAcademicWeeks(
  academicYearId: string,
  startDateStr: string,
  count: number,
  holidays: { weekNumber: number; name: string }[]
): Omit<AcademicWeek, 'id'>[] {
  const holidayWeeks = new Set(holidays.map((h) => h.weekNumber));
  const holidayNames = Object.fromEntries(holidays.map((h) => [h.weekNumber, h.name]));

  const weeks: Omit<AcademicWeek, 'id'>[] = [];
  const start = new Date(startDateStr + 'T00:00:00');

  // Pazartesiye hizala
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : -(dayOfWeek - 1);
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < count; i++) {
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Cuma

    const weekNumber = i + 1;
    weeks.push({
      academicYearId,
      weekNumber,
      startDate: toDateStr(weekStart),
      endDate: toDateStr(weekEnd),
      isHoliday: holidayWeeks.has(weekNumber),
      holidayName: holidayNames[weekNumber],
    });
  }
  return weeks;
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Yardımcı: Varsayılan haftalık program ─────────────────────────────────────

function buildDefaultSchedule(
  sectionId: string,
  academicYearId: string,
  lessonIds: Record<string, string>
) {
  const turkce = lessonIds['Türkçe'] ?? null;
  const mat = lessonIds['Matematik'] ?? null;
  const hayat = lessonIds['Hayat Bilgisi'] ?? null;
  const fen = lessonIds['Fen Bilimleri'] ?? null;
  const sosyal = lessonIds['Sosyal Bilgiler'] ?? null;
  const din = lessonIds['Din Kültürü'] ?? null;
  const beden = lessonIds['Beden Eğitimi'] ?? null;
  const muzik = lessonIds['Müzik'] ?? null;
  const gorsel = lessonIds['Görsel Sanatlar'] ?? null;

  // 5 gün × 8 saat — haftalık limit doldurularak örnek program
  const days: Record<string, Record<number, { lessonId: string | null }>> = {
    '0': { 0: { lessonId: turkce }, 1: { lessonId: turkce }, 2: { lessonId: mat }, 3: { lessonId: hayat }, 4: { lessonId: fen }, 5: { lessonId: din } },
    '1': { 0: { lessonId: turkce }, 1: { lessonId: turkce }, 2: { lessonId: mat }, 3: { lessonId: sosyal }, 4: { lessonId: fen }, 5: { lessonId: muzik } },
    '2': { 0: { lessonId: turkce }, 1: { lessonId: turkce }, 2: { lessonId: mat }, 3: { lessonId: mat }, 4: { lessonId: sosyal }, 5: { lessonId: gorsel } },
    '3': { 0: { lessonId: turkce }, 1: { lessonId: turkce }, 2: { lessonId: mat }, 3: { lessonId: hayat }, 4: { lessonId: sosyal }, 5: { lessonId: beden } },
    '4': { 0: { lessonId: turkce }, 1: { lessonId: turkce }, 2: { lessonId: mat }, 3: { lessonId: hayat }, 4: { lessonId: din }, 5: { lessonId: beden } },
  };

  return { sectionId, academicYearId, days };
}

// ─── Yardımcı: Örnek kazanımlar ───────────────────────────────────────────────

function buildSampleOutcomes(
  academicYearId: string,
  lessonIds: Record<string, string>
): Omit<MasterOutcome, 'id'>[] {
  const turkce = lessonIds['Türkçe'];
  const mat = lessonIds['Matematik'];
  const gradeLevel = 3;

  const outcomes: Omit<MasterOutcome, 'id'>[] = [];

  // Türkçe — 4 hafta
  const turkceOutcomes = [
    [1, 1, 'T.3.1.1', 'Dinlediklerindeki/izlediklerindeki olayların gelişimi ve sonucu hakkında tahminde bulunur.'],
    [1, 2, 'T.3.1.2', 'Dinlediklerinde/izlediklerinde geçen, bilmediği kelimelerin anlamını bağlamdan hareketle tahmin eder.'],
    [2, 1, 'T.3.2.1', 'Kelimeleri anlamlarına uygun kullanır.'],
    [2, 2, 'T.3.2.2', 'Hazırlıksız konuşmalar yapar.'],
    [2, 3, 'T.3.2.3', 'Çerçevesi belirli bir konu hakkında konuşur.'],
    [3, 1, 'T.3.3.1', 'Okuduğu metni sesli olarak doğru ve akıcı biçimde okur.'],
    [3, 2, 'T.3.3.2', 'Okuduğu metnin konusunu belirler.'],
    [4, 1, 'T.3.4.1', 'Yazdıklarını paylaşır.'],
    [4, 2, 'T.3.4.2', 'Büyük harfleri ve noktalama işaretlerini doğru kullanır.'],
  ];
  for (const [weekNumber, orderIndex, code, text] of turkceOutcomes) {
    outcomes.push({ lessonId: turkce, weekNumber: weekNumber as number, orderIndex: orderIndex as number, code: code as string, text: text as string, gradeLevel, academicYearId });
  }

  // Matematik — 2 hafta
  const matOutcomes = [
    [1, 1, 'M.3.1.1', 'Dört basamaklı doğal sayıları okur ve yazar.'],
    [1, 2, 'M.3.1.2', 'Dört basamaklı doğal sayıları karşılaştırır ve sıralar.'],
    [2, 1, 'M.3.1.3', 'Dört basamaklı doğal sayıları yuvarlar.'],
    [2, 2, 'M.3.2.1', 'Doğal sayılarla toplama işlemi yapar.'],
  ];
  for (const [weekNumber, orderIndex, code, text] of matOutcomes) {
    outcomes.push({ lessonId: mat, weekNumber: weekNumber as number, orderIndex: orderIndex as number, code: code as string, text: text as string, gradeLevel, academicYearId });
  }

  return outcomes;
}

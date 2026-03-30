import type { Lesson } from './types';

export const SLOT_COUNT = 6; // günlük ders saati sayısı

export const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

export const STATUS_LABELS: Record<string, string> = {
  completed: 'İşlendi',
  partial: 'Kısmen İşlendi',
  postponed: 'Ertelendi',
  not_completed: 'İşlenemedi',
  leave: 'İzin / Rapor',
};

export const STATUS_COLORS: Record<string, string> = {
  completed: '#4CAF50',
  partial: '#FF9800',
  postponed: '#2196F3',
  not_completed: '#F44336',
  leave: '#9E9E9E',
};

export const STATUS_OPTIONS = [
  { value: 'completed', label: 'İşlendi', color: '#4CAF50' },
  { value: 'partial', label: 'Kısmen İşlendi', color: '#FF9800' },
  { value: 'postponed', label: 'Ertelendi', color: '#2196F3' },
  { value: 'not_completed', label: 'İşlenemedi', color: '#F44336' },
  { value: 'leave', label: 'İzin / Rapor', color: '#9E9E9E' },
] as const;

// Başlangıç ders verileri — seed servisi tarafından kullanılır
export const INITIAL_LESSONS: Omit<Lesson, 'id'>[] = [
  { name: 'Türkçe', color: '#E57373', weeklyLimit: 10, gradeLevel: 3 },
  { name: 'Matematik', color: '#64B5F6', weeklyLimit: 5, gradeLevel: 3 },
  { name: 'Hayat Bilgisi', color: '#81C784', weeklyLimit: 4, gradeLevel: 3 },
  { name: 'Fen Bilimleri', color: '#FFB74D', weeklyLimit: 3, gradeLevel: 3 },
  { name: 'Sosyal Bilgiler', color: '#BA68C8', weeklyLimit: 3, gradeLevel: 3 },
  { name: 'Din Kültürü', color: '#4DB6AC', weeklyLimit: 2, gradeLevel: 3 },
  { name: 'Beden Eğitimi', color: '#F06292', weeklyLimit: 2, gradeLevel: 3 },
  { name: 'Müzik', color: '#AED581', weeklyLimit: 1, gradeLevel: 3 },
  { name: 'Görsel Sanatlar', color: '#FFD54F', weeklyLimit: 1, gradeLevel: 3 },
];

// Zeytuni renk paleti
export const PALETTE = {
  primary: '#5A5A40',
  primaryLight: '#7A7A60',
  primaryDark: '#3A3A20',
  bg: '#F5F5F0',
  bgCard: '#FFFFFF',
  border: '#E0DDD0',
  text: '#2C2C1E',
  textMuted: '#6B6B50',
};

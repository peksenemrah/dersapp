import { useState, useEffect } from 'react';
import { parseISO, isWithinInterval } from 'date-fns';
import {
  BookOpen,
  Calendar,
  CalendarDays,
  Settings,
  Users,
  LayoutList,
  LogOut,
  ChevronDown,
  GraduationCap,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { subscribeToCollection, where } from './services/firestoreService';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import DailyView from './components/DailyView';
import WeeklyView from './components/WeeklyView';
import ScheduleEditor from './components/ScheduleEditor';
import CurriculumEditor from './components/CurriculumEditor';
import BulkOutcomeEntry from './components/BulkOutcomeEntry';
import CalendarSettings from './components/CalendarSettings';
import UserManagement from './components/UserManagement';
import TeacherStatusManager from './components/TeacherStatusManager';
import type {
  AcademicYear,
  AcademicWeek,
  Section,
  Lesson,
  MasterOutcome,
  WeeklySchedule,
  LessonLog,
  TeacherAssignment,
  TeacherStatusPeriod,
  AppUser,
} from './types';

type View =
  | 'daily'
  | 'weekly'
  | 'schedule'
  | 'curriculum'
  | 'bulk-outcomes'
  | 'calendar'
  | 'users'
  | 'teacher-status';

export default function App() {
  const { appUser, loading, signOutUser } = useAuth();
  const [view, setView] = useState<View>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Veri katmanları ────────────────────────────────────────────────────────
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicWeeks, setAcademicWeeks] = useState<AcademicWeek[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [masterOutcomes, setMasterOutcomes] = useState<MasterOutcome[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [lessonLogs, setLessonLogs] = useState<LessonLog[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);
  const [teacherStatusPeriods, setTeacherStatusPeriods] = useState<TeacherStatusPeriod[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  // ── Veri abonelikleri ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!appUser) return;

    const isAdmin = appUser.role === 'admin';
    const uid = appUser.uid;

    const unsubs = [
      subscribeToCollection<AcademicYear>('academic_years', setAcademicYears),
      subscribeToCollection<AcademicWeek>('academic_weeks', setAcademicWeeks),
      subscribeToCollection<Section>('sections', setSections),
      subscribeToCollection<Lesson>('lessons', setLessons),
      subscribeToCollection<MasterOutcome>('master_outcomes', setMasterOutcomes),
      subscribeToCollection<WeeklySchedule>('weekly_schedules', setWeeklySchedules),
      subscribeToCollection<TeacherAssignment>(
        'teacher_assignments',
        setTeacherAssignments,
        isAdmin ? [] : [where('teacherId', '==', uid)]
      ),
      subscribeToCollection<LessonLog>(
        'lesson_logs',
        setLessonLogs,
        isAdmin ? [] : [where('teacherId', '==', uid)]
      ),
      subscribeToCollection<TeacherStatusPeriod>(
        'teacher_status_periods',
        setTeacherStatusPeriods,
        isAdmin ? [] : [where('teacherId', '==', uid)]
      ),
    ];

    if (isAdmin) {
      unsubs.push(subscribeToCollection<AppUser>('users', setAllUsers));
    }

    return () => unsubs.forEach((fn) => fn());
  }, [appUser]);

  // ── Hesaplanan değerler ────────────────────────────────────────────────────
  const selectedYear = academicYears[0] ?? null;
  const selectedYearId = selectedYear?.id ?? '';

  const currentWeek = academicWeeks
    .filter((w) => w.academicYearId === selectedYearId)
    .find((w) => {
      try {
        return isWithinInterval(selectedDate, {
          start: parseISO(w.startDate),
          end: parseISO(w.endDate),
        });
      } catch {
        return false;
      }
    }) ?? null;

  const teachers = allUsers.filter((u) => u.role === 'teacher');

  // ── Auth / Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F5F0' }}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#5A5A40', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: '#6B6B50' }}>Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!appUser) return <LoginPage />;

  if (appUser.mustChangePassword) return <ChangePasswordModal />;

  const isAdmin = appUser.role === 'admin';

  const navItems: { id: View; label: string; icon: typeof BookOpen; adminOnly?: boolean }[] = [
    { id: 'daily', label: 'Günlük Kayıt', icon: BookOpen },
    { id: 'weekly', label: 'Haftalık Görünüm', icon: Calendar },
    { id: 'schedule', label: 'Ders Programı', icon: LayoutList, adminOnly: true },
    { id: 'curriculum', label: 'Kazanım Editörü', icon: GraduationCap, adminOnly: true },
    { id: 'bulk-outcomes', label: 'Toplu Kazanım Girişi', icon: ClipboardList, adminOnly: true },
    { id: 'calendar', label: 'Takvim Ayarları', icon: CalendarDays, adminOnly: true },
    { id: 'users', label: 'Kullanıcı Yönetimi', icon: Users, adminOnly: true },
    { id: 'teacher-status', label: 'İzin / Rapor', icon: Settings, adminOnly: true },
  ];

  const visibleNav = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F5F5F0' }}>
      {/* Sidebar — desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{ backgroundColor: '#5A5A40', minHeight: '100vh' }}
      >
        <SidebarContent
          appUser={appUser}
          navItems={visibleNav}
          activeView={view}
          onNavigate={setView}
          onSignOut={signOutUser}
        />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 flex flex-col" style={{ backgroundColor: '#5A5A40' }}>
            <SidebarContent
              appUser={appUser}
              navItems={visibleNav}
              activeView={view}
              onNavigate={(v) => { setView(v); setSidebarOpen(false); }}
              onSignOut={signOutUser}
            />
          </aside>
        </div>
      )}

      {/* Ana içerik */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobil header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: 'white', borderColor: '#E0DDD0' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl" style={{ color: '#5A5A40' }}>
            <LayoutList size={20} />
          </button>
          <span className="font-semibold text-sm" style={{ color: '#2C2C1E', fontFamily: 'Georgia, serif' }}>
            {navItems.find((n) => n.id === view)?.label}
          </span>
          <div className="w-8" />
        </header>

        <div className="flex-1 p-4 lg:p-6 max-w-5xl mx-auto w-full">
          {view === 'daily' && (
            <DailyView
              academicWeeks={academicWeeks}
              lessons={lessons}
              masterOutcomes={masterOutcomes}
              weeklySchedules={weeklySchedules}
              teacherAssignments={teacherAssignments}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}
          {view === 'weekly' && (
            <WeeklyView
              currentWeek={currentWeek}
              lessons={lessons}
              logs={lessonLogs}
              masterOutcomes={masterOutcomes}
              weeklySchedules={weeklySchedules}
              teacherAssignments={teacherAssignments}
              teacherUid={appUser.uid}
              isAdmin={isAdmin}
            />
          )}
          {view === 'schedule' && isAdmin && (
            <ScheduleEditor
              sections={sections}
              lessons={lessons}
              weeklySchedules={weeklySchedules}
              academicYearId={selectedYearId}
            />
          )}
          {view === 'curriculum' && isAdmin && (
            <CurriculumEditor
              lessons={lessons}
              masterOutcomes={masterOutcomes}
              academicYears={academicYears}
              selectedYearId={selectedYearId}
            />
          )}
          {view === 'bulk-outcomes' && isAdmin && (
            <BulkOutcomeEntry
              lessons={lessons}
              masterOutcomes={masterOutcomes}
              academicYears={academicYears}
              selectedYearId={selectedYearId}
              adminUid={appUser.uid}
            />
          )}
          {view === 'calendar' && isAdmin && (
            <CalendarSettings
              academicYears={academicYears}
              academicWeeks={academicWeeks}
              selectedYearId={selectedYearId}
            />
          )}
          {view === 'users' && isAdmin && (
            <UserManagement
              sections={sections}
              lessons={lessons}
              teacherAssignments={teacherAssignments}
              academicYearId={selectedYearId}
              adminUid={appUser.uid}
            />
          )}
          {view === 'teacher-status' && isAdmin && (
            <TeacherStatusManager
              teachers={teachers}
              statusPeriods={teacherStatusPeriods}
              adminUid={appUser.uid}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Sidebar içerik bileşeni ──────────────────────────────────────────────────

interface SidebarProps {
  appUser: AppUser;
  navItems: { id: View; label: string; icon: typeof BookOpen }[];
  activeView: View;
  onNavigate: (v: View) => void;
  onSignOut: () => void;
}

function SidebarContent({ appUser, navItems, activeView, onNavigate, onSignOut }: SidebarProps) {
  return (
    <>
      {/* Logo */}
      <div className="p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-white opacity-90" />
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              Ders Defteri
            </p>
            <p className="text-xs opacity-60 text-white">Kazanım Takip</p>
          </div>
        </div>
      </div>

      {/* Navigasyon */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
              style={{
                backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
              }}
            >
              <Icon size={17} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Kullanıcı */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {appUser.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{appUser.displayName}</p>
            <p className="text-xs opacity-60 text-white">{appUser.role === 'admin' ? 'Yönetici' : 'Öğretmen'}</p>
          </div>
          <ChevronDown size={14} className="text-white opacity-60" />
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
        >
          <LogOut size={14} />
          Çıkış Yap
        </button>
      </div>
    </>
  );
}

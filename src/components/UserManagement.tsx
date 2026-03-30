import { useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  subscribeToCollection,
  setDocument,
  updateDocument,
} from '../services/firestoreService';
import { UserPlus, Mail, ToggleLeft, ToggleRight, KeyRound } from 'lucide-react';
import type { AppUser, TeacherAssignment, Section, Lesson } from '../types';

interface Props {
  sections: Section[];
  lessons: Lesson[];
  teacherAssignments: TeacherAssignment[];
  academicYearId: string;
  adminUid: string;
}

export default function UserManagement({
  sections,
  lessons,
  teacherAssignments,
  academicYearId,
  adminUid,
}: Props) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState(sections[0]?.id ?? '');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToCollection<AppUser>('users', setUsers);
    return unsub;
  }, []);

  const teachers = users.filter((u) => u.role === 'teacher');

  function toggleLesson(id: string) {
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !email.trim() || tempPassword.length < 8) {
      setError('Ad, e-posta ve en az 8 karakterli şifre zorunludur.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      // Firebase Auth hesabı oluştur
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), tempPassword);
      const uid = credential.user.uid;

      // Firestore profil oluştur
      const now = new Date().toISOString();
      const newUser: AppUser = {
        uid,
        email: email.trim(),
        displayName: name.trim(),
        role: 'teacher',
        authProvider: 'email',
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: now,
        createdAt: now,
      };
      await setDocument('users', uid, newUser);

      // Atama yap
      if (selectedSectionId && selectedLessonIds.length > 0) {
        const assignment: Omit<TeacherAssignment, 'id'> = {
          teacherId: uid,
          sectionId: selectedSectionId,
          lessonIds: selectedLessonIds,
          academicYearId,
        };
        const { addDocument } = await import('../services/firestoreService');
        await addDocument('teacher_assignments', assignment);
      }

      setName('');
      setEmail('');
      setTempPassword('');
      setSelectedLessonIds([]);
      setShowForm(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('email-already-in-use')) {
        setError('Bu e-posta adresi zaten kullanılıyor.');
      } else {
        setError('Hesap oluşturulurken hata oluştu.');
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: AppUser) {
    await updateDocument('users', user.uid, { isActive: !user.isActive });
  }

  async function sendReset(user: AppUser) {
    await sendPasswordResetEmail(auth, user.email);
    setResetSent(user.uid);
    setTimeout(() => setResetSent(null), 3000);
  }

  function getAssignment(uid: string): TeacherAssignment | undefined {
    return teacherAssignments.find((a) => a.teacherId === uid);
  }

  return (
    <div className="space-y-5">
      {/* Başlık + Yeni Kullanıcı */}
      <div className="flex items-center justify-between">
        <p className="font-semibold" style={{ color: '#2C2C1E' }}>
          Öğretmenler ({teachers.length})
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: '#5A5A40', color: 'white' }}
        >
          <UserPlus size={16} />
          Yeni Öğretmen
        </button>
      </div>

      {/* Yeni öğretmen formu */}
      {showForm && (
        <div className="p-4 rounded-2xl space-y-4" style={{ border: '1px solid #E0DDD0', backgroundColor: 'white' }}>
          <p className="font-medium text-sm" style={{ color: '#2C2C1E' }}>Yeni Öğretmen Ekle</p>

          {error && (
            <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF3F3', color: '#C62828' }}>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Ad Soyad</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ogretmen@okul.edu.tr"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Geçici Şifre (min. 8 karakter)</label>
              <input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Geçici123!"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none font-mono"
                style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#6B6B50' }}>Şube</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
              >
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: '#6B6B50' }}>Dersler</label>
            <div className="flex flex-wrap gap-2">
              {lessons.map((l) => (
                <button
                  key={l.id}
                  onClick={() => toggleLesson(l.id!)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                  style={{
                    backgroundColor: selectedLessonIds.includes(l.id!) ? l.color : '#F5F5F0',
                    color: selectedLessonIds.includes(l.id!) ? 'white' : '#6B6B50',
                    border: `1px solid ${selectedLessonIds.includes(l.id!) ? l.color : '#E0DDD0'}`,
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#5A5A40', color: 'white', opacity: creating ? 0.7 : 1 }}
            >
              {creating ? 'Oluşturuluyor…' : 'Hesap Oluştur'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: '#F5F5F0', color: '#6B6B50' }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Öğretmen listesi */}
      <div className="space-y-2">
        {teachers.map((user) => {
          const assignment = getAssignment(user.uid);
          const section = sections.find((s) => s.id === assignment?.sectionId);
          const assignedLessons = assignment?.lessonIds
            .map((id) => lessons.find((l) => l.id === id)?.name)
            .filter(Boolean) ?? [];

          return (
            <div
              key={user.uid}
              className="p-4 rounded-2xl"
              style={{
                border: '1px solid #E0DDD0',
                backgroundColor: user.isActive ? 'white' : '#F5F5F0',
                opacity: user.isActive ? 1 : 0.7,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: '#2C2C1E' }}>{user.displayName}</p>
                  <p className="text-xs" style={{ color: '#6B6B50' }}>{user.email}</p>
                  {section && (
                    <p className="text-xs mt-1" style={{ color: '#5A5A40' }}>
                      {section.name} — {assignedLessons.join(', ') || 'Ders atanmamış'}
                    </p>
                  )}
                  {user.mustChangePassword && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF8E1', color: '#E65100' }}>
                      İlk giriş şifresi değiştirilmedi
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Şifre sıfırla */}
                  <button
                    onClick={() => sendReset(user)}
                    title="Şifre sıfırlama e-postası gönder"
                    className="p-2 rounded-xl transition-colors"
                    style={{
                      backgroundColor: resetSent === user.uid ? '#E8F5E9' : '#F5F5F0',
                      color: resetSent === user.uid ? '#2E7D32' : '#6B6B50',
                    }}
                  >
                    {resetSent === user.uid ? <Mail size={16} /> : <KeyRound size={16} />}
                  </button>
                  {/* Aktif/Pasif */}
                  {user.uid !== adminUid && (
                    <button
                      onClick={() => toggleActive(user)}
                      title={user.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                      className="p-2 rounded-xl transition-colors"
                      style={{ backgroundColor: '#F5F5F0', color: user.isActive ? '#2E7D32' : '#9E9E9E' }}
                    >
                      {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

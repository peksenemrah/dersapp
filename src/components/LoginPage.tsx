import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, BookOpen } from 'lucide-react';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'email' | 'google'>('email');

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('E-posta ve şifre alanları zorunludur.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('E-posta veya şifre hatalı.');
      } else if (msg.includes('user-not-found')) {
        setError('Bu e-posta ile kayıtlı kullanıcı bulunamadı.');
      } else if (msg.includes('too-many-requests')) {
        setError('Çok fazla başarısız deneme. Lütfen bir süre bekleyin.');
      } else {
        setError('Giriş yapılırken bir hata oluştu.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
    } catch {
      setError('Google ile giriş yapılırken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F5F0' }}>
      <div className="w-full max-w-md">
        {/* Logo / Başlık */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl mb-4" style={{ backgroundColor: '#5A5A40' }}>
            <BookOpen className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#2C2C1E', fontFamily: 'Georgia, serif' }}>
            Dijital Ders Defteri
          </h1>
          <p className="text-sm mt-1" style={{ color: '#6B6B50' }}>Kazanım Takip Sistemi</p>
        </div>

        {/* Kart */}
        <div className="bg-white rounded-3xl shadow-lg p-8" style={{ border: '1px solid #E0DDD0' }}>
          {/* Mod seçimi */}
          <div className="flex rounded-2xl overflow-hidden mb-6" style={{ border: '1px solid #E0DDD0' }}>
            <button
              onClick={() => setMode('email')}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'email' ? '#5A5A40' : 'transparent',
                color: mode === 'email' ? 'white' : '#6B6B50',
              }}
            >
              E-posta ile Giriş
            </button>
            <button
              onClick={() => setMode('google')}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                backgroundColor: mode === 'google' ? '#5A5A40' : 'transparent',
                color: mode === 'google' ? 'white' : '#6B6B50',
              }}
            >
              Google ile Giriş
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF3F3', color: '#C62828', border: '1px solid #FFCDD2' }}>
              {error}
            </div>
          )}

          {mode === 'email' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C1E' }}>
                  E-posta
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B50' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@okul.edu.tr"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      border: '1px solid #E0DDD0',
                      backgroundColor: '#F5F5F0',
                      color: '#2C2C1E',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C1E' }}>
                  Şifre
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B50' }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                    style={{
                      border: '1px solid #E0DDD0',
                      backgroundColor: '#F5F5F0',
                      color: '#2C2C1E',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{ backgroundColor: '#5A5A40', color: 'white', opacity: loading ? 0.7 : 1 }}
              >
                <LogIn size={16} />
                {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
              </button>
            </form>
          ) : (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border transition-colors"
              style={{ borderColor: '#E0DDD0', color: '#2C2C1E', opacity: loading ? 0.7 : 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {loading ? 'Giriş yapılıyor...' : 'Google ile Giriş Yap'}
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#9E9E9E' }}>
          Hesabınız yoksa okul yöneticinizle iletişime geçin.
        </p>
      </div>
    </div>
  );
}

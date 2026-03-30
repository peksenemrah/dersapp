import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordModal() {
  const { changePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await changePassword(password);
    } catch {
      setError('Şifre değiştirilirken hata oluştu. Tekrar giriş yapmayı deneyin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FFF3CD' }}>
            <Lock size={20} style={{ color: '#F57F17' }} />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: '#2C2C1E' }}>Şifre Değiştirme Zorunlu</h2>
            <p className="text-xs" style={{ color: '#6B6B50' }}>İlk giriş için yeni şifre belirleyin.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF3F3', color: '#C62828' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C1E' }}>Yeni Şifre</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="En az 8 karakter"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none pr-10"
                style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#6B6B50' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#2C2C1E' }}>Şifre Tekrar</label>
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Şifreyi tekrar girin"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ border: '1px solid #E0DDD0', backgroundColor: '#F5F5F0', color: '#2C2C1E' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-medium text-sm transition-opacity"
            style={{ backgroundColor: '#5A5A40', color: 'white', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Kaydediliyor...' : 'Şifremi Değiştir'}
          </button>
        </form>
      </div>
    </div>
  );
}

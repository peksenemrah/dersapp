# Dijital Ders Defteri & Kazanım Takip Sistemi

İlkokul öğretmenlerinin günlük ders işleyişini kayıt altına almasına, haftalık ders programlarını yönetmesine ve müfredat kazanımlarını takip etmesine olanak tanıyan web uygulaması.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Stil | Tailwind CSS v4 |
| Backend | Firebase Firestore |
| Auth | Firebase Auth (Google + E-posta/Şifre) |
| Tarih | date-fns |
| İkonlar | Lucide React |

## Özellikler

### Öğretmen
- Günlük ders kaydı (5 farklı durum: İşlendi, Kısmen, Ertelendi, İşlenemedi, İzin/Rapor)
- Ders notu ekleme
- Haftalık program görünümü ve yazdırma
- Kazanım otomatik hesaplama (tatil haftaları düzeltilmiş)

### Admin
- Ders programı editörü (haftalık saat limiti validasyonu)
- Tek tek kazanım girişi
- **Toplu kazanım girişi** (birden fazla satırı yapıştır, önizle, kaydet)
- Akademik takvim yönetimi (tatil haftası işaretleme)
- Kullanıcı yönetimi (e-posta/şifre hesap oluşturma, şube/ders atama)
- Öğretmen izin/rapor dönem yönetimi

## Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Firebase Projesi Kur

1. [Firebase Console](https://console.firebase.google.com)'dan yeni proje oluştur
2. Authentication → Sign-in methods: **Google** ve **Email/Password** aktifleştir
3. Firestore Database oluştur
4. Project Settings → Web app oluştur → config bilgilerini kopyala

### 3. Ortam Değişkenlerini Ayarla

```bash
cp .env.example .env
```

`.env` dosyasını Firebase config ile doldur:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ADMIN_EMAIL=senin@email.com
```

### 4. Firestore Güvenlik Kurallarını Yükle

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

Ya da Firebase Console → Firestore → Rules sekmesine `firestore.rules` içeriğini yapıştır.

### 5. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

### 6. İlk Giriş

`VITE_ADMIN_EMAIL` ile Google veya e-posta/şifre ile giriş yap. Sistem otomatik olarak:
- Kullanıcıya **admin** rolü atar
- Örnek dersler, haftalık program ve kazanımları yükler

## Proje Yapısı

```
src/
├── App.tsx                  # Ana uygulama, navigasyon
├── types.ts                 # TypeScript tip tanımları
├── constants.ts             # Sabitler, başlangıç verileri
├── firebase.ts              # Firebase konfigürasyonu
├── index.css                # Global stiller
├── main.tsx                 # Giriş noktası
├── contexts/
│   └── AuthContext.tsx      # Kimlik doğrulama
├── services/
│   ├── firestoreService.ts  # Firestore CRUD
│   └── seedService.ts       # Başlangıç verisi
└── components/
    ├── LoginPage.tsx         # Giriş sayfası (Google + e-posta)
    ├── ChangePasswordModal.tsx # İlk giriş şifre değişimi
    ├── DailyView.tsx         # Günlük ders kaydı
    ├── WeeklyView.tsx        # Haftalık tablo (yazdırma)
    ├── ScheduleEditor.tsx    # Ders programı (saat limiti)
    ├── CurriculumEditor.tsx  # Kazanım editörü
    ├── BulkOutcomeEntry.tsx  # Toplu kazanım girişi
    ├── CalendarSettings.tsx  # Akademik takvim
    ├── UserManagement.tsx    # Kullanıcı yönetimi
    └── TeacherStatusManager.tsx # İzin/rapor yönetimi
```

## Düzeltilen Hatalar

| Hata | Durum |
|------|-------|
| Tatil haftası kazanım hesabı | ✅ Düzeltildi — tatil haftaları eğitim sayısından çıkarılıyor |
| Not kaydetme sessizce başarısız | ✅ Düzeltildi — log yoksa otomatik oluşturuluyor |
| Admin sıfırlama butonu işlevsiz | ✅ Kaldırıldı |
| Timezone hatası (new Date → parseISO) | ✅ Düzeltildi |

## Lisans

MIT

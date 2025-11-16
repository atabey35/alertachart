# Vercel Deploy Kurulumu

## Adım 1: Vercel'e Giriş Yapın

1. [Vercel Dashboard](https://vercel.com/dashboard) → Giriş yapın
2. "Add New..." → "Project" seçin

## Adım 2: GitHub Repo'yu Bağlayın

1. "Import Git Repository" → GitHub hesabınızı bağlayın (gerekirse)
2. `atabey35/alertachart` repo'sunu seçin
3. "Import" butonuna tıklayın

## Adım 3: Proje Ayarları

**Framework Preset:** Next.js (otomatik algılanmalı)

**Root Directory:** `./` (root)

**Build Command:** `npm run build` (otomatik)

**Output Directory:** `.next` (otomatik)

**Install Command:** `npm install` (otomatik)

## Adım 4: Environment Variables Ekleyin

Vercel proje ayarlarında "Environment Variables" sekmesine gidin:

```
DATABASE_URL=your-neon-database-url
EXPO_ACCESS_TOKEN=your-expo-access-token (opsiyonel)
ADMIN_PASSWORD=alerta2024 (veya istediğiniz şifre)
BACKEND_URL=https://alertachart-backend-production.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://alertachart-backend-production.up.railway.app
```

**Önemli:** Her environment variable için:
- Production ✅
- Preview ✅  
- Development ✅

işaretleyin.

## Adım 5: Deploy

1. "Deploy" butonuna tıklayın
2. İlk deploy birkaç dakika sürecek
3. Deploy tamamlandığında URL alacaksınız (örn: `alertachart.vercel.app`)

## Adım 6: GitHub Integration (Otomatik Deploy)

Vercel otomatik olarak:
- `main` branch'e push yapıldığında → Production deploy
- Diğer branch'lere push yapıldığında → Preview deploy

## Kontrol

Deploy sonrası:
- Vercel Dashboard'da deploy durumunu görebilirsiniz
- GitHub repo'da her commit için Vercel deployment badge göreceksiniz
- Production URL'den sitenize erişebilirsiniz

## Troubleshooting

### Build Failed
- `package.json` kontrol edin
- Environment variables doğru mu kontrol edin
- Build logs'a bakın

### Environment Variables Çalışmıyor
- Variable adlarını kontrol edin (büyük/küçük harf duyarlı)
- Production/Preview/Development için işaretlendiğinden emin olun
- Deploy sonrası yeniden deploy edin

## Custom Domain (Opsiyonel)

1. Vercel Dashboard → Project Settings → Domains
2. Domain ekleyin (örn: `alerta.kriptokirmizi.com`)
3. DNS ayarlarını yapın












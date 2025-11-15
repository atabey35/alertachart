# 🔄 Capacitor Refresh Button Sorunu - Roadmap

## 📋 Sorun
Capacitor'e geçiş yapıldıktan sonra refresh butonuna basıldığında harici tarayıcı açılıyor. Expo'da bu sorun yoktu çünkü React Native WebView'da `window.location.reload()` override edilmişti.

## 🎯 Hedef
Refresh butonuna basıldığında:
- ✅ Harici tarayıcı açılmamalı
- ✅ WebView içinde grafik yenilenmeli
- ✅ Native app içinde kalmalı

---

## 📊 Mevcut Durum Analizi

### Expo'da Nasıl Çalışıyordu?
- React Native WebView'da `window.location.reload()` override edilmişti
- `window.ReactNativeWebView.postMessage('RELOAD')` gönderiliyordu
- Native tarafında WebView reload ediliyordu

### Capacitor'de Sorun
- `window.location.reload()` override edilmemiş
- Capacitor WebView'da default browser davranışı
- Harici tarayıcı açılıyor

---

## 🗺️ Çözüm Roadmap

### Phase 1: Analiz ve Tespit ✅
- [x] Sorunu tespit et
- [x] Expo'daki çözümü incele
- [x] Capacitor'deki mevcut durumu analiz et

### Phase 2: Capacitor WebView Override
- [ ] `window.location.reload()` override et
- [ ] Capacitor plugin ile WebView reload
- [ ] Test et

### Phase 3: Chart Component Reload (Alternatif)
- [ ] Chart component'lerini reload et (key değişimi)
- [ ] State-based refresh
- [ ] Test et

### Phase 4: Hybrid Approach (ÖNERİLEN)
- [ ] Hem override hem de chart reload
- [ ] Double protection
- [ ] Test et

### Phase 5: Testing & Polish
- [ ] Android test
- [ ] iOS test
- [ ] Web test (backward compatibility)
- [ ] Dokümantasyon güncelle

---

## 🔧 Teknik Detaylar

### Capacitor WebView Override
```javascript
// public/capacitor-index.html veya injected script
window.location.reload = function() {
  if (window.Capacitor) {
    // Capacitor plugin ile reload
    window.Capacitor.Plugins.WebViewController?.reload();
  } else {
    // Web'de normal reload
    originalReload.call(window.location);
  }
};
```

### Chart Component Reload
```typescript
// app/page.tsx
const [chartRefreshKey, setChartRefreshKey] = useState(0);

// Refresh butonu
onClick={() => {
  if (window.Capacitor) {
    setChartRefreshKey(prev => prev + 1);
  } else {
    window.location.reload();
  }
}}
```

---

## ✅ Başarı Kriterleri
1. Refresh butonuna basıldığında harici tarayıcı açılmamalı
2. Grafikler WebView içinde yenilenmeli
3. Native app içinde kalmalı
4. Web'de normal reload çalışmalı (backward compatibility)


# 🎵 Setup File Suara (Audio)

## Cara Menambahkan File MP3

### 1. Buat Folder `notif/`
Di folder yang sama dengan `index.html`, buat folder:
```
/notif/
```

### 2. Download File MP3
Download 8 file MP3 dari internet (contoh: freesound.org, zapsplat.com, atau buat sendiri):

| File | Durasi | Karakter Suara | Contoh Sumber |
|------|--------|----------------|---------------|
| `scan.mp3` | 0.3s | Beep scanner pendek | Barcode scanner beep |
| `ok.mp3` | 0.2s | Ding positif | Cash register ding |
| `success.mp3` | 1.0s | Chime gembira | Success notification chime |
| `warning.mp3` | 0.5s | Buzzer soft | Warning alert soft |
| `error.mp3` | 0.5s | Buzzer keras | Error/reject buzzer |
| `notif.mp3` | 0.4s | Bell gentle | Notification bell |
| `tap.mp3` | 0.1s | Click subtle | UI button click |
| `delete.mp3` | 0.3s | Swoosh | Delete/remove swoosh |

### 3. Fallback Otomatis
Jika file MP3 tidak ditemukan, sistem otomatis pakai **Web Audio API Synthesizer** (built-in browser, tanpa file):

- ✅ Tidak perlu server tambahan
- ✅ Tidak perlu install apapun
- ✅ Browser modern support 100%

### 4. Test Suara
Buka browser console (F12 → Console) dan ketik:
```javascript
Beep.scan();      // Scanner beep
Beep.ok();        // Confirmation ding
Beep.success();   // Success chime
Beep.warning();   // Warning buzz
Beep.no();        // Error buzz
Beep.alert();     // Notification bell
Beep.tap();       // UI tap
Beep.delete();    // Delete swoosh
```

### 5. Volume
```javascript
Beep.setVolume(0.8);  // 0.0 - 1.0 (default: 0.5)
```

### 6. Silent Mode
```javascript
Beep.toggleSilent();  // Toggle on/off
```

---

**Catatan:** Jika tidak punya file MP3, biarkan saja folder `notif/` kosong. Synthesizer akan aktif otomatis!

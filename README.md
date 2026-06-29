# Kasir Pro - Open Source Deployment Guide

## 🔐 Sistem Autentikasi Layered

### Layer 1: Local DB (First-Run Only)
- Untuk setup awal sebelum Firebase dikonfigurasi
- Akun default: `adly` / `12345` (Owner)
- **Auto-disable** ketika Firebase Auth aktif

### Layer 2: Firebase Auth (Primary)
- Autentikasi server-side yang aman
- Tidak bisa di-bypass client-side
- Semua device wajib login dengan akun Firebase resmi

## 🚀 Setup Pertama Kali (First-Run)

### 1. Buka Aplikasi
- Login dengan akun lokal: `adly` / `12345`
- Masuk menu **🔧 Firebase**

### 2. Konfigurasi Firebase
- Isi API Key, Database URL, Project ID dari Firebase Console
- Klik **🧪 Test Koneksi** → harus sukses
- Klik **💾 Simpan Config**
- **Refresh halaman (F5)**

### 3. Setup Firebase Auth di Console
- Buka [Firebase Console](https://console.firebase.google.com)
- Authentication → Sign-in method → Email/Password → Enable
- Buat user pertama (Owner) dengan email & password

### 4. Aktivasi Firebase Mode
- Login dengan akun Firebase (email + password)
- Sistem otomatis:
  - Set `system_config/auth_mode` = `firebase`
  - Disable semua akun lokal
  - Selanjutnya wajib pakai Firebase Auth

### 5. Deploy Security Rules
- Copy isi `firebase-security-rules.json`
- Firebase Console → Realtime Database → Rules → Paste → Publish

## 🛡️ Keamanan

### Anti Tamper (Client-Side)
| Serangan | Pertahanan |
|----------|------------|
| Edit `auth.js` di DevTools | ❌ Tidak cukup, validasi di Firebase server |
| Hapus check localStorage | ❌ Firebase tetap cek server-side |
| Bypass ke lokal | ❌ Lokal dihapus/dinonaktifkan otomatis |
| Edit localStorage token | ❌ Token diverifikasi Firebase server |

### Rate Limiting
- 5x gagal login → lockout 5 menit
- Counter reset setelah 30 menit

### Session Security
- Token Firebase di-refresh otomatis
- Session timeout 8 jam
- Single sign-out dari semua device

## 📁 File Penting

| File | Keterangan |
|------|------------|
| `firebase-config.js` | Konfigurasi Firebase via UI |
| `firebase-auth.js` | Autentikasi Firebase layer |
| `auth.js` | Login flow lokal + Firebase |
| `firebase-security-rules.json` | Rules database (deploy ke Firebase) |
| `index.html` | UI login + form Firebase |

## 🔄 Flow Login

```
User input credentials
    ↓
Cek Firebase Auth (online)
    ├─ Sukses → Login Firebase, token verified server
    └─ Gagal/Offline → Cek lokal
        ├─ Lokal ada & Firebase belum aktif → Login lokal (first-run)
        └─ Lokal ada tapi Firebase aktif → ❌ REJECT
```

## 📝 Notes

- **Jangan** push `firebase-security-rules.json` ke repo public tanpa modifikasi
- **Selalu** ganti default config Firebase di `firebase-config.js` sebelum deploy
- **Backup** config Firebase di menu 🔧 Firebase → Export JSON

## 🆘 Troubleshooting

### "Akun lokal dinonaktifkan"
→ Firebase Auth sudah aktif. Gunakan akun Firebase resmi.

### "Firebase not available"
→ Cek koneksi internet atau config Firebase belum diisi.

### "Permission denied"
→ Security Rules Firebase belum di-deploy. Copy dari `firebase-security-rules.json`.

---
**License:** MIT Open Source
**Version:** 2.0 (Layered Security)

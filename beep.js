// beep.js — Suara Kustom Menggunakan File MP3 Lokal (Full Versi Offline)

const Beep = {
    // Fungsi pembantu untuk memuat dan memutar file MP3 secara offline
    putarAudio(namaFile) {
        try {
            const audio = new Audio(namaFile);
            audio.volume = 0.5; // Mengatur volume (0.0 sampai 1.0)
            audio.play();
        } catch (err) {
            console.log("Gagal memutar audio kustom: " + namaFile, err);
        }
    },

    // Dipicu saat scanner mendeteksi barcode frame kamera
    scan() {
        this.putarAudio("notif/scan.mp3");
    },

    // Dipicu saat barcode berhasil masuk ke tabel kasir
    ok() {
        this.putarAudio("notif/scan.mp3");
    },

    // Dipicu saat ada kesalahan input / login gagal
    no() {
        this.putarAudio("notif/warning.mp3");
    },

    // Dipicu saat tombol "Selesai & Cetak Struk" sukses mengeksekusi pembayaran
    success() {
        this.putarAudio("notif/success.mp3");
    },

    // Dipicu saat stok rak habis/kosong sewaktu di-scan
    warning() {
        this.putarAudio("notif/warning.mp3");
    },

    // Dipicu saat ada lonceng notifikasi Request Stok baru masuk
    alert() {
        this.putarAudio("notif/success.mp3"); // Bisa diganti file ringtone lain jika ada
    }
};

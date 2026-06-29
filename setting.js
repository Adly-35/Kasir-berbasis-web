// ==========================================
// FILE: setting.js (REVISI UTUH - TOTAL CLOUD)
// ==========================================

const Setting = {
    logoBase64: "", // Menampung data string image logo

    // 1. MEMBUAT PRATINJAU LOGO SAAT PROSES UPLOAD DI HP
    pratinjauLogo(input) {
        const file = input.files[0];
        if (!file) return;

        // Batasi ukuran file maksimal 1MB agar tidak membebani Firebase Realtime Database
        if (file.size > 1024 * 1024) {
            alert("❌ Ukuran logo terlalu besar! Maksimal ukuran file adalah 1 MB.");
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.logoBase64 = e.target.result;
            const img = document.getElementById('imgPreviewLogoToko');
            if (img) {
                img.src = this.logoBase64;
                img.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    // 2. MENYIMPAN / EDIT DATA PROFIL TOKO LANGSUNG KE FIREBASE NODE "pengaturan_toko"
    async simpanProfilTokoCloud() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            alert("❌ Firebase belum terhubung sempurna!");
            return;
        }

        const kode = document.getElementById('settingKodeToko').value.trim();
        const nama = document.getElementById('namaToko').value.trim();
        const alamat = document.getElementById('alamatToko').value.trim();
        const kota = document.getElementById('settingKotaToko').value.trim();
        const telp = document.getElementById('settingTelpToko').value.trim();

        if (!kode) {
            alert("❌ Kode Toko wajib diisi berupa angka (Misal: 119)!");
            return;
        }

        // Munculkan overlay loading pemroses data
        if (typeof showLoading === 'function') showLoading("Menyinkronkan Profil Toko...");

        const profilData = {
            kode: kode, // Menyimpan kode angka toko ke Cloud
            nama: nama,
            alamat: alamat,
            kota: kota,
            telp: telp,
            logoData: this.logoBase64, // Menyimpan string base64 logo ke cloud
            lastUpdate: Date.now()
        };

        try {
            // Set data mutakhir ke path utama firebase database
            await firebase.database().ref('pengaturan_toko').set(profilData);
            
            // Perbarui nama toko pada teks header aplikasi (Pojok Kiri Atas) secara instan
            const headerNama = document.getElementById('txtNamaTokoHeader');
            if (headerNama) headerNama.textContent = nama || "KASIR PRO";

            if (typeof hideLoading === 'function') hideLoading();
            alert("✅ Data Toko Berhasil Disimpan!\nSeluruh struk belanja & nomor serial Trx-ID otomatis sinkron.");
        } catch (error) {
            if (typeof hideLoading === 'function') hideLoading();
            console.error("Gagal sinkron data toko ke cloud:", error);
            alert("❌ Gagal menyimpan profil toko ke Firebase Cloud.");
        }
    },

    // 3. SEBAGAI PENGISI OTOMATIS: AMBIL DATA DARI CLOUD SAAT FORM DIBUKA (JIKA KOSONG YA KOSONG)
    async muatProfilToko() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) return;

        try {
            const snap = await firebase.database().ref('pengaturan_toko').once('value');
            const info = snap.val();
            
            // Elemen-elemen input form di menu/tab toko
            const elKode = document.getElementById('settingKodeToko');
            const elNama = document.getElementById('namaToko');
            const elAlamat = document.getElementById('alamatToko');
            const elKota = document.getElementById('settingKotaToko');
            const elTelp = document.getElementById('settingTelpToko');
            const imgPreview = document.getElementById('imgPreviewLogoToko');
            const headerNama = document.getElementById('txtNamaTokoHeader');

            if (info) {
                // Aturan Main: Jika data ada di Firebase, isi kolom input otomatis. Jika tidak, kosong murni ("")
                if (elKode) elKode.value = info.kode || "";
                if (elNama) elNama.value = info.nama || "";
                if (elAlamat) elAlamat.value = info.alamat || "";
                if (elKota) elKota.value = info.kota || "";
                if (elTelp) elTelp.value = info.telp || "";
                
                // Urusan Sinkronisasi Logo Toko
                if (info.logoData) {
                    this.logoBase64 = info.logoData;
                    if (imgPreview) { 
                        imgPreview.src = info.logoData; 
                        imgPreview.style.display = 'block'; 
                    }
                } else {
                    this.logoBase64 = "";
                    if (imgPreview) imgPreview.style.display = 'none';
                }

                // Set teks nama toko di bagian header navigasi atas aplikasi
                if (headerNama) headerNama.textContent = info.nama || "KASIR PRO";
            } else {
                // Jika node pengaturan_toko di Firebase benar-benar kosong total (baru pertama kali setup)
                if (elKode) elKode.value = "";
                if (elNama) elNama.value = "";
                if (elAlamat) elAlamat.value = "";
                if (elKota) elKota.value = "";
                if (elTelp) elTelp.value = "";
                this.logoBase64 = "";
                if (imgPreview) imgPreview.style.display = 'none';
                if (headerNama) headerNama.textContent = "KASIR PRO";
            }
        } catch (e) { 
            console.error("Gagal memuat profil toko dari Firebase:", e); 
        }
    }
};

// Memicu pembacaan data otomatis beberapa detik setelah DOM halaman siap dimuat browser HP
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { 
        Setting.muatProfilToko(); 
    }, 3500); // Durasi jeda agar koneksi Firebase aman terhubung terlebih dahulu
});

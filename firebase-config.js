// firebase-config.js — Modul Pengaturan Firebase via WebUI (Open Source Friendly)
// User bisa ganti konfigurasi Firebase tanpa edit file JS

const FirebaseConfigManager = {
    // Default config (hardcoded fallback - bisa diganti user)
    defaultConfig: {
        apiKey: "AIzaSyBEFlAHJD0y68QEiOPBvqUIMZWFvF2NkQg",
        authDomain: "kasirpro-adly.firebaseapp.com",
        databaseURL: "https://kasirpro-adly-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "kasirpro-adly",
        storageBucket: "kasirpro-adly.firebasestorage.app",
        messagingSenderId: "562719212970",
        appId: "1:562719212970:web:b6ce9c52a9764d108117d3",
        measurementId: "G-39FYCKCR5T"
    },

    // Key untuk localStorage
    STORAGE_KEY: 'kasirpro_firebase_config',

    // Ambil config aktif (dari localStorage atau default)
    getConfig() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validasi minimal: harus ada apiKey dan databaseURL
                if (parsed.apiKey && parsed.databaseURL) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Gagal parse config Firebase:", e);
        }
        return { ...this.defaultConfig };
    },

    // Simpan config baru
    saveConfig(config) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
            return true;
        } catch (e) {
            console.error("Gagal simpan config:", e);
            return false;
        }
    },

    // Hapus config custom (kembali ke default)
    resetConfig() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    // Test koneksi ke Firebase
    async testConnection(config) {
        return new Promise((resolve) => {
            try {
                // Buat instance Firebase sementara untuk test
                const testApp = firebase.initializeApp(config, 'testConnection');
                const db = testApp.database();

                // Coba write ke path test
                const testRef = db.ref('.info/connected');
                testRef.once('value')
                    .then(() => {
                        firebase.app('testConnection').delete();
                        resolve({ success: true, message: "✅ Koneksi Firebase berhasil!" });
                    })
                    .catch((err) => {
                        firebase.app('testConnection').delete();
                        resolve({ success: false, message: "❌ Gagal konek: " + err.message });
                    });

                // Timeout 5 detik
                setTimeout(() => {
                    try { firebase.app('testConnection').delete(); } catch(e){}
                    resolve({ success: false, message: "❌ Timeout: Tidak ada respons dari Firebase dalam 5 detik." });
                }, 5000);
            } catch (err) {
                resolve({ success: false, message: "❌ Error: " + err.message });
            }
        });
    },

    // Render form dengan config aktif
    renderForm() {
        const config = this.getConfig();

        document.getElementById('fbApiKey').value = config.apiKey || '';
        document.getElementById('fbAuthDomain').value = config.authDomain || '';
        document.getElementById('fbDatabaseURL').value = config.databaseURL || '';
        document.getElementById('fbProjectId').value = config.projectId || '';
        document.getElementById('fbStorageBucket').value = config.storageBucket || '';
        document.getElementById('fbMessagingSenderId').value = config.messagingSenderId || '';
        document.getElementById('fbAppId').value = config.appId || '';
        document.getElementById('fbMeasurementId').value = config.measurementId || '';

        // Tampilkan status config saat ini
        this.updateStatusUI();
    },

    updateStatusUI() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const statusEl = document.getElementById('fbStatusText');
        const badgeEl = document.getElementById('fbStatusBadge');

        if (saved) {
            statusEl.textContent = "🔧 Menggunakan konfigurasi CUSTOM";
            badgeEl.textContent = "CUSTOM";
            badgeEl.style.background = "#2196F3";
        } else {
            statusEl.textContent = "📦 Menggunakan konfigurasi DEFAULT";
            badgeEl.textContent = "DEFAULT";
            badgeEl.style.background = "#757575";
        }
    },

    // Simpan dari form
    async saveFromForm() {
        const config = {
            apiKey: document.getElementById('fbApiKey').value.trim(),
            authDomain: document.getElementById('fbAuthDomain').value.trim(),
            databaseURL: document.getElementById('fbDatabaseURL').value.trim(),
            projectId: document.getElementById('fbProjectId').value.trim(),
            storageBucket: document.getElementById('fbStorageBucket').value.trim(),
            messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
            appId: document.getElementById('fbAppId').value.trim(),
            measurementId: document.getElementById('fbMeasurementId').value.trim()
        };

        // Validasi minimal
        if (!config.apiKey || !config.databaseURL || !config.projectId) {
            alert("❌ Wajib diisi: API Key, Database URL, dan Project ID!");
            return;
        }

        if (!config.databaseURL.startsWith('https://')) {
            alert("❌ Database URL harus dimulai dengan https://");
            return;
        }

        showLoading("Menyimpan konfigurasi...");

        this.saveConfig(config);
        this.updateStatusUI();

        hideLoading();
        alert("✅ Konfigurasi Firebase disimpan!\n\nSilakan refresh halaman untuk menerapkan perubahan.");
    },

    // Test koneksi dari form
    async testFromForm() {
        const config = {
            apiKey: document.getElementById('fbApiKey').value.trim(),
            authDomain: document.getElementById('fbAuthDomain').value.trim(),
            databaseURL: document.getElementById('fbDatabaseURL').value.trim(),
            projectId: document.getElementById('fbProjectId').value.trim(),
            storageBucket: document.getElementById('fbStorageBucket').value.trim(),
            messagingSenderId: document.getElementById('fbMessagingSenderId').value.trim(),
            appId: document.getElementById('fbAppId').value.trim(),
            measurementId: document.getElementById('fbMeasurementId').value.trim()
        };

        if (!config.apiKey || !config.databaseURL) {
            alert("❌ Isi API Key dan Database URL dulu!");
            return;
        }

        showLoading("Testing koneksi ke Firebase...");
        const result = await this.testConnection(config);
        hideLoading();

        alert(result.message);
    },

    // Reset ke default
    resetToDefault() {
        if (!confirm("Yakin kembali ke konfigurasi default? Semua setting custom akan hilang.")) return;
        this.resetConfig();
        this.renderForm();
        alert("📦 Konfigurasi direset ke default. Refresh halaman untuk menerapkan.");
    },

    // Export config (untuk backup/share)
    exportConfig() {
        const config = this.getConfig();
        const jsonStr = JSON.stringify(config, null, 2);

        // Copy ke clipboard
        navigator.clipboard.writeText(jsonStr).then(() => {
            alert("📋 Config JSON sudah dicopy ke clipboard!");
        }).catch(() => {
            // Fallback: tampilkan di alert
            alert("📋 Config JSON (copy manual):\n\n" + jsonStr);
        });
    },

    // Import config dari JSON string
    importFromJson() {
        const jsonStr = prompt("Paste JSON konfigurasi Firebase di sini:");
        if (!jsonStr) return;

        try {
            const config = JSON.parse(jsonStr);
            if (!config.apiKey || !config.databaseURL) {
                alert("❌ JSON tidak valid! Harus ada apiKey dan databaseURL.");
                return;
            }

            this.saveConfig(config);
            this.renderForm();
            alert("✅ Config berhasil diimport! Refresh halaman untuk menerapkan.");
        } catch (e) {
            alert("❌ Format JSON tidak valid!");
        }
    }
};

// Helper: Dapatkan config untuk inisialisasi Firebase
function getFirebaseConfig() {
    return FirebaseConfigManager.getConfig();
}

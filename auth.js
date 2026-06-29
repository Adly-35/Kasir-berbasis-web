// auth.js — Modul Autentikasi Rombakan v2.0 (Izin Akses Isolasi Barang - Part 1)
const Auth = {
    currentUser: null,
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000,
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 5 * 60 * 1000,

    _akunMaster: {
        "adly": { username: "adly", nama: "Adly Owner", role: "Owner", level: "admin", pass: "MTIzNDU=" },
        "kepala_toko1": { username: "kepala_toko1", nama: "Kaprul Toko 1", role: "Supervisor", level: "supervisor", pass: "MTIzNDU=" },
        "kasir1": { username: "kasir1", nama: "Siti Kasir 1", role: "Kasir", level: "kasir", pass: "MTIzNDU=" }
    },

    async init() {
        let firebaseReady = false;
        if (typeof FirebaseAuth !== 'undefined') {
            try { firebaseReady = await FirebaseAuth.init(); } catch (e) { firebaseReady = false; }
        }

        const sessionData = localStorage.getItem('kasirPro_session');
        if (!sessionData) { this.tampilkanLogin(); return; }

        try {
            const parsed = JSON.parse(sessionData);
            if (parsed.type === 'firebase') {
                const verified = await FirebaseAuth.checkSession();
                if (!verified) { this.logout("Sesi Firebase kedaluwarsa."); return; }
                this.currentUser = verified;
                this.applyRoleUI(); this.tampilkanApp(); return;
            }

            if (!FirebaseAuth.isLocalAllowed()) { this.logout("Akun lokal dinonaktifkan."); return; }
            if (!parsed.token || !parsed.user) throw new Error("Sesi rusak");

            const expectedToken = btoa(parsed.user.username + ":" + parsed.user.role + ":" + parsed.timestamp + ":" + this._getSecret());
            if (parsed.token !== expectedToken) throw new Error("Token tidak valid");

            if (Date.now() - parsed.timestamp > this.SESSION_TIMEOUT) { this.logout("Sesi berakhir."); return; }

            this.currentUser = parsed.user;
            this.applyRoleUI();
            this.tampilkanApp();

            setTimeout(() => {
                if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang();
            }, 500);
        } catch (e) { this.logout("Sesi error."); }
    },

    _getSecret() { return "kasirpro_secret_v2_2026"; },
    _isLocked(user) { return false; },
    _recordFailedAttempt(user) { return false; },
    _clearFailedAttempts(user) {},

    // ATURAN HAK AKSES JENDELA (TAB BARANG SEKARANG DIBUKA UNTUK SEMUA LEVEL)
    checkAccess(tabId) {
        // Tab yang boleh dimasuki oleh siapa saja (Kasir, Supervisor, Owner)
        const semuaLevelTabs = ['tab-kasir', 'tab-master', 'tab-patroli', 'tab-request'];
        
        if (this.isOwner()) return true;

        if (this.isSupervisor() || this.isKasir()) {
            if (semuaLevelTabs.includes(tabId)) {
                return true;
            }
            alert("⛔ Akses Ditolak! Menu ini dikunci khusus untuk Owner Utama.");
            return false;
        }
        return false;
    },
    async login() {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        if (!usernameEl || !passwordEl) return;

        const username = usernameEl.value.trim().toLowerCase();
        const password = passwordEl.value;
        if (!username || !password) { alert("❌ Isi Username & Password!"); return; }

        try {
            let karyawan = this._akunMaster[username];
            if (!karyawan && typeof DB !== 'undefined' && DB.instance) {
                karyawan = await DB.get("karyawan", username);
            }

            if (!karyawan || karyawan.pass !== btoa(password)) { alert("❌ Kredensial Salah!"); return; }

            let roleFinal = 'Kasir';
            if (karyawan.role === 'Owner' || karyawan.level === 'admin') roleFinal = 'Owner';
            if (karyawan.role === 'Supervisor' || karyawan.level === 'supervisor') roleFinal = 'Supervisor';

            const userData = { username: karyawan.username, nama: karyawan.nama, role: roleFinal, type: 'local' };
            const timestamp = Date.now();
            const token = btoa(userData.username + ":" + userData.role + ":" + timestamp + ":" + this._getSecret());

            localStorage.setItem('kasirPro_session', JSON.stringify({ type: 'local', user: userData, token, timestamp }));
            this.currentUser = userData;

            const lbl = document.getElementById('labelKasirAktif');
            if (lbl) lbl.textContent = `👤 ${userData.nama}`;

            this.applyRoleUI();
            this.tampilkanApp();

            usernameEl.value = ''; passwordEl.value = '';
            if (typeof bukaTab === 'function') bukaTab('tab-kasir');
        } catch (e) { alert("Gagal masuk."); }
    },

    logout(p = "Anda telah logout.") {
        localStorage.removeItem('kasirPro_session'); this.currentUser = null;
        alert(p); window.location.replace(window.location.href);
    },

    isOwner() { return this.currentUser && this.currentUser.role === 'Owner'; },
    isSupervisor() { return this.currentUser && this.currentUser.role === 'Supervisor'; },
    isKasir() { return this.currentUser && this.currentUser.role === 'Kasir'; },

    // ATURAN LIVE UI: Memunculkan tombol "Data Barang" di HP Kasir & Supervisor
    applyRoleUI() {
        // 1. Sembunyikan elemen khusus Owner terlebih dahulu
        document.querySelectorAll('.owner-only').forEach(el => el.classList.add('hidden'));

        // 2. Munculkan tombol navigasi menu berdasarkan Role saat ini
        const btnMaster = document.getElementById('nav-master'); // Tombol Data Barang

        if (this.isOwner()) {
            document.querySelectorAll('.owner-only').forEach(el => el.classList.remove('hidden'));
            if (btnMaster) btnMaster.classList.remove('hidden');
        } else if (this.isSupervisor() || this.isKasir()) {
            // KASIR & SUPERVISOR BISA INPUT BARANG: Maka hilangkan class 'hidden' dari tombol Data Barang
            if (btnMaster) btnMaster.classList.remove('hidden');
        }
    },

    tampilkanLogin() {
        const lg = document.getElementById('halaman-login'); const ap = document.getElementById('konten-aplikasi');
        if (lg) lg.style.display = 'flex'; if (ap) ap.classList.add('hidden');
    },
    tampilkanApp() {
        const lg = document.getElementById('halaman-login'); const ap = document.getElementById('konten-aplikasi');
        if (lg) lg.style.display = 'none'; if (ap) ap.classList.remove('hidden');
    }
};

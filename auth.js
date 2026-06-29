// auth.js — Modul Autentikasi Rombakan Total v2.0 (Layered Security Open Source)
// Layer 1: Local DB (Fallback first-run only, auto-disable when Firebase active)
// Layer 2: Firebase Auth (Primary, server-verified)

const Auth = {
    currentUser: null,
    SESSION_TIMEOUT: 8 * 60 * 60 * 1000,

    // Security: Max failed attempts before lockout
    MAX_FAILED_ATTEMPTS: 5,
    LOCKOUT_DURATION: 5 * 60 * 1000, // 5 minutes

    // Local master accounts (for first-run only)
    _akunMaster: {
        "adly": { username: "adly", nama: "Adly Owner", role: "Owner", level: "admin", pass: "MTIzNDU=" },
        "kepala_toko1": { username: "kepala_toko1", nama: "Kaprul Toko 1", role: "Supervisor", level: "supervisor", pass: "MTIzNDU=" },
        "kepala toko1": { username: "kepala toko1", nama: "Kaprul Toko 1", role: "Supervisor", level: "supervisor", pass: "MTIzNDU=" },
        "kasir1": { username: "kasir1", nama: "Siti Kasir 1", role: "Kasir", level: "kasir", pass: "MTIzNDU=" }
    },

    async init() {
        // Initialize Firebase Auth layer first (if available)
        let firebaseReady = false;
        if (typeof FirebaseAuth !== 'undefined') {
            try {
                firebaseReady = await FirebaseAuth.init();
            } catch (e) {
                console.warn("FirebaseAuth init failed:", e);
                firebaseReady = false;
            }
        } else {
            console.warn("FirebaseAuth not loaded, using local mode only");
        }

        const sessionData = localStorage.getItem('kasirPro_session');
        if (!sessionData) {
            this.tampilkanLogin();
            return;
        }

        try {
            const parsed = JSON.parse(sessionData);

            // Check session type
            if (parsed.type === 'firebase') {
                // Firebase session - verify with server
                const verified = await FirebaseAuth.checkSession();
                if (!verified) {
                    this.logout("Sesi Firebase tidak valid. Silakan login kembali.");
                    return;
                }
                this.currentUser = verified;
                this.applyRoleUI();
                this.tampilkanApp();
                return;
            }

            // Local session - check if Firebase is active
            if (!FirebaseAuth.isLocalAllowed()) {
                this.logout("Akun lokal telah dinonaktifkan. Gunakan akun Firebase resmi.");
                return;
            }

            // Validate local token
            if (!parsed.token || !parsed.user) throw new Error("Sesi tidak valid");

            const expectedToken = btoa(parsed.user.username + ":" + parsed.user.role + ":" + parsed.timestamp + ":" + this._getSecret());
            if (parsed.token !== expectedToken) throw new Error("Token tidak valid");

            const sekarang = Date.now();
            if (sekarang - parsed.timestamp > this.SESSION_TIMEOUT) {
                this.logout("Sesi Anda telah berakhir (8 jam). Silakan login kembali.");
                return;
            }

            this.currentUser = parsed.user;
            this.applyRoleUI();
            this.tampilkanApp();

            setTimeout(() => {
                if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang();
                if (typeof refreshBadgeNotifikasi === 'function') refreshBadgeNotifikasi();
            }, 500);

        } catch (e) {
            console.error("Sesi error:", e);
            this.logout("Sesi rusak. Silakan login kembali.");
        }
    },

    _getSecret() {
        return "kasirpro_secret_v2_2026";
    },

    // Check if account is locked
    _isLocked(username) {
        const lockData = localStorage.getItem('kasirpro_lock_' + username);
        if (!lockData) return false;

        try {
            const lock = JSON.parse(lockData);
            if (Date.now() < lock.until) {
                const remaining = Math.ceil((lock.until - Date.now()) / 1000);
                alert("🔒 Akun terkunci! Coba lagi dalam " + remaining + " detik.");
                return true;
            }
            // Lock expired, clear it
            localStorage.removeItem('kasirpro_lock_' + username);
            return false;
        } catch (e) {
            localStorage.removeItem('kasirpro_lock_' + username);
            return false;
        }
    },

    // Record failed attempt
    _recordFailedAttempt(username) {
        const key = 'kasirpro_failed_' + username;
        const data = localStorage.getItem(key);
        let attempts = 0;
        let firstAttempt = Date.now();

        if (data) {
            try {
                const parsed = JSON.parse(data);
                attempts = parsed.count || 0;
                firstAttempt = parsed.firstAttempt || Date.now();
            } catch (e) {}
        }

        attempts++;

        // Check if window expired (30 minutes)
        if (Date.now() - firstAttempt > 30 * 60 * 1000) {
            attempts = 1;
            firstAttempt = Date.now();
        }

        localStorage.setItem(key, JSON.stringify({
            count: attempts,
            firstAttempt: firstAttempt,
            lastAttempt: Date.now()
        }));

        // Lock account if max attempts reached
        if (attempts >= this.MAX_FAILED_ATTEMPTS) {
            localStorage.setItem('kasirpro_lock_' + username, JSON.stringify({
                until: Date.now() + this.LOCKOUT_DURATION,
                attempts: attempts
            }));
            localStorage.removeItem(key);
            alert("🔒 Terlalu banyak percobaan gagal! Akun dikunci selama 5 menit.");
            return true;
        }

        return false;
    },

    // Clear failed attempts on success
    _clearFailedAttempts(username) {
        localStorage.removeItem('kasirpro_failed_' + username);
        localStorage.removeItem('kasirpro_lock_' + username);
    },

    async login() {
        const usernameEl = document.getElementById('loginUsername');
        const passwordEl = document.getElementById('loginPassword');
        const emailEl = document.getElementById('loginEmail');

        if (!usernameEl || !passwordEl) {
            alert("❌ Form login mengalami gangguan, silakan refresh.");
            return;
        }

        const username = usernameEl.value.trim().toLowerCase();
        const password = passwordEl.value;
        const email = emailEl ? emailEl.value.trim() : '';

        if (!username || !password) {
            alert("❌ Harap masukkan Username dan Password!");
            return;
        }

        // Check lockout
        if (this._isLocked(username)) {
            return;
        }

        try {
            // Try Firebase Auth first if available and has users
            if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.authMode === 'firebase' && email) {
                try {
                    const session = await FirebaseAuth.loginFirebase(email, password);
                    this.currentUser = session;
                    this._clearFailedAttempts(username);

                    const labelKasir = document.getElementById('labelKasirAktif');
                    if (labelKasir) labelKasir.textContent = `👤 ${session.nama}`;

                    this.applyRoleUI();
                    this.tampilkanApp();

                    usernameEl.value = '';
                    passwordEl.value = '';
                    if (emailEl) emailEl.value = '';

                    if (typeof bukaTab === 'function') bukaTab('tab-kasir');
                    return;
                } catch (fbErr) {
                    // Firebase login failed, try local if allowed
                    console.log("Firebase login failed:", fbErr.message);
                    if (!FirebaseAuth.isLocalAllowed()) {
                        this._recordFailedAttempt(username);
                        alert("❌ Login Firebase gagal: " + fbErr.message);
                        return;
                    }
                }
            }

            // Local DB login (fallback)
            if (!FirebaseAuth.isLocalAllowed()) {
                this._recordFailedAttempt(username);
                alert("🔒 Akun lokal telah dinonaktifkan. Gunakan akun Firebase resmi.");
                return;
            }

            // Check local accounts
            let karyawan = this._akunMaster[username];
            if (!karyawan && typeof DB !== 'undefined' && DB.instance) {
                karyawan = await DB.get("karyawan", username);
            }

            // Check if local account is disabled
            if (karyawan && karyawan._disabled) {
                alert("🔒 Akun ini telah dinonaktifkan. Gunakan akun Firebase resmi.");
                return;
            }

            if (!karyawan) {
                this._recordFailedAttempt(username);
                alert("❌ Username tidak terdaftar!");
                return;
            }

            if (karyawan.pass !== btoa(password)) {
                const locked = this._recordFailedAttempt(username);
                if (!locked) {
                    alert("❌ Password yang Anda masukkan salah!");
                }
                return;
            }

            // Success - clear failed attempts
            this._clearFailedAttempts(username);

            let userRole = karyawan.role || karyawan.level || 'Kasir';
            let roleFinal = 'Kasir';

            if (userRole.toLowerCase() === 'owner' || userRole.toLowerCase() === 'admin') {
                roleFinal = 'Owner';
            } else if (userRole.toLowerCase() === 'supervisor' || userRole.toLowerCase() === 'kepala toko') {
                roleFinal = 'Supervisor';
            }

            const userData = {
                username: karyawan.username,
                nama: karyawan.nama,
                role: roleFinal,
                foto: karyawan.foto || null,
                type: 'local'
            };

            const timestamp = Date.now();
            const token = btoa(userData.username + ":" + userData.role + ":" + timestamp + ":" + this._getSecret());

            localStorage.setItem('kasirPro_session', JSON.stringify({
                type: 'local',
                user: userData,
                token: token,
                timestamp: timestamp
            }));

            this.currentUser = userData;

            const labelKasir = document.getElementById('labelKasirAktif');
            if (labelKasir) labelKasir.textContent = `👤 ${userData.nama}`;

            this.applyRoleUI();
            this.tampilkanApp();

            usernameEl.value = '';
            passwordEl.value = '';
            if (emailEl) emailEl.value = '';

            if (typeof bukaTab === 'function') {
                bukaTab('tab-kasir');
            }

        } catch (e) {
            this._recordFailedAttempt(username);
            alert("❌ Gagal masuk ke sistem kasir: " + e.message);
        }
    },

    logout(pesan = "Anda telah logout.") {
        localStorage.removeItem('kasirPro_session');
        this.currentUser = null;
        alert(pesan);
        setTimeout(() => {
            window.location.replace(window.location.href);
        }, 100);
    },

    isOwner() { return this.currentUser && this.currentUser.role === 'Owner'; },
    isSupervisor() { return this.currentUser && this.currentUser.role === 'Supervisor'; },
    isKasir() { return this.currentUser && this.currentUser.role === 'Kasir'; },

    checkAccess(tabId) {
        const semuaLevelTabs = ['tab-kasir', 'tab-master'];
        const kasirSupervisorTabs = ['tab-patroli', 'tab-request'];
        const ownerOnlyTabs = ['tab-stok-toko', 'tab-approval', 'tab-rekap', 'tab-karyawan', 'tab-setting', 'tab-firebase'];

        if (this.isOwner()) {
            return true;
        }

        if (this.isSupervisor()) {
            const supervisorTabs = [...semuaLevelTabs, ...kasirSupervisorTabs];
            if (!supervisorTabs.includes(tabId)) {
                alert("⛔ Akses Ditolak! Menu khusus Owner.");
                return false;
            }
            return true;
        }

        if (this.isKasir()) {
            const kasirTabs = [...semuaLevelTabs, ...kasirSupervisorTabs];
            if (!kasirTabs.includes(tabId)) {
                alert("⛔ Akses Ditolak! Menu khusus Supervisor/Owner.");
                return false;
            }
            return true;
        }

        return false;
    },

    applyRoleUI() {
        // Hide all role-specific elements first
        document.querySelectorAll('.owner-only').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.kasir-supervisor-only').forEach(el => el.classList.add('hidden'));

        if (this.isOwner()) {
            // Owner: show owner-only, hide kasir-supervisor-only
            document.querySelectorAll('.owner-only').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.kasir-supervisor-only').forEach(el => el.classList.add('hidden'));
        } else if (this.isSupervisor() || this.isKasir()) {
            // Kasir & Supervisor: show kasir-supervisor-only, hide owner-only
            document.querySelectorAll('.kasir-supervisor-only').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.owner-only').forEach(el => el.classList.add('hidden'));
        }
    },

    tampilkanLogin() {
        const loginScreen = document.getElementById('halaman-login');
        const mainApp = document.getElementById('konten-aplikasi');
        if (loginScreen) loginScreen.style.display = 'flex';
        if (mainApp) mainApp.classList.add('hidden');
    },

    tampilkanApp() {
        const loginScreen = document.getElementById('halaman-login');
        const mainApp = document.getElementById('konten-aplikasi');
        if (loginScreen) loginScreen.style.display = 'none';
        if (mainApp) mainApp.classList.remove('hidden');
    }
};

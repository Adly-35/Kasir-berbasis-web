// firebase-auth.js — Modul Autentikasi Firebase (Layered Security) — v2.1
// Layer 1: Local DB (Fallback first-run only)
// Layer 2: Firebase Auth (Primary, auto-disable local when active)

const FirebaseAuth = {
    auth: null,
    authMode: 'local',
    firebaseHasUsers: false,
    offlineCache: null,

    async init() {
        // Check if Firebase Auth SDK is fully loaded
        if (typeof firebase === 'undefined') {
            console.log("📡 Firebase SDK not loaded");
            this.authMode = 'local';
            return false;
        }

        if (!firebase.apps || firebase.apps.length === 0) {
            console.log("📡 Firebase not initialized");
            this.authMode = 'local';
            return false;
        }

        // Check if Auth SDK is available
        if (!firebase.auth) {
            console.log("📡 Firebase Auth SDK not available");
            this.authMode = 'local';
            return false;
        }

        try {
            this.auth = firebase.auth();

            // Check if Firebase has users via database
            const hasUsers = await this.checkFirebaseHasUsers();
            this.firebaseHasUsers = hasUsers;

            if (hasUsers) {
                console.log("🔒 Firebase mode active");
                this.authMode = 'firebase';
                await this.disableLocalAccounts();
            } else {
                console.log("📦 No Firebase users, local mode");
                this.authMode = 'local';
            }

            return true;
        } catch (err) {
            console.error("Firebase Auth init error:", err);
            this.authMode = 'local';
            return false;
        }
    },

    async checkFirebaseHasUsers() {
        return new Promise((resolve) => {
            try {
                const db = firebase.database();
                const ref = db.ref('system_config/auth_mode');

                ref.once('value')
                    .then(snapshot => {
                        resolve(snapshot.val() === 'firebase');
                    })
                    .catch(() => resolve(false));

                setTimeout(() => resolve(false), 5000);
            } catch (e) {
                resolve(false);
            }
        });
    },

    async disableLocalAccounts() {
        try {
            const localUsers = await DB.getAll("karyawan");
            for (const user of localUsers) {
                if (!user._firebaseProtected) {
                    user._disabled = true;
                    user._disabledReason = 'Firebase auth active';
                    user._disabledAt = Date.now();
                    await DB.put("karyawan", user);
                }
            }
            localStorage.setItem('kasirpro_firebase_active', 'true');
        } catch (err) {
            console.error("Error disabling local:", err);
        }
    },

    isLocalAllowed() {
        if (localStorage.getItem('kasirpro_firebase_active') === 'true') return false;
        return this.authMode === 'local' || this.authMode === 'offline';
    },

    async loginFirebase(email, password) {
        if (!this.auth) throw new Error("Firebase Auth not initialized");

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const db = firebase.database();
            const userData = await db.ref('users/' + user.uid).once('value');
            const profile = userData.val();

            if (!profile) throw new Error("Profile not found");

            const sessionData = {
                type: 'firebase',
                uid: user.uid,
                email: user.email,
                username: profile.username || email.split('@')[0],
                nama: profile.nama || 'User',
                role: profile.role || 'Kasir',
                foto: profile.foto || null,
                token: await user.getIdToken(),
                timestamp: Date.now()
            };

            localStorage.setItem('kasirPro_session', JSON.stringify(sessionData));
            this.authMode = 'firebase';
            localStorage.setItem('kasirpro_firebase_active', 'true');

            return sessionData;
        } catch (err) {
            console.error("Firebase login error:", err);
            throw err;
        }
    },

    async registerFirebase(email, password, userData) {
        if (!this.auth) throw new Error("Firebase Auth not initialized");

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            const db = firebase.database();
            await db.ref('users/' + user.uid).set({
                uid: user.uid,
                username: userData.username || email.split('@')[0],
                nama: userData.nama,
                email: email,
                role: userData.role || 'Kasir',
                foto: userData.foto || null,
                createdAt: Date.now()
            });

            await db.ref('system_config').update({
                auth_mode: 'firebase',
                activatedAt: Date.now()
            });

            await this.disableLocalAccounts();
            return user;
        } catch (err) {
            console.error("Firebase register error:", err);
            throw err;
        }
    },

    async logout() {
        if (this.auth) {
            try { await this.auth.signOut(); } catch (e) {}
        }
        localStorage.removeItem('kasirPro_session');
        localStorage.removeItem('kasirpro_firebase_active');
        this.authMode = 'local';
        window.location.replace(window.location.href);
    },

    async checkSession() {
        const sessionData = localStorage.getItem('kasirPro_session');
        if (!sessionData) return null;

        try {
            const parsed = JSON.parse(sessionData);
            if (Date.now() - parsed.timestamp > 8 * 60 * 60 * 1000) {
                await this.logout();
                return null;
            }

            if (parsed.type === 'firebase' && this.auth) {
                const user = this.auth.currentUser;
                if (!user) {
                    await this.logout();
                    return null;
                }
                parsed.token = await user.getIdToken(true);
                parsed.timestamp = Date.now();
                localStorage.setItem('kasirPro_session', JSON.stringify(parsed));
                return parsed;
            }

            return parsed;
        } catch (e) {
            await this.logout();
            return null;
        }
    },

    getCurrentUser() {
        const sessionData = localStorage.getItem('kasirPro_session');
        if (!sessionData) return null;
        try { return JSON.parse(sessionData); } catch (e) { return null; }
    },

    isOwner() {
        const user = this.getCurrentUser();
        return user && user.role === 'Owner';
    },

    isSupervisor() {
        const user = this.getCurrentUser();
        return user && user.role === 'Supervisor';
    },

    isKasir() {
        const user = this.getCurrentUser();
        return user && user.role === 'Kasir';
    }
};
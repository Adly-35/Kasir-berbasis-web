// db-sync.js — Modul Sinkronisasi Otomatis Berwaktu Firebase — VERSI PENUH & LENGKAP

const DBSync = {
    isSyncing: false,
    deviceId: localStorage.getItem('deviceId') || null,
    syncQueue: [],
    isProcessingQueue: false,

    init() {
        if (!this.deviceId) {
            this.deviceId = 'DEV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            localStorage.setItem('deviceId', this.deviceId);
        }

        // Ambil config dari FirebaseConfigManager (custom atau default)
        const firebaseConfig = (typeof FirebaseConfigManager !== 'undefined') 
            ? FirebaseConfigManager.getConfig() 
            : {
                apiKey: "AIzaSyBEFlAHJD0y68QEiOPBvqUIMZWFvF2NkQg",
                authDomain: "kasirpro-adly.firebaseapp.com",
                databaseURL: "https://kasirpro-adly-default-rtdb.asia-southeast1.firebasedatabase.app",
                projectId: "kasirpro-adly",
                storageBucket: "kasirpro-adly.firebasestorage.app",
                messagingSenderId: "562719212970",
                appId: "1:562719212970:web:b6ce9c52a9764d108117d3",
                measurementId: "G-39FYCKCR5T"
            };

        if (!firebase.apps.length) { 
            firebase.initializeApp(firebaseConfig); 
        }
        this.dbCloud = firebase.database();
        
        this.syncDariCloudPertamaKali();
        this.startSistemOtomatis();
        console.log("📶 Mesin Sync Kasir Pro Komplit Aktif!");
    },

    isOnline() { return navigator.onLine; },

    async syncDariCloudPertamaKali() {
        if (!this.isOnline()) {
            console.log("📡 Offline, skip sinkronisasi awal.");
            return;
        }

        console.log("🔄 Sinkronisasi awal dari Cloud...");
        if (typeof showLoading === 'function') showLoading("Sinkronisasi data awal...");

        try {
            await this.downloadProdukMaster();
            await this.downloadRequestStok();
            await this.downloadTransaksi();
            await this.downloadKaryawan();
            await this.downloadKasLaci();

            localStorage.setItem('lastSyncTime', new Date().toISOString());
            console.log("✅ Sinkronisasi awal selesai!");

            if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang();
            if (typeof PatroliRak !== 'undefined' && PatroliRak.renderTabel) PatroliRak.renderTabel();
            if (typeof RequestStok !== 'undefined' && RequestStok.loadRiwayat) RequestStok.loadRiwayat();

        } catch (error) {
            console.error("Gagal sinkronisasi awal:", error);
        } finally {
            if (typeof hideLoading === 'function') hideLoading();
        }
    },

    async downloadProdukMaster() {
        try {
            const snapshot = await this.dbCloud.ref('produk_master').once('value');
            const data = snapshot.val();
            if (!data) return;

            for (let barcode in data) {
                const cloudItem = data[barcode];
                const lokalItem = await DB.get("produk", barcode);
                
                if (!lokalItem || (cloudItem.lastUpdate && lokalItem.lastUpdate && cloudItem.lastUpdate > lokalItem.lastUpdate)) {
                    await DB.put("produk", cloudItem);
                }
            }
            console.log("📦 Produk master sinkron");
        } catch (e) { console.error("Gagal download produk:", e); }
    },

    async downloadRequestStok() {
        try {
            const snapshot = await this.dbCloud.ref('request_stok').once('value');
            const data = snapshot.val();
            if (!data) return;

            for (let id in data) {
                const cloudItem = data[id];
                const lokalItem = await DB.get("request_stok", id);
                
                if (!lokalItem || (cloudItem.tgl_request && lokalItem.tgl_request && cloudItem.tgl_request > lokalItem.tgl_request)) {
                    await DB.put("request_stok", cloudItem);
                }
            }
            console.log("📤 Request stok sinkron");
        } catch (e) { console.error("Gagal download request:", e); }
    },

    async downloadTransaksi() {
        try {
            const snapshot = await this.dbCloud.ref('transaksi').once('value');
            const data = snapshot.val();
            if (!data) return;

            for (let noStruk in data) {
                const cloudItem = data[noStruk];
                const lokalItem = await DB.get("transaksi", noStruk);
                
                if (!lokalItem) {
                    await DB.put("transaksi", cloudItem);
                }
            }
            console.log("🛒 Transaksi sinkron");
        } catch (e) { console.error("Gagal download transaksi:", e); }
    },

    async downloadKaryawan() {
        try {
            const snapshot = await this.dbCloud.ref('karyawan').once('value');
            const data = snapshot.val();
            if (!data) return;

            for (let username in data) {
                const cloudItem = data[username];
                const lokalItem = await DB.get("karyawan", username);
                
                if (!lokalItem || (cloudItem.updatedAt && lokalItem.updatedAt && cloudItem.updatedAt > lokalItem.updatedAt)) {
                    await DB.put("karyawan", cloudItem);
                }
            }
            console.log("👥 Karyawan sinkron");
        } catch (e) { console.error("Gagal download karyawan:", e); }
    },

    async downloadKasLaci() {
        try {
            const snapshot = await this.dbCloud.ref('kas_laci/laci_utama').once('value');
            const data = snapshot.val();
            if (data) {
                const lokalItem = await DB.get("kas_laci", "laci_utama");
                if (!lokalItem || (data.updatedAt && lokalItem.updatedAt && data.updatedAt > lokalItem.updatedAt)) {
                    await DB.put("kas_laci", data);
                }
            }
            console.log("💰 Kas laci sinkron");
        } catch (e) { console.error("Gagal download kas laci:", e); }
    },

    async jalankanSinkronisasi(isManualClick = false) {
        if (this.isSyncing) return;
        if (!this.isOnline()) {
            if (isManualClick) alert("📡 Perangkat sedang OFFLINE. Data transaksi Anda tetap tersimpan aman di HP.");
            return;
        }

        // Check if Firebase auth is valid
        if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.authMode === 'firebase' && FirebaseAuth.auth) {
            const user = FirebaseAuth.auth.currentUser;
            if (!user) {
                if (isManualClick) alert("🔒 Sesi Firebase tidak valid. Silakan login ulang.");
                return;
            }
        }

        this.isSyncing = true;
        if (isManualClick) showLoading("Sinkronisasi seluruh data ke cloud...");

        try {
            await this.prosesQueue();
            await this.uploadKatalogProduk();
            await this.uploadDataTransaksi();
            await this.uploadRequestStok();
            await this.uploadKasLaci();

            localStorage.setItem('lastSyncTime', new Date().toISOString());
            if (isManualClick) alert("✅ Sinkronisasi Berhasil! Seluruh data lokal dan Firebase Cloud telah setara.");
        } catch (error) {
            console.error("Gagal sinkronisasi cloud:", error);
            if (isManualClick) alert("❌ Hambatan Sinkronisasi: " + error.message);
        } finally {
            this.isSyncing = false;
            if (isManualClick) hideLoading();
            this.perbaruiUIStatus();
        }
    },

    tambahQueue(tipe, data) {
        this.syncQueue.push({ tipe, data, waktu: Date.now(), deviceId: this.deviceId });
        if (!this.isProcessingQueue) {
            this.prosesQueue();
        }
    },

    async prosesQueue() {
        if (this.isProcessingQueue || this.syncQueue.length === 0) return;
        if (!this.isOnline()) return;

        this.isProcessingQueue = true;
        console.log("🔄 Memproses antrian sinkronisasi:", this.syncQueue.length, "item");

        while (this.syncQueue.length > 0) {
            const item = this.syncQueue[0];
            try {
                switch (item.tipe) {
                    case 'transaksi':
                        await this.dbCloud.ref('transaksi/' + item.data.noStruk).set({
                            ...item.data,
                            device_id: this.deviceId,
                            synced: true,
                            queueProcessed: Date.now()
                        });
                        break;
                    case 'request_stok':
                        await this.dbCloud.ref('request_stok/' + item.data.id).set({
                            ...item.data,
                            device_id: this.deviceId,
                            synced: true,
                            queueProcessed: Date.now()
                        });
                        break;
                    case 'produk':
                        await this.dbCloud.ref('produk_master/' + item.data.barcode).set({
                            ...item.data,
                            device_id: this.deviceId,
                            lastUpdate: Date.now()
                        });
                        break;
                    case 'kas_laci':
                        await this.dbCloud.ref('kas_laci/laci_utama').set({
                            ...item.data,
                            device_id: this.deviceId,
                            updatedAt: Date.now()
                        });
                        break;
                }
                this.syncQueue.shift();
            } catch (e) {
                console.error("Gagal proses queue item:", e);
                break;
            }
        }

        this.isProcessingQueue = false;
        if (this.syncQueue.length > 0) {
            setTimeout(() => this.prosesQueue(), 5000);
        }
    },

    async uploadKatalogProduk() {
        if (typeof DB === 'undefined' || !DB.instance) return;
        
        const allProduk = await DB.getAll("produk");
        if (allProduk.length === 0) return;

        const produkObj = {};
        allProduk.forEach(p => { 
            produkObj[p.barcode] = { ...p, device_id: this.deviceId, lastUpdate: Date.now() }; 
        });
        
        await this.dbCloud.ref('produk_master/').update(produkObj);
    },

    async uploadDataTransaksi() {
        if (typeof DB === 'undefined' || !DB.instance) return;

        const allTrans = await DB.getAll("transaksi");
        const unsynced = allTrans.filter(t => !t.synced);

        for (let t of unsynced) {
            await this.dbCloud.ref('transaksi/' + t.noStruk).set({
                ...t,
                device_id: this.deviceId,
                synced: true
            });
            
            t.synced = true;
            await DB.put("transaksi", t);
        }
    },

    async uploadRequestStok() {
        if (typeof DB === 'undefined' || !DB.instance) return;

        const allReq = await DB.getAll("request_stok");
        const unsynced = allReq.filter(r => !r.synced);

        for (let r of unsynced) {
            await this.dbCloud.ref('request_stok/' + r.id).set({
                ...r,
                device_id: this.deviceId,
                synced: true
            });

            r.synced = true;
            await DB.put("request_stok", r);
        }
    },

    async uploadKasLaci() {
        if (typeof DB === 'undefined' || !DB.instance) return;

        const laciData = await DB.get("kas_laci", "laci_utama");
        if (laciData) {
            await this.dbCloud.ref('kas_laci/laci_utama').set({
                ...laciData,
                device_id: this.deviceId,
                updatedAt: Date.now()
            });
        }
    },

    startSistemOtomatis() {
        window.addEventListener('online', () => this.jalankanSinkronisasi(false));
        setInterval(() => this.jalankanSinkronisasi(false), 3 * 60 * 1000);
        this.perbaruiUIStatus();
    },

    perbaruiUIStatus() {
        const lastSync = localStorage.getItem('lastSyncTime');
        const txtStatus = document.getElementById('syncStatusText');
        if (txtStatus && lastSync) {
            txtStatus.textContent = `Sinkron: ${new Date(lastSync).toLocaleTimeString('id-ID')}`;
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { 
        DBSync.init(); 
    }, 1500);
});

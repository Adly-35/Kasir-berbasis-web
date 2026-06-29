// db.js — Database IndexedDB (Versi 15 - Standardisasi Skema Sinkronisasi SQL & Firebase)

const DB = {
    name: "KasirProDB",
    version: 15,
    instance: null,
    settingGlobal: { id: "global", toleransi: 10, waktu_pickup: 30 },

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, this.version);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                const stores = ["karyawan", "produk", "produk_batch", "request_stok", "transaksi", "kas_laci", "info_toko", "setting_global"];
                stores.forEach(s => {
                    if (db.objectStoreNames.contains(s)) db.deleteObjectStore(s);
                });

                db.createObjectStore("karyawan", { keyPath: "username" });
                
                const storeProduk = db.createObjectStore("produk", { keyPath: "barcode" });
                storeProduk.createIndex("nama", "nama", { unique: false });
                
                db.createObjectStore("produk_batch", { keyPath: "id", autoIncrement: true });
                
                const storeReq = db.createObjectStore("request_stok", { keyPath: "id" });
                storeReq.createIndex("status", "status", { unique: false });
                storeReq.createIndex("kasir", "kasir", { unique: false });
                storeReq.createIndex("barcode", "barcode", { unique: false });

                db.createObjectStore("transaksi", { keyPath: "noStruk" });
                db.createObjectStore("kas_laci", { keyPath: "id" });
                db.createObjectStore("info_toko", { keyPath: "id" });
                db.createObjectStore("setting_global", { keyPath: "id" });
            };

            request.onsuccess = async (e) => {
                this.instance = e.target.result;
                resolve();
            };

            request.onerror = () => reject("Database gagal dibuka!");
            request.onblocked = () => {
                alert("⚠️ Database diblokir! Tutup tab lain dan refresh.");
                reject("Database blocked");
            };
        });
    },

    async get(storeName, key) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve(null);
            try {
                const tx = this.instance.transaction(storeName, "readonly");
                const req = tx.objectStore(storeName).get(key);
                req.onsuccess = (e) => resolve(e.target.result);
                req.onerror = () => resolve(null);
            } catch (err) { console.error(err); resolve(null); }
        });
    },

    async getAll(storeName) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve([]);
            try {
                const items = [];
                const tx = this.instance.transaction(storeName, "readonly");
                tx.objectStore(storeName).openCursor().onsuccess = (e) => {
                    const c = e.target.result;
                    if (c) { items.push(c.value); c.continue(); }
                    else resolve(items);
                };
                tx.onerror = () => resolve([]);
            } catch (err) { console.error(err); resolve([]); }
        });
    },

    async put(storeName, data) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve(false);
            try {
                const tx = this.instance.transaction(storeName, "readwrite");
                tx.objectStore(storeName).put(data);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (err) { console.error(err); resolve(false); }
        });
    },

    async delete(storeName, key) {
        return new Promise((resolve) => {
            if (!this.instance) return resolve(false);
            try {
                const tx = this.instance.transaction(storeName, "readwrite");
                tx.objectStore(storeName).delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            } catch (err) { console.error(err); resolve(false); }
        });
    },

    async loadSettingGlobal() {
        const s = await this.get("setting_global", "global");
        if (s) this.settingGlobal = s;
        return this.settingGlobal;
    },

    async saveSettingGlobal(toleransi, waktuPickup) {
        this.settingGlobal = { id: "global", toleransi, waktuPickup };
        return await this.put("setting_global", this.settingGlobal);
    }
};

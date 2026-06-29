// script.js — Navigasi Tab SPA & Listener Lonceng Notifikasi Firebase (FIXED ANTI-DOUBLE RENDER) — v18 PART 1

function bukaTab(tabId, navId) {
    if (typeof Auth !== 'undefined' && typeof Auth.checkAccess === 'function') {
        if (!Auth.checkAccess(tabId)) return;
    }

    if (typeof ScannerGlobal !== 'undefined' && ScannerGlobal.matikanKamera) {
        ScannerGlobal.matikanKamera();
    }

    const semuaTab = document.querySelectorAll('.tab-content');
    semuaTab.forEach(tab => {
        tab.classList.add('hidden');
        tab.style.display = 'none';
    });

    const semuaTombol = document.querySelectorAll('.tab-btn');
    semuaTombol.forEach(btn => btn.classList.remove('active'));

    const tabTarget = document.getElementById(tabId);
    if (tabTarget) {
        tabTarget.classList.remove('hidden');
        tabTarget.style.display = 'block';
    }

    const idTombolAktif = navId || tabId.replace('tab-', 'nav-');
    const tombolTarget = document.getElementById(idTombolAktif);
    if (tombolTarget) tombolTarget.classList.add('active');

    if (tabId === 'tab-kasir') {
        setTimeout(() => {
            const input = document.getElementById('inputBarcode');
            if (input) {
                input.focus();
                if (typeof Kasir !== 'undefined' && Kasir.initAutoScan) Kasir.initAutoScan();
            }
        }, 100);
    } else if (tabId === 'tab-patroli' && typeof PatroliRak !== 'undefined') {
        PatroliRak.loadData();
    } else if (tabId === 'tab-master' && typeof Stok !== 'undefined') {
        Stok.renderMasterBarang();
    } else if (tabId === 'tab-stok-toko' && typeof Stok !== 'undefined') {
        Stok.renderStokToko();
    } else if (tabId === 'tab-request' && typeof RequestStok !== 'undefined') {
        RequestStok.loadForm();
    } else if (tabId === 'tab-approval' && typeof Approval !== 'undefined') {
        Approval.loadList();
    } else if (tabId === 'tab-karyawan' && typeof Karyawan !== 'undefined') {
        Karyawan.loadList();
    } else if (tabId === 'tab-rekap' && typeof Rekap !== 'undefined') {
        Rekap.load();
    }
}

// Membuat fungsi render yang didebounce agar tidak memicu render ganda saat sync massal
const debouncedRenderMaster = (typeof Utils !== 'undefined' && Utils.debounce) 
    ? Utils.debounce(() => { if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang(); }, 300)
    : () => { if (typeof Stok !== 'undefined' && Stok.renderMasterBarang) Stok.renderMasterBarang(); };

const debouncedRenderPatroli = (typeof Utils !== 'undefined' && Utils.debounce)
    ? Utils.debounce(() => { if (typeof PatroliRak !== 'undefined' && PatroliRak.renderTabel) PatroliRak.renderTabel(); }, 300)
    : () => { if (typeof PatroliRak !== 'undefined' && PatroliRak.renderTabel) PatroliRak.renderTabel(); };
// script.js — PART 2 — Lanjutan Mesin Listener Real-time Firebase

function initFirebaseNotificationListener() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;
    
    firebase.database().ref('request_stok').on('child_changed', async (snapshot) => {
        const req = snapshot.val();
        if (!req) return;
        
        const lokal = await DB.get("request_stok", req.id);
        if (!lokal) {
            await DB.put("request_stok", req);
        } else {
            const merged = { ...lokal, ...req };
            await DB.put("request_stok", merged);
        }

        updateBadgeNotifikasi();
        
        if (document.getElementById('tab-approval') && !document.getElementById('tab-approval').classList.contains('hidden') && typeof Approval !== 'undefined') {
            Approval.loadList();
        }
        if (typeof RequestStok !== 'undefined' && RequestStok.loadRiwayat) RequestStok.loadRiwayat();
    });

    // ⚡ PERBAIKAN UTAMA: Menggunakan Debounce saat data cloud berubah agar tidak duplikat kebawah
    firebase.database().ref('produk_master').on('child_changed', async (snapshot) => {
        const produk = snapshot.val();
        if (!produk || !produk.barcode) return;
        
        const lokal = await DB.get("produk", produk.barcode);
        if (!lokal || (produk.lastUpdate && lokal.lastUpdate && produk.lastUpdate > lokal.lastUpdate)) {
            await DB.put("produk", produk);
            
            // Panggil fungsi render aman yang sudah diberi jeda penstabil data (Debounced)
            debouncedRenderMaster();
            debouncedRenderPatroli();
        }
    });

    firebase.database().ref('transaksi').on('child_added', async (snapshot) => {
        const trans = snapshot.val();
        if (!trans || !trans.noStruk) return;
        
        const lokal = await DB.get("transaksi", trans.noStruk);
        if (!lokal) {
            await DB.put("transaksi", trans);
            
            if (typeof Rekap !== 'undefined' && Rekap.loadHistoriTransaksi) {
                Rekap.loadHistoriTransaksi();
            }
        }
    });
}

async function updateBadgeNotifikasi() {
    const namaUserAktif = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.username : '';
    
    const allReq = await DB.getAll("request_stok");
    const pendingForOwner = allReq.filter(r => r.status === 'pending');
    const approvedForKasir = allReq.filter(r => r.status === 'approved' && r.kasir === namaUserAktif);

    const badgeApp = document.getElementById('badgeNotifApp');
    if (badgeApp) {
        badgeApp.textContent = pendingForOwner.length;
        badgeApp.classList.toggle('hidden', pendingForOwner.length === 0);
    }

    const badgeReq = document.getElementById('badgeNotifReq');
    if (badgeReq) {
        badgeReq.textContent = approvedForKasir.length;
        badgeReq.classList.toggle('hidden', approvedForKasir.length === 0);
    }
}

function showLoading(msg) {
    const el = document.getElementById('loadingOverlay');
    if (el) { 
        el.classList.add('active'); 
        el.querySelector('.loading-text').textContent = msg || 'Memproses...'; 
    }
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    if (typeof DB !== 'undefined' && DB.init) {
        DB.init().then(() => {
            if (typeof Auth !== 'undefined' && Auth.init) Auth.init();
            setTimeout(() => {
                initFirebaseNotificationListener();
            }, 3000);
        });
    }
});

const ThemeManager = { init() { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); } };

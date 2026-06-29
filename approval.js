// approval.js — Modul Manajemen Persetujuan Restok (Khusus Owner / Admin Utama) — FULL TEXT COMPLIT

const Approval = {
    // 1. MEMUAT DAFTAR PERMINTAAN RESTOK KASIR DI LAYAR OWNER
    async loadList() {
        const panelKosong = document.getElementById('panelApprovalKosong');
        const panelList = document.getElementById('panelApprovalList');
        
        if (!panelList) return;
        panelList.innerHTML = '';

        // PROTEKSI AKSES MUTLAK: Hanya Owner yang boleh melihat dan memproses
        if (typeof Auth !== 'undefined' && Auth.currentUser) {
            if (Auth.currentUser.role !== 'Owner') {
                panelList.innerHTML = `
                    <div class="text-center text-muted" style="padding:20px; background:#ffebee; border-radius:6px; color:#c62828; font-weight:bold;">
                        ⛔ Hak Akses Terbatas! Jendela ini dikunci dan hanya dapat dikelola oleh Owner Utama.
                    </div>
                `;
                if (panelKosong) panelKosong.style.display = 'none';
                return;
            }
        }

        try {
            // Tarik data pengajuan restok dari IndexedDB lokal v15
            const list = await DB.getAll("request_stok");
            
            // Saring nota yang statusnya masih antrean 'pending'
            const pendingItems = list.filter(r => r.status === 'pending');

            if (pendingItems.length === 0) {
                if (panelKosong) panelKosong.style.display = 'block';
                return;
            }

            if (panelKosong) panelKosong.style.display = 'none';

            // Looping dan cetak semua nota antrean ke bentuk card visual di HP Owner
            for (const r of pendingItems) {
                // Get current stock for display
                const p = await DB.get("produk", r.barcode);
                const sGudang = p ? (p.stokGudang !== undefined ? p.stokGudang : 0) : 0;
                const stockStatus = sGudang >= r.jumlah ? 
                    `<span style="color:#27ae60;">✅ Stok cukup (${sGudang} pcs)</span>` : 
                    (sGudang > 0 ? 
                        `<span style="color:#e67e22;">⚠️ Stok kurang (${sGudang}/${r.jumlah} pcs)</span>` : 
                        `<span style="color:#e74c3c;">❌ Stok habis (0 pcs)</span>`);

                const card = document.createElement('div');
                card.style.cssText = "background:#fff; border-left:5px solid #f39c12; padding:15px; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:12px;";
                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="margin:0 0 4px 0; color:#2c3e50; font-size:15px;">📦 ${r.nama_barang}</h4>
                            <small style="color:#7f8c8d; font-size:11px;">Barcode: <code>${r.barcode}</code></small><br>
                            <small style="color:#7f8c8d; font-size:11px;">Diajukan oleh staf: <strong style="color:#2196F3;">@${r.kasir}</strong></small><br>
                            <small style="font-size:11px; margin-top:4px; display:block;">${stockStatus}</small>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:20px; font-weight:bold; color:#f39c12;">${r.jumlah} <span style="font-size:12px; font-weight:normal; color:#666;">Pcs</span></div>
                            <small style="color:#95a5a6; font-size:10px;">${new Date(r.tgl_request).toLocaleTimeString('id-ID')}</small>
                        </div>
                    </div>
                    <hr style="border:0; border-top:1px dashed #eee; margin:12px 0;">
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button class="btn btn-sm" style="background:#e74c3c; color:white; padding:5px 14px; font-size:12px; border:none; border-radius:4px; font-weight:bold;" onclick="Approval.tolakRequest('${r.id}')">✕ Tolak</button>
                        <button class="btn btn-sm" style="background:#2ecc71; color:white; padding:5px 14px; font-size:12px; border:none; border-radius:4px; font-weight:bold;" onclick="Approval.setujuiLangsung('${r.id}')">✓ Setujui (Acc)</button>
                    </div>
                `;
                panelList.appendChild(card);
            }
        } catch (error) {
            console.error("Gagal memuat list pengajuan Owner:", error);
        }
    },

    // 2. FUNGSI EKSEKUSI TOMBOL SETUJUI (ACC)
    async setujuiLangsung(id) {
        try {
            const req = await DB.get("request_stok", id);
            if (!req) {
                alert("❌ Data pengajuan tidak ditemukan!");
                return;
            }

            // Ubah status nota menjadi approved
            req.status = 'approved';
            req.waktu_pickup = 15; // Set batasan penyiapan default 15 menit

            // Simpan pembaruan status ke database lokal perangkat
            await DB.put("request_stok", req);

            // Tembak pembaruan data secara real-time ke Cloud Firebase Database
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('request_stok/' + id).set(req);
            }

            if (typeof Beep !== 'undefined' && Beep.ok) Beep.ok();
            alert("✅ Sukses memberikan Acc! Status pengajuan staf kasir otomatis berubah menjadi APPROVED secara live.");
            
            // Segarkan ulang tampilan list antrean
            this.loadList();

        } catch (err) {
            alert("❌ Terjadi kesalahan sistem: " + err.message);
        }
    },

    // 3. FUNGSI EKSEKUSI TOMBOL TOLAK (REJECT)
    async tolakRequest(id) {
        if (!confirm("Apakah Anda yakin ingin menolak permintaan restok barang ini?")) return;

        try {
            const req = await DB.get("request_stok", id);
            if (!req) return;

            // Tandai ditolak
            req.status = 'rejected';
            await DB.put("request_stok", req);

            // Update ke Cloud Firebase Database
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('request_stok/' + id).set(req);
            }

            alert("❌ Permintaan restok ditolak.");
            this.loadList();
        } catch (err) {
            console.error("Gagal menolak request:", err);
        }
    }
};

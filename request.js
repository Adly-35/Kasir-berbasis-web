// request.js — Modul Request Stok Kasir Ke Gudang Utama — FULL TEXT COMPLIT v17

const RequestStok = {
    async loadForm() {
        const select = document.getElementById('reqSelectBarcode');
        if (!select) return;
        select.innerHTML = '<option value="">-- Pilih Barang Toko --</option>';

        const list = await DB.getAll("produk");
        list.forEach(p => {
            const sRak = p.stokRak !== undefined ? p.stokRak : 0;
            const sGudang = p.stokGudang !== undefined ? p.stokGudang : 0;
            const opt = document.createElement('option');
            opt.value = p.barcode;
            opt.textContent = `${p.nama} (Rak: ${sRak} | Gudang: ${sGudang})`;
            select.appendChild(opt);
        });
        this.loadRiwayat();
    },

    pilihBarang() {
        const barcode = document.getElementById('reqSelectBarcode').value;
        if (barcode) {
            document.getElementById('reqBarcode').value = barcode;
            this.cekStokLama();
        }
    },

    async cekStokLama() {
        const barcode = document.getElementById('reqBarcode').value.trim();
        const infoBox = document.getElementById('reqInfoStok');
        const detailBox = document.getElementById('reqDetailStok');
        const jumlahInput = document.getElementById('reqJumlah');
        if (!barcode) { if (infoBox) infoBox.style.display = 'none'; return; }

        const p = await DB.get("produk", barcode);
        if (p && infoBox && detailBox) {
            const sGudang = p.stokGudang !== undefined ? p.stokGudang : 0;
            const sRak = p.stokRak !== undefined ? p.stokRak : 0;

            let html = `Stok Gudang: <strong>${sGudang}</strong> pcs | Stok Rak: <strong>${sRak}</strong> pcs`;

            if (sGudang === 0) {
                html += `<br><span style="color:#e74c3c; font-weight:bold;">⚠️ Stok gudang HABIS! Tidak bisa request.</span>`;
                if (jumlahInput) {
                    jumlahInput.max = 0;
                    jumlahInput.placeholder = "Stok habis";
                }
            } else {
                html += `<br><span style="color:#27ae60; font-weight:bold;">✅ Max request: ${sGudang} pcs</span>`;
                if (jumlahInput) {
                    jumlahInput.max = sGudang;
                    jumlahInput.placeholder = `Max ${sGudang} pcs`;
                }
            }

            detailBox.innerHTML = html;
            infoBox.style.display = 'block';
        }
    },

    async kirimRequest() {
        const barcode = document.getElementById('reqBarcode').value.trim();
        const qty = parseInt(document.getElementById('reqJumlah').value) || 0;
        const kasir = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.username : 'kasir1';

        if (!barcode || qty <= 0) { alert("❌ Isi form request dengan benar!"); return; }

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Barcode tidak terdaftar!"); return; }

        // LOCK ISOLASI: Mencegah barang terisolasi diajukan ke rak
        if (p.hargaBeli === '-' || p.hargaJual === '-') {
            alert("⛔ Permintaan Ditolak! Barang ini masih dalam status ISOLASI. Silakan laporkan ke Owner terlebih dahulu.");
            return;
        }

        // VALIDASI STOK GUDANG: Kasir tidak boleh request melebihi stok gudang
        const sGudang = p.stokGudang !== undefined ? p.stokGudang : 0;
        if (qty > sGudang) {
            alert(`🚫 Request GAGAL!\n\nStok gudang tersedia: ${sGudang} pcs\nAnda request: ${qty} pcs\n\nSilakan kurangi jumlah request atau hubungi Owner.`);
            return;
        }

        // WARNING jika request = stok gudang (habiskan semua)
        if (qty === sGudang && sGudang > 0) {
            if (!confirm(`⚠️ PERINGATAN!\n\nRequest ini akan MENGHABISKAN SELURUH stok gudang (${sGudang} pcs).\nLanjutkan?`)) {
                return;
            }
        }

        const idRequest = 'REQ-' + Date.now();
        const recordReq = { id: idRequest, barcode, nama_barang: p.nama, jumlah: qty, kasir, status: 'pending', tgl_request: new Date().toISOString(), synced: false };

        await DB.put("request_stok", recordReq);
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            recordReq.synced = true;
            await firebase.database().ref('request_stok/' + idRequest).set(recordReq);
            await DB.put("request_stok", recordReq);
        }

        alert(`🚀 Permintaan restok "${p.nama}" dikirim!`);
        document.getElementById('reqBarcode').value = '';
        document.getElementById('reqJumlah').value = '0';
        if (document.getElementById('reqInfoStok')) document.getElementById('reqInfoStok').style.display = 'none';
        this.loadForm();
    },

    async loadRiwayat() {
        const panel = document.getElementById('panelRiwayatRequest');
        if (!panel) return;

        const list = await DB.getAll("request_stok");
        if (list.length === 0) { panel.innerHTML = '<p class="text-center text-muted">Belum ada riwayat.</p>'; return; }

        let html = `<table class="table"><thead><tr><th>Nama Barang</th><th class="text-center">Qty</th><th class="text-center">Status</th><th class="text-center">Aksi</th></tr></thead><tbody>`;
        list.reverse().forEach(r => {
            let warna = r.status === 'pending' ? '#f39c12' : (r.status === 'approved' ? '#2ecc71' : '#2196F3');
            let aksi = r.status === 'approved' ? `<button class="btn btn-success btn-sm" onclick="RequestStok.bukaModalDoc('${r.id}')">📥 Ambil</button>` : '---';
            if (r.status === 'completed') aksi = '✅ Selesai';

            html += `<tr><td><strong>${r.nama_barang}</strong><br><small>${r.barcode}</small></td><td class="text-center">${r.jumlah}</td><td class="text-center" style="color:${warna}; font-weight:bold;">${r.status.toUpperCase()}</td><td class="text-center">${aksi}</td></tr>`;
        });
        html += `</tbody></table>`;
        panel.innerHTML = html;
    },

    bukaModalDoc(id) {
        document.getElementById('docIdRequest').value = id;
        const modal = document.getElementById('modalDokumentasi');
        if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
    },

    tutupModalDoc() {
        const modal = document.getElementById('modalDokumentasi');
        if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
    },

    async selesaiDokumentasi() {
        const id = document.getElementById('docIdRequest').value;
        const link = document.getElementById('docLink').value.trim();

        try {
            const req = await DB.get("request_stok", id);
            if (!req || req.status !== 'approved') return;

            const p = await DB.get("produk", req.barcode);
            const sGudang = p.stokGudang !== undefined ? p.stokGudang : 0;
            const sRak = p.stokRak !== undefined ? p.stokRak : 0;

            if (sGudang < req.jumlah) { alert("❌ Stok gudang tidak mencukupi!"); return; }

            p.stokGudang = sGudang - req.jumlah;
            p.stokRak = sRak + req.jumlah;
            await DB.put("produk", p);

            req.status = 'completed';
            req.tgl_selesai = new Date().toISOString();
            req.link_dokumentasi = link || "Tanpa Link";
            await DB.put("request_stok", req);

            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('produk_master/' + p.barcode).set(p);
                await firebase.database().ref('request_stok/' + id).set(req);
            }

            this.tutupModalDoc();
            alert("✅ Barang sukses diserahkan dan masuk ke Rak Jual display!");
            this.loadForm();
            if (typeof Stok !== 'undefined') Stok.renderMasterBarang();
            if (typeof PatroliRak !== 'undefined' && PatroliRak.renderTabel) PatroliRak.renderTabel();
        } catch (e) { alert("❌ Gagal serah terima."); }
    }
};

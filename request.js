// request.js — Modul Request Stok Kasir (HP Friendly - Proteksi Barang Isolasi - Part 1)
const RequestStok = {
    // 1. MEMUAT DAFTAR BARANG UNTUK DROPDOWN REQ
    async loadForm() {
        const select = document.getElementById('reqSelectBarcode');
        if (!select) return;
        select.innerHTML = '<option value="">-- Pilih Barang Toko --</option>';

        try {
            const list = await DB.getAll("produk");
            
            // Saring: Hanya tampilkan barang yang harganya legal (bukan '©©') dan stok gudang > 0
            list.forEach(p => {
                const isIsolasi = p.hargaBeli === '©©' || p.hargaJual === '©©';
                if (isIsolasi) return; // SKIP BARANG ISOLASI TOTAL

                const sRak = p.stokRak !== undefined ? p.stokRak : 0;
                const sGudang = p.stokGudang !== undefined ? p.stokGudang : 0;
                
                const opt = document.createElement('option');
                opt.value = p.barcode;
                opt.textContent = `${p.nama} (Rak: ${sRak} | Gudang Legal: ${sGudang})`;
                select.appendChild(opt);
            });
        } catch (e) { console.error(e); }
        this.loadRiwayat();
    },

    pilihBarang() {
        const barcode = document.getElementById('reqSelectBarcode').value;
        if (barcode) {
            document.getElementById('reqBarcode').value = barcode;
            this.cekStokLama();
        }
    },

    // 2. CEK DETAIL STOK LAMA & VALIDASI ISOLASI KETIKA BARCODE DI-SCAN
    async cekStokLama() {
        const barcode = document.getElementById('reqBarcode').value.trim();
        const infoBox = document.getElementById('reqInfoStok');
        const detailBox = document.getElementById('reqDetailStok');
        if (!barcode) { if (infoBox) infoBox.style.display = 'none'; return; }

        const p = await DB.get("produk", barcode);
        if (!p) {
            if (detailBox) detailBox.innerHTML = "<span style='color:red;'>❌ Produk tidak ditemukan di database!</span>";
            if (infoBox) infoBox.style.display = 'block';
            return;
        }

        // PROTEKSI SCAN: Jika barang terisolasi total, beri peringatan langsung
        if (p.hargaBeli === '©©' || p.hargaJual === '©©') {
            if (detailBox) detailBox.innerHTML = "<strong>⚠️ BARANG TERISOLASI!</strong><br><span style='color:red;'>Produk ini belum diberi harga sah oleh Owner. Tidak bisa direquest!</span>";
            if (infoBox) infoBox.style.display = 'block';
            return;
        }

        if (infoBox && detailBox) {
            detailBox.innerHTML = `<strong>${p.nama}</strong><br>
                📦 Gudang Legal: <strong>${p.stokGudang || 0} pcs</strong><br>
                ⏳ Antrean Isolasi: <span style='color:orange;'>${p.stokIsolasi || 0} pcs</span>`;
            infoBox.style.display = 'block';
        }
    },
    // 3. LOGIKA KIRIM REQUEST (KUNCI MAKSIMAL STOK LEGAL)
    async kirimRequest() {
        const barcode = document.getElementById('reqBarcode').value.trim();
        const jumlah = parseInt(document.getElementById('reqJumlah').value) || 0;

        if (!barcode || jumlah <= 0) { alert("❌ Masukkan barcode dan jumlah request yang valid!"); return; }

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Produk tidak terdaftar!"); return; }

        // BLOKIR MUTLAK: Mencegah request barang isolasi via ketik manual
        if (p.hargaBeli === '©©' || p.hargaJual === '©©') {
            alert("⛔ Akses Ditolak! Barang ini dalam status ISOLASI TOTAL karena belum memiliki harga legal.");
            return;
        }

        // KUNCI STOK: Request hanya boleh maksimal sejumlah stok gudang yang LEGAL (stok lama)
        if ((p.stokGudang || 0) < jumlah) {
            alert(`❌ Gagal Minta Stok! Kamu hanya bisa meminta maksimal ${p.stokGudang || 0} pcs stok lama yang legal. Sisa stok baru masih dikunci/diisolasi.`);
            return;
        }

        const namaUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.username : 'kasir';
        
        const dataRequest = {
            id: 'REQ-' + Date.now(),
            barcode: p.barcode,
            nama_barang: p.nama,
            jumlah: jumlah,
            kasir: namaUser,
            status: 'pending',
            tgl_request: new Date().toISOString(),
            synced: false
        };

        await DB.put("request_stok", dataRequest);
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            await firebase.database().ref('request_stok/' + dataRequest.id).set(dataRequest);
        }

        alert("🚀 Request sukses dikirim! Menunggu Acc/Persetujuan Owner Utama.");
        document.getElementById('reqBarcode').value = '';
        document.getElementById('reqJumlah').value = '0';
        if (document.getElementById('reqInfoStok')) document.getElementById('reqInfoStok').style.display = 'none';
        
        this.loadForm();
        if (typeof refreshBadgeNotifikasi === 'function') refreshBadgeNotifikasi();
    },

    // 4. MEMUAT LOG RIWAYAT REQUEST DI BAGIAN BAWAH
    async loadRiwayat() {
        const panel = document.getElementById('panelRiwayatRequest');
        if (!panel) return;

        try {
            const list = await DB.getAll("request_stok");
            list.sort((a, b) => new Date(b.tgl_request) - new Date(a.tgl_request));

            if (list.length === 0) {
                panel.innerHTML = "<div class='text-center text-muted' style='padding:10px;'>Belum ada riwayat permintaan stok.</div>";
                return;
            }

            let html = `<table class='table'><thead><tr><th>Barang</th><th>Qty</th><th>Status</th></tr></thead><tbody>`;
            list.forEach(r => {
                let badgeColor = r.status === 'approved' ? '#2ecc71' : (r.status === 'pending' ? '#f1c40f' : '#e74c3c');
                html += `<tr>
                    <td><strong>${r.nama_barang}</strong><br><small style='color:#999;'>${new Date(r.tgl_request).toLocaleTimeString('id-ID')}</small></td>
                    <td><strong>${r.jumlah}</strong> pcs</td>
                    <td><span class='badge' style='background:${badgeColor}; color:white; padding:2px 6px; border-radius:4px;'>${r.status.toUpperCase()}</span></td>
                </tr>`;
            });
            html += `</tbody></table>`;
            panel.innerHTML = html;
        } catch (e) { console.error(e); }
    }
};

// Auto-load formulir request saat halaman selesai dimuat browser
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { if (RequestStok.loadForm) RequestStok.loadForm(); }, 2000);
});

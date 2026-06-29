// patroli.js — Modul Monitoring, Pencarian, dan Scan Real-time Rak Toko — FIXED MATCH V15

const PatroliRak = {
    // 1. FUNGSI UTAMA: MEMUAT DAN MENYARING DATA RAK TOKO
    async loadData() {
        this.renderTabel();
    },

    async renderTabel() {
        const tbody = document.getElementById('bodyPatroliRak');
        if (!tbody) return;
        tbody.innerHTML = '';

        try {
            const list = await DB.getAll("produk");
            const kataKunci = document.getElementById('cariPatroli')?.value.toLowerCase() || '';
            
            // Filter berdasarkan nama atau barcode produk
            const filtered = list.filter(p => p.nama.toLowerCase().includes(kataKunci) || p.barcode.includes(kataKunci));

            // Perbarui ringkasan singkat di bagian atas tabel jika elemennya ada
            const ringkasan = document.getElementById('ringkasanPatroli');
            if (ringkasan) {
                const totalJenis = filtered.length;
                const totalPajangan = filtered.reduce((acc, curr) => acc + (curr.stokRak || 0), 0);
                ringkasan.innerHTML = `<small class="text-muted">Menampilkan <strong>${totalJenis}</strong> jenis produk | Total <strong>${totalPajangan}</strong> pcs pajangan di rak.</small>`;
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Barang tidak ditemukan di rak toko.</td></tr>';
                return;
            }

            filtered.forEach(p => {
                const sRak = p.stokRak || 0;
                const sGudang = p.stokGudang || 0;
                
                // Tentukan indikator status stok pajangan rak
                let statusBadge = `<span class="badge" style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; font-size:11px;">🟢 Aman</span>`;
                if (sRak === 0) {
                    statusBadge = `<span class="badge" style="background:#ffebee; color:#c62828; padding:2px 6px; border-radius:4px; font-size:11px;">🔴 Kosong</span>`;
                } else if (sRak <= 5) {
                    statusBadge = `<span class="badge" style="background:#fff3e0; color:#e65100; padding:2px 6px; border-radius:4px; font-size:11px;">🟡 Menipis</span>`;
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${p.nama}</strong><br><code style="font-size:11px;">${p.barcode}</code></td>
                    <td style="text-align:right;">Rp ${(p.hargaJual || 0).toLocaleString('id-ID')}</td>
                    <td class="text-center" style="font-weight:bold; color:#2e7d32;">${sRak} pcs</td>
                    <td class="text-center" style="color:#7f8c8d;">${sGudang} pcs</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">
                        <button class="btn btn-primary btn-sm" style="padding:2px 6px; font-size:11px;" onclick="PatroliRak.mintaRestokCepat('${p.barcode}')">🔔 Req</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Gagal merender data patroli rak:", error);
        }
    },

    // 2. FUNGSI SCANNER: MEMPROSES HASIL SCAN BARCODE DI RAK TOKO
    async scanPatroli() {
        const input = document.getElementById('patroliBarcode');
        const barcode = input?.value.trim();
        const hasilBox = document.getElementById('hasilScanPatroli');
        
        if (!barcode) return;

        try {
            const p = await DB.get("produk", barcode);
            
            if (!p) {
                alert(`❌ Barcode "${barcode}" tidak ditemukan di sistem master toko!`);
                if (hasilBox) hasilBox.style.display = 'none';
                input.value = '';
                return;
            }

            // Jika barang ditemukan, tampilkan card info produk secara detail & pop-up
            if (hasilBox) {
                hasilBox.innerHTML = `
                    <div style="background:#fff; border:2px solid #2196F3; border-radius:8px; padding:12px; margin-top:10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin:0; color:#2196F3;">🔍 Hasil Scan Produk</h4>
                            <button class="btn btn-secondary btn-sm" style="padding:2px 6px;" onclick="document.getElementById('hasilScanPatroli').style.display='none'">✕ Tutup</button>
                        </div>
                        <hr style="border:0; border-top:1px solid #eee; margin:8px 0;">
                        <p style="margin:4px 0;">📦 <strong>Nama Barang:</strong> ${p.nama}</p>
                        <p style="margin:4px 0;">🆔 <strong>Barcode:</strong> <code>${p.barcode}</code></p>
                        <p style="margin:4px 0;">🏷️ <strong>Harga Jual:</strong> Rp ${(p.hargaJual || 0).toLocaleString('id-ID')}</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px; background:#f9f9f9; padding:8px; border-radius:6px;">
                            <div style="text-align:center;">
                                <small style="color:#666;">Stok di Rak</small>
                                <div style="font-size:18px; font-weight:bold; color:#2e7d32;">${p.stokRak || 0} pcs</div>
                            </div>
                            <div style="text-align:center;">
                                <small style="color:#666;">Stok di Gudang</small>
                                <div style="font-size:18px; font-weight:bold; color:#e67e22;">${p.stokGudang || 0} pcs</div>
                            </div>
                        </div>
                    </div>
                `;
                hasilBox.style.display = 'block';
            }

            // Otomatis masukkan ke kolom pencarian tabel bawah agar menyaring barisnya
            const inputCari = document.getElementById('cariPatroli');
            if (inputCari) {
                inputCari.value = barcode;
                this.renderTabel();
            }

            if (typeof Beep !== 'undefined' && Beep.ok) Beep.ok();
            input.value = '';

        } catch (error) {
            console.error("Gagal memproses scan patroli:", error);
            alert("❌ Terjadi kesalahan saat membaca database.");
        }
    },

    // 3. FITUR TAMBAHAN: JALUR CEPAT REQ RESTOK KASIR LANGSUNG DARI TABEL RAK
    async mintaRestokCepat(barcode) {
        const p = await DB.get("produk", barcode);
        if (!p) return;

        const jumlahReq = prompt(`Berapa banyak Qty restok untuk "${p.nama}" yang ingin diminta ke gudang?`, "10");
        const qty = parseInt(jumlahReq);
        
        if (!jumlahReq) return; // Jika user menekan batal
        if (isNaN(qty) || qty <= 0) { alert("❌ Jumlah permintaan harus berupa angka valid!"); return; }

        // Isikan otomatis ke kolom form Request dan kirim logikanya via modul RequestStok
        if (typeof RequestStok !== 'undefined' && RequestStok.kirimRequest) {
            const inputReqBarcode = document.getElementById('reqBarcode');
            const inputReqJumlah = document.getElementById('reqJumlah');
            
            if (inputReqBarcode && inputReqJumlah) {
                inputReqBarcode.value = barcode;
                inputReqJumlah.value = qty;
                await RequestStok.kirimRequest();
                
                // Kembalikan fokus ke tab patroli setelah sukses
                if (typeof bukaTab === 'function') bukaTab('tab-patroli');
            } else {
                alert("❌ Form request stok di tab lain terganggu, silakan gunakan menu Request secara manual.");
            }
        }
    },

    // Interseptor integrasi jikalau dipanggil dari kamera scanner global
    handleScanResult(barcode) {
        const input = document.getElementById('patroliBarcode');
        if (input) {
            input.value = barcode;
            this.scanPatroli();
        }
    }
};

// stok.js — Modul Logika Input Master Barang & Isolasi Stok Berbasis Peran (HP Friendly - Part 1)
const Stok = {
    isRendering: false,
    produkEditAktif: null,

    // 1. MENAMPILKAN KATALOG BARANG SECARA DINAMIS
    async renderMasterBarang() {
        if (this.isRendering) return;
        this.isRendering = true;

        const thead = document.getElementById('headerMasterBarang');
        const tbody = document.getElementById('bodyMasterBarang');
        if (!tbody || !thead) { this.isRendering = false; return; }

        tbody.innerHTML = '';
        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';

        if (userRole === 'Owner') {
            thead.innerHTML = `<tr><th>Barcode & Nama</th><th>Harga Beli</th><th>Harga Jual</th><th style="width:100px;">Aksi</th></tr>`;
        } else {
            thead.innerHTML = `<tr><th>Nama Barang</th><th>Barcode</th><th class="text-center">Stok Gudang</th><th class="text-center">Stok Isolasi</th><th style="text-align:right;">Harga Jual</th></tr>`;
        }

        try {
            const list = await DB.getAll("produk");
            const kataKunci = document.getElementById('cariMaster')?.value.toLowerCase() || '';
            const filtered = list.filter(p => p.nama.toLowerCase().includes(kataKunci) || p.barcode.includes(kataKunci));

            if (filtered.length === 0) {
                const totalKolom = userRole === 'Owner' ? 4 : 5;
                tbody.innerHTML = `<tr><td colspan="${totalKolom}" class="text-center text-muted">Belum ada data produk.</td></tr>`;
                this.isRendering = false;
                return;
            }

            const fragment = document.createDocumentFragment();
            filtered.forEach(p => {
                const isIsolasi = p.hargaBeli === '©©' || p.hargaJual === '©©';
                let hBeliDisplay = isIsolasi ? '©©' : (p.hargaBeli || 0).toLocaleString('id-ID');
                let hJualDisplay = isIsolasi ? '©©' : (p.hargaJual || 0).toLocaleString('id-ID');
                const sIsolasi = p.stokIsolasi || 0;

                const tr = document.createElement('tr');
                if (userRole === 'Owner') {
                    tr.innerHTML = `
                        <td><strong>${p.nama}</strong> ${isIsolasi || sIsolasi > 0 ? '<span class="badge" style="background:#e74c3c; color:#fff; padding:2px 4px; font-size:9px; border-radius:3px;">⚠️ ISOLASI ('+sIsolasi+')</span>' : ''}<br><small>${p.barcode}</small></td>
                        <td style="text-align:right;">${isIsolasi ? '' : 'Rp '} ${hBeliDisplay}</td>
                        <td style="text-align:right; font-weight:bold; color:#27ae60;">${isIsolasi ? '' : 'Rp '} ${hJualDisplay}</td>
                        <td class="text-center">
                            <button class="btn btn-sm" style="background:#2196F3; color:white; padding:3px 6px; font-size:11px;" onclick="Stok.bukaModalEdit('${p.barcode}')">📝 Edit</button>
                        </td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td><strong>${p.nama}</strong></td>
                        <td><code>${p.barcode}</code></td>
                        <td class="text-center">${p.stokGudang || 0} pcs</td>
                        <td class="text-center" style="color:#e74c3c; font-weight:bold;">${sIsolasi} pcs</td>
                        <td style="text-align:right; font-weight:bold; color:#2196F3;">${isIsolasi ? '©©' : 'Rp ' + hJualDisplay}</td>
                    `;
                }
                fragment.appendChild(tr);
            });
            tbody.appendChild(fragment);
        } catch (err) { console.error(err); }

        const wrapperHarga = document.getElementById('wrapperHargaMaster');
        if (wrapperHarga) {
            wrapperHarga.style.display = (userRole === 'Owner') ? 'block' : 'none';
        }
        this.loadDropdownPindahStok();
        this.isRendering = false;
    },
    // 2. CEK DATA BARCODE SEWAKTU DI-SCAN ATAU DIKETIK
    async cekProdukLama() {
        const barcode = document.getElementById('mBarcode').value.trim();
        const infoBox = document.getElementById('infoProdukLama');
        const detailBox = document.getElementById('detailProdukLama');
        if (!barcode) { if (infoBox) infoBox.style.display = 'none'; return; }

        const p = await DB.get("produk", barcode);
        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';

        if (p) {
            document.getElementById('mNama').value = p.nama;
            if (userRole === 'Owner') {
                document.getElementById('mHargaBeli').value = p.hargaBeli !== '©©' ? (p.hargaBeli || '') : '';
                document.getElementById('mHargaJual').value = p.hargaJual !== '©©' ? (p.hargaJual || '') : '';
            }
            if (infoBox && detailBox) {
                detailBox.innerHTML = `Legal Gudang: ${p.stokGudang || 0} pcs | Terisolasi: ${p.stokIsolasi || 0} pcs`;
                infoBox.style.display = 'block';
            }
        } else {
            if (infoBox) infoBox.style.display = 'none';
        }
    },

    // 3. PROSES SIMPAN SMART STOK (KASIR AUTO-ISOLASI)
    async simpanSmartStok() {
        const barcode = document.getElementById('mBarcode').value.trim();
        const nama = document.getElementById('mNama').value.trim();
        const qtyMasuk = parseInt(document.getElementById('mQtyMasuk').value) || 0;

        if (!barcode || !nama || qtyMasuk <= 0) { alert("❌ Barcode, Nama, dan Jumlah Masuk wajib valid!"); return; }

        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';
        const produkLama = await DB.get("produk", barcode);

        try {
            let data;
            if (userRole === 'Owner') {
                const hBeli = parseFloat(document.getElementById('mHargaBeli').value);
                const hJual = parseFloat(document.getElementById('mHargaJual').value);
                if (isNaN(hBeli) || hBeli <= 0 || isNaN(hJual) || hJual <= 0) {
                    alert("❌ Owner wajib mengisi nominal harga beli dan jual di atas 0!"); return;
                }
                data = produkLama ? 
                    { ...produkLama, nama, hargaBeli: hBeli, hargaJual: hJual, stokGudang: (produkLama.stokGudang || 0) + qtyMasuk } :
                    { barcode, nama, hargaBeli: hBeli, hargaJual: hJual, stokGudang: qtyMasuk, stokIsolasi: 0, stokRak: 0 };
            } else {
                // KASIR/SUPERVISOR: Masuk status isolasi, harga murni dikunci ke '©©'
                if (produkLama) {
                    data = { ...produkLama, nama, stokIsolasi: (produkLama.stokIsolasi || 0) + qtyMasuk };
                } else {
                    data = { barcode, nama, hargaBeli: '©©', hargaJual: '©©', stokGudang: 0, stokIsolasi: qtyMasuk, stokRak: 0 };
                }
            }

            await DB.put("produk", data);
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('produk_master/' + barcode).set(data);
            }

            alert(userRole !== 'Owner' ? "⚠️ Sukses! Stok baru dimasukkan ke status ISOLASI menanti persetujuan Owner." : "✅ Produk berhasil disimpan!");
            this.bersihkanFormMaster();
        } catch (e) { alert("❌ Gagal menyimpan stok."); }
    },

    bersihkanFormMaster() {
        document.getElementById('mBarcode').value = '';
        document.getElementById('mNama').value = '';
        document.getElementById('mQtyMasuk').value = '';
        if (document.getElementById('mHargaBeli')) document.getElementById('mHargaBeli').value = '';
        if (document.getElementById('mHargaJual')) document.getElementById('mHargaJual').value = '';
        if (document.getElementById('infoProdukLama')) document.getElementById('infoProdukLama').style.display = 'none';
        this.renderMasterBarang();
    },
    // 4. WINDOW EDIT DAN VERIFIKASI HARGA (OWNER ONLY)
    async bukaModalEdit(barcode) {
        if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role !== 'Owner') {
            alert("⛔ Akses Ditolak! Hanya Owner Utama yang dapat mengaktifkan barang isolasi."); return;
        }

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Produk tidak ditemukan!"); return; }

        this.produkEditAktif = barcode;
        document.getElementById('editBarcode').value = p.barcode;
        document.getElementById('editNama').value = p.nama;
        document.getElementById('editHargaBeli').value = p.hargaBeli === '©©' ? '' : (p.hargaBeli || '');
        document.getElementById('editHargaJual').value = p.hargaJual === '©©' ? '' : (p.hargaJual || '');
        document.getElementById('editStokGudang').value = p.stokGudang || 0;
        
        // Memperlihatkan info stok isolasi yang diajukan kasir di modal
        const txtIsolasiInfo = document.getElementById('editStokIsolasiInfo') || { innerHTML: "" };
        txtIsolasiInfo.innerHTML = `⚠️ Ada <strong>${p.stokIsolasi || 0} pcs</strong> dalam antrean isolasi kasir.`;

        const modal = document.getElementById('modalEditProduk');
        if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
    },

    async simpanEditProduk() {
        if (!this.produkEditAktif) return;

        const barcode = document.getElementById('editBarcode').value.trim();
        const nama = document.getElementById('editNama').value.trim();
        const hBeli = parseFloat(document.getElementById('editHargaBeli').value);
        const hJual = parseFloat(document.getElementById('editHargaJual').value);
        let sGudang = parseInt(document.getElementById('editStokGudang').value) || 0;

        if (isNaN(hBeli) || hBeli <= 0 || isNaN(hJual) || hJual <= 0) {
            alert("❌ Harga Beli & Jual wajib diisi angka valid untuk membuka status isolasi!"); return;
        }

        try {
            const p = await DB.get("produk", this.produkEditAktif);
            if (!p) return;

            // Logika Gabung Otomatis: Pindahkan stok isolasi ke gudang legal karena harga sudah sah
            const sIsolasiLama = p.stokIsolasi || 0;
            sGudang += sIsolasiLama;

            const dataBaru = {
                ...p, barcode, nama, hargaBeli: hBeli, hargaJual: hJual,
                stokGudang: sGudang, stokIsolasi: 0, lastUpdate: Date.now()
            };

            if (barcode !== this.produkEditAktif) {
                await DB.delete("produk", this.produkEditAktif);
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    await firebase.database().ref('produk_master/' + this.produkEditAktif).remove();
                }
            }

            await DB.put("produk", dataBaru);
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('produk_master/' + barcode).set(dataBaru);
            }

            alert(`✅ Sukses! Status isolasi dicabut. ${sIsolasiLama} pcs barang digabungkan ke stok gudang legal.`);
            const modal = document.getElementById('modalEditProduk');
            if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
            this.produkEditAktif = null;
            this.renderMasterBarang();
        } catch (e) { alert("❌ Gagal memproses data."); }
    },
    // 5. DROPDOWN DAN PENGAMAT PINDAH STOK RAK TOKO
    async loadDropdownPindahStok() {
        const select = document.getElementById('rakSelectBarcode');
        if (!select) return;
        select.innerHTML = '<option value="">-- Pilih Barang --</option>';

        const list = await DB.getAll("produk");
        list.sort((a, b) => a.nama.localeCompare(b.nama));
        list.forEach(p => {
            if ((p.stokGudang || 0) <= 0) return;
            const opt = document.createElement('option');
            opt.value = p.barcode;
            opt.textContent = `${p.nama} (Legal Gudang: ${p.stokGudang} pcs)`;
            select.appendChild(opt);
        });
    },

    async pilihBarangPindah() {
        const barcode = document.getElementById('rakSelectBarcode').value;
        const infoBox = document.getElementById('rakInfoStok');
        const detailBox = document.getElementById('rakDetailStok');
        if (!barcode) { if (infoBox) infoBox.style.display = 'none'; return; }

        document.getElementById('rakBarcode').value = barcode;
        const p = await DB.get("produk", barcode);
        if (p && infoBox && detailBox) {
            detailBox.innerHTML = `<strong>${p.nama}</strong><br>
                <span style="color:#27ae60;">📦 Gudang Legal: <strong>${p.stokGudang || 0}</strong> pcs</span> | 
                <span style="color:#e74c3c;">⏳ Terisolasi: <strong>${p.stokIsolasi || 0}</strong> pcs</span>`;
            infoBox.style.display = 'block';
        }
    },

    // PROSEK EKSEKUSI UTAMA: Pembatasan ketat pemindahan barang isolasi ke rak
    async pindahKeRakInstan() {
        const barcode = document.getElementById('rakBarcode').value.trim();
        const qty = parseInt(document.getElementById('rakJumlah').value) || 0;
        if (!barcode || qty <= 0) return;

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Produk tidak ditemukan!"); return; }

        // PROTEKSI MUTLAK: Barang yang harganya '©©' diblokir total dari pemindahan
        if (p.hargaBeli === '©©' || p.hargaJual === '©©') {
            alert("⛔ Gagal Pindah! Produk ini berstatus ISOLASI TOTAL karena belum memiliki harga legal dari Owner.");
            return;
        }

        // KUNCI JUMLAH LOKAL: Hanya boleh memindahkan stok yang sudah berstatus legal (stokGudang lama)
        if ((p.stokGudang || 0) < qty) {
            alert(`❌ Gagal! Kamu hanya bisa memindahkan maksimal ${p.stokGudang || 0} pcs stok lama yang sudah legal. Sisa stok baru masih dalam status isolasi.`);
            return;
        }

        p.stokGudang -= qty;
        p.stokRak = (p.stokRak || 0) + qty;
        p.lastUpdate = Date.now();

        await DB.put("produk", p);
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            await firebase.database().ref('produk_master/' + barcode).set(p);
        }
        alert(`⚡ Sukses memindahkan ${qty} pcs barang legal ke Rak Pajangan Toko!`);
        document.getElementById('rakBarcode').value = '';
        this.renderMasterBarang();
    }
};

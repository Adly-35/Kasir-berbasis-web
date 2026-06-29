// stok.js — Modul Logika Input Master Barang, Tambah Gudang, & Pindah Rak (PERBAIKAN RADIKAL - ANTI DUPLIKAT) — PART 1

const Stok = {
    isRendering: false, // Kunci pengaman agar tidak terjadi render ganda bersamaan
    produkEditAktif: null, // Menyimpan barcode produk yang sedang diedit

    // Menampilkan katalog master barang (Bisa ditracking semua level dengan tampilan dinamis)
    async renderMasterBarang() {
        // Jika sistem sedang merender, blokir panggilan render berikutnya sampai yang ini selesai
        if (this.isRendering) return;
        this.isRendering = true;

        const thead = document.getElementById('headerMasterBarang');
        const tbody = document.getElementById('bodyMasterBarang');
        if (!tbody || !thead) { this.isRendering = false; return; }

        // Bersihkan total isi tabel sebelum diisi data segar
        tbody.innerHTML = '';
        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';

        // 1. SET HEADER DINAMIS BERDASARKAN LEVEL USER
        if (userRole === 'Owner') {
            thead.innerHTML = `<tr><th>Barcode & Nama</th><th>Harga Beli</th><th>Harga Jual</th><th style="width:100px;">Aksi</th></tr>`;
        } else {
            thead.innerHTML = `<tr><th>Nama Barang</th><th>Barcode</th><th class="text-center">Stok Gudang</th><th class="text-center">Stok Rak</th><th style="text-align:right;">Harga Jual</th></tr>`;
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

            // Gunakan DocumentFragment agar proses penempelan baris ke HTML super cepat dan ramah memori HP
            const fragment = document.createDocumentFragment();

            filtered.forEach(p => {
                const isTerisolasi = p.hargaBeli === '-' || p.hargaJual === '-';
                let hargaBeliDisplay = isTerisolasi ? '-' : (p.hargaBeli || 0).toLocaleString('id-ID');
                let hargaJualDisplay = isTerisolasi ? '-' : (p.hargaJual || 0).toLocaleString('id-ID');

                const tr = document.createElement('tr');

                if (userRole === 'Owner') {
                    tr.innerHTML = `
                        <td><strong>${p.nama}</strong> ${isTerisolasi ? '<span class="badge bg-danger" style="padding:2px 5px; font-size:10px; border-radius:4px; color:#fff;">⚠️ TERISOLASI</span>' : ''}<br><small>${p.barcode}</small></td>
                        <td style="text-align:right;">${isTerisolasi ? '' : 'Rp '} ${hargaBeliDisplay}</td>
                        <td style="text-align:right; font-weight:bold; color:#27ae60;">${isTerisolasi ? '' : 'Rp '} ${hargaJualDisplay}</td>
                        <td class="text-center" style="white-space:nowrap;">
                            <button class="btn btn-sm" style="background:#2196F3; color:white; padding:4px 8px; font-size:11px; margin-right:4px; border:none; border-radius:4px;" onclick="Stok.bukaModalEdit('${p.barcode}')">📝 Edit</button>
                            <button class="btn btn-sm" style="background:#e74c3c; color:white; padding:4px 8px; font-size:11px; border:none; border-radius:4px;" onclick="Stok.hapusMasterBarang('${p.barcode}')">✕ Hapus</button>
                        </td>
                    `;
                } else {
                    tr.innerHTML = `
                        <td><strong>${p.nama}</strong> ${isTerisolasi ? '<br><span style="color:red; font-size:11px; font-weight:bold;">[TERISOLASI]</span>' : ''}</td>
                        <td><code>${p.barcode}</code></td>
                        <td class="text-center" style="color:#7f8c8d;">${p.stokGudang || 0} pcs</td>
                        <td class="text-center" style="font-weight:bold; color:#27ae60;">${p.stokRak || 0} pcs</td>
                        <td style="text-align:right; font-weight:bold; color:#2196F3;">${isTerisolasi ? '-' : 'Rp ' + hargaJualDisplay}</td>
                    `;
                }
                fragment.appendChild(tr);
            });

            // Tempelkan seluruh baris secara serentak ke dalam tabel
            tbody.appendChild(fragment);

        } catch (err) {
            console.error("Gagal merender master barang:", err);
        }

        // 3. PROTEKSI FISIK FORM INPUT DI HP STAF
        const inputBeli = document.getElementById('mHargaBeli');
        const inputJual = document.getElementById('mHargaJual');
        const wrapperHarga = document.getElementById('wrapperHargaMaster');

        if (userRole === 'Owner') {
            if (wrapperHarga) wrapperHarga.style.display = 'block';
            if (inputBeli) { inputBeli.readOnly = false; inputBeli.type = 'number'; }
            if (inputJual) { inputJual.readOnly = false; inputJual.type = 'number'; }
        } else {
            if (wrapperHarga) wrapperHarga.style.display = 'none';
            if (inputBeli) { inputBeli.type = 'text'; inputBeli.value = '-'; inputBeli.readOnly = true; }
            if (inputJual) { inputJual.type = 'text'; inputJual.value = '-'; inputJual.readOnly = true; }
        }

        this.renderStokGudang();
        this.renderStokToko();

        // Buka kembali kunci render setelah selesai proses
        this.isRendering = false;
    },

    // ========== FITUR EDIT PRODUK (OWNER ONLY) ==========

    async bukaModalEdit(barcode) {
        if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role !== 'Owner') {
            alert("⛔ Akses Ditolak! Hanya Owner Utama yang dapat mengedit data barang.");
            return;
        }

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Produk tidak ditemukan!"); return; }

        this.produkEditAktif = barcode;

        // Isi form edit dengan data produk
        document.getElementById('editBarcode').value = p.barcode;
        document.getElementById('editNama').value = p.nama;
        document.getElementById('editHargaBeli').value = p.hargaBeli === '-' ? '' : (p.hargaBeli || '');
        document.getElementById('editHargaJual').value = p.hargaJual === '-' ? '' : (p.hargaJual || '');
        document.getElementById('editStokGudang').value = p.stokGudang || 0;
        document.getElementById('editStokRak').value = p.stokRak || 0;

        // Tampilkan modal
        const modal = document.getElementById('modalEditProduk');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
        }
    },

    tutupModalEdit() {
        this.produkEditAktif = null;
        const modal = document.getElementById('modalEditProduk');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    },

    async simpanEditProduk() {
        if (!this.produkEditAktif) return;

        const barcode = document.getElementById('editBarcode').value.trim();
        const nama = document.getElementById('editNama').value.trim();
        const hargaBeli = parseFloat(document.getElementById('editHargaBeli').value);
        const hargaJual = parseFloat(document.getElementById('editHargaJual').value);
        const stokGudang = parseInt(document.getElementById('editStokGudang').value) || 0;
        const stokRak = parseInt(document.getElementById('editStokRak').value) || 0;

        if (!barcode || !nama) {
            alert("❌ Barcode dan Nama Barang wajib diisi!");
            return;
        }

        if (isNaN(hargaBeli) || hargaBeli <= 0 || isNaN(hargaJual) || hargaJual <= 0) {
            alert("❌ Harga Beli & Jual wajib diisi dengan angka valid di atas 0!");
            return;
        }

        try {
            // Ambil data lama untuk preservasi field lain
            const p = await DB.get("produk", this.produkEditAktif);
            if (!p) { alert("❌ Data produk asli tidak ditemukan!"); return; }

            // Update data
            const dataBaru = {
                ...p,
                barcode: barcode,
                nama: nama,
                hargaBeli: hargaBeli,
                hargaJual: hargaJual,
                stokGudang: stokGudang,
                stokRak: stokRak,
                lastUpdate: Date.now()
            };

            // Jika barcode berubah, hapus entry lama dan buat baru
            if (barcode !== this.produkEditAktif) {
                // Cek apakah barcode baru sudah dipakai produk lain
                const cekBarcode = await DB.get("produk", barcode);
                if (cekBarcode && barcode !== this.produkEditAktif) {
                    alert("❌ Barcode baru sudah digunakan oleh produk lain!");
                    return;
                }
                await DB.delete("produk", this.produkEditAktif);
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    await firebase.database().ref('produk_master/' + this.produkEditAktif).remove();
                }
            }

            await DB.put("produk", dataBaru);
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('produk_master/' + barcode).set(dataBaru);
            }

            if (typeof Beep !== 'undefined' && Beep.ok) Beep.ok();
            alert("✅ Data produk berhasil diperbarui!");
            this.tutupModalEdit();
            this.renderMasterBarang();

        } catch (e) {
            alert("❌ Gagal menyimpan perubahan: " + e.message);
            console.error(e);
        }
    },

    // ========== END FITUR EDIT ==========

    // Mengecek data barcode lama saat diketik/di-scan — PART 2
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
                document.getElementById('mHargaBeli').value = p.hargaBeli !== '-' ? (p.hargaBeli || '') : '';
                document.getElementById('mHargaJual').value = p.hargaJual !== '-' ? (p.hargaJual || '') : '';
            } else {
                document.getElementById('mHargaBeli').value = '-';
                document.getElementById('mHargaJual').value = '-';
            }

            if (infoBox && detailBox) {
                detailBox.innerHTML = `Gudang: ${p.stokGudang || 0} pcs | Rak Toko: ${p.stokRak || 0} pcs`;
                infoBox.style.display = 'block';
            }
        } else {
            if (infoBox) infoBox.style.display = 'none';
        }
    },

    // Menyimpan / Menambah Stok Baru dari Fitur Utama
    async simpanSmartStok() {
        const barcode = document.getElementById('mBarcode').value.trim();
        const nama = document.getElementById('mNama').value.trim();
        const qtyMasuk = parseInt(document.getElementById('mQtyMasuk').value) || 0;

        if (!barcode || !nama || qtyMasuk < 0) { alert("❌ Data identitas barang atau jumlah tidak valid!"); return; }

        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';
        const produkLama = await DB.get("produk", barcode);

        let hargaBeliFinal = "-";
        let hargaJualFinal = "-";

        if (userRole === 'Owner') {
            const hBeli = parseFloat(document.getElementById('mHargaBeli').value);
            const hJual = parseFloat(document.getElementById('mHargaJual').value);

            if (isNaN(hBeli) || hBeli <= 0 || isNaN(hJual) || hJual <= 0) {
                alert("❌ Bagi Owner, Harga Beli & Jual wajib diisi dengan angka valid di atas 0!");
                return;
            }
            hargaBeliFinal = hBeli;
            hargaJualFinal = hJual;
        } else {
            hargaBeliFinal = "-";
            hargaJualFinal = "-";
        }

        try {
            let data = produkLama 
                ? { ...produkLama, nama, hargaBeli: hargaBeliFinal, hargaJual: hargaJualFinal, stokGudang: (produkLama.stokGudang || 0) + qtyMasuk }
                : { barcode, nama, hargaBeli: hargaBeliFinal, hargaJual: hargaJualFinal, stokGudang: qtyMasuk, stokRak: 0 };

            await DB.put("produk", data);
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('produk_master/' + barcode).set(data);
            }

            alert(hargaBeliFinal === '-' ? "⚠️ Sukses! Produk terisolasi karena Anda login sebagai Kasir/Supervisor (Harga murni dikunci ke '-')." : "✅ Produk berhasil disimpan!");
            this.bersihkanFormMaster();
            this.renderMasterBarang();
        } catch (e) { alert("❌ Gagal menyimpan."); }
    },

    bersihkanFormMaster() {
        document.getElementById('mBarcode').value = '';
        document.getElementById('mNama').value = '';
        this.renderMasterBarang();
        document.getElementById('mQtyMasuk').value = '';
        if (document.getElementById('infoProdukLama')) document.getElementById('infoProdukLama').style.display = 'none';
    },

    // Mengisi stok gudang tambahan di bagian bawah menu master barang — PART 3
    async isiStokGudang() {
        const barcode = document.getElementById('gudangBarcode').value.trim();
        const qty = parseInt(document.getElementById('gudangJumlah').value) || 0;
        if (!barcode || qty <= 0) return;

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Barcode belum terdaftar di master!"); return; }

        const userRole = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser.role : 'Kasir';

        if (userRole !== 'Owner') {
            p.hargaBeli = "-";
            p.hargaJual = "-";
        }

        p.stokGudang = (p.stokGudang || 0) + qty;
        await DB.put("produk", p);
        if (typeof firebase !== 'undefined' && firebase.apps.length) await firebase.database().ref('produk_master/' + barcode).set(p);

        alert(userRole !== 'Owner' ? "⚠️ Stok gudang ditambahkan! Status produk otomatis terisolasi." : "📥 Stok gudang berhasil ditambahkan!");
        document.getElementById('gudangBarcode').value = '';
        this.renderMasterBarang();
    },

    async renderStokGudang() {
        const tbody = document.getElementById('bodyStokGudang');
        if (!tbody) return; tbody.innerHTML = '';
        const list = await DB.getAll("produk");
        list.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${p.nama}</strong></td><td><code>${p.barcode}</code></td><td class="text-center">${p.stokGudang || 0} pcs</td>`;
            tbody.appendChild(tr);
        });
    },

    async renderStokToko() {
        const tbody = document.getElementById('bodyStokToko');
        if (!tbody) return; tbody.innerHTML = '';
        const list = await DB.getAll("produk");
        list.forEach(p => {
            const isTerisolasi = p.hargaBeli === '-' || p.hargaJual === '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.nama}</strong> ${isTerisolasi ? '<span style="color:red;font-size:10px;">[Terisolasi]</span>':''}<br><small>${p.barcode}</small></td>
                <td class="text-center">${p.stokGudang || 0} pcs</td>
                <td class="text-center" style="font-weight:bold; color:#27ae60;">${p.stokRak || 0} pcs</td>
                <td class="text-center">${(p.stokGudang || 0) + (p.stokRak || 0)} pcs</td>
                <td class="text-center">${isTerisolasi ? '<span style="color:red;font-weight:bold;">Isolasi</span>' : 'Aktif'}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async pindahKeRakInstan() {
        const barcode = document.getElementById('rakBarcode').value.trim();
        const qty = parseInt(document.getElementById('rakJumlah').value) || 0;
        if (!barcode || qty <= 0) return;

        const p = await DB.get("produk", barcode);
        if (!p) { alert("❌ Produk tidak ditemukan!"); return; }

        if (p.hargaBeli === '-' || p.hargaJual === '-') {
            alert("⛔ Gagal Pindah Stok! Produk ini sedang dalam daftar ISOLASI karena belum memiliki harga legal. Hanya Admin/Owner yang dapat mengaktifkan barang ini dengan mengisi nominal harga terlebih dahulu.");
            return;
        }

        if ((p.stokGudang || 0) < qty) { alert("❌ Stok gudang tidak mencukupi!"); return; }

        p.stokGudang -= qty;
        p.stokRak = (p.stokRak || 0) + qty;
        await DB.put("produk", p);

        if (typeof firebase !== 'undefined' && firebase.apps.length) await firebase.database().ref('produk_master/' + barcode).set(p);
        alert(`⚡ Sukses memindahkan ${qty} pcs barang ke Rak Pajangan Toko!`);
        document.getElementById('rakBarcode').value = '';
        this.renderMasterBarang();
    },

    async hapusMasterBarang(barcode) {
        if (typeof Auth !== 'undefined' && Auth.currentUser && Auth.currentUser.role !== 'Owner') {
            alert("⛔ Akses Ditolak! Hanya Owner Utama yang memiliki otoritas menghapus data barang.");
            return;
        }

        if (!confirm("Apakah Anda yakin ingin menghapus produk ini secara permanen dari sistem?")) return;
        await DB.delete("produk", barcode);
        if (typeof firebase !== 'undefined' && firebase.apps.length) await firebase.database().ref('produk_master/' + barcode).remove();
        this.renderMasterBarang();
    }
};
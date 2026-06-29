// =========================================================================
// FILE: kasir.js (REVISI UTUH - 100% FULL TOTAL ANTI REPOT)
// MODUL KASIR: KODE TOKO INPUT, INISIAL 3 HURUF, & AUTO-RESET BULANAN CLOUD
// =========================================================================

const Kasir = {
    keranjang: [],
    scanTimer: null,
    transaksiAktif: null,

    // 1. INISIALISASI AUTO-SCAN DENGAN JEDA HP 2 DETIK
    initAutoScan() {
        const input = document.getElementById('inputBarcode');
        if (!input) return;

        input.removeEventListener('input', this.handleInputDelay);
        input.addEventListener('input', (e) => {
            clearTimeout(this.scanTimer);
            const barcode = e.target.value.trim();
            if (!barcode) return;

            this.scanTimer = setTimeout(() => {
                this.scanManual();
            }, 2000);
        });
        this.perbaruiVisualTombolDraft();
    },

    // 2. PROSES SCAN MANUAL ATAU AUTO-SUBMIT DENGAN PERKALIAN BANCI (*)
    async scanManual() {
        clearTimeout(this.scanTimer);
        const input = document.getElementById('inputBarcode');
        let rawInput = input?.value.trim();
        if (!rawInput) return;

        let qtyInput = 1;
        let barcodeFinal = rawInput;

        // Mendukung format perkalian kuantitas (Contoh: 5*12345)
        if (rawInput.includes('*')) {
            const parts = rawInput.split('*');
            const parsedQty = parseInt(parts[0]);
            if (!isNaN(parsedQty) && parsedQty > 0) {
                qtyInput = parsedQty;
                barcodeFinal = parts.slice(1).join('*').trim();
            }
        }

        try {
            const p = await DB.get("produk", barcodeFinal);
            if (!p) { 
                alert(`❌ Barcode "${barcodeFinal}" tidak terdaftar!`); 
                input.value = ''; 
                return; 
            }

            const sRak = p.stokRak !== undefined ? p.stokRak : (p.stok_rak || 0);
            if (sRak <= 0) { 
                alert(`⚠️ Stok rak untuk "${p.nama}" kosong!`); 
                input.value = ''; 
                return; 
            }

            const ada = this.keranjang.find(item => item.barcode === barcodeFinal);
            if (ada) {
                const totalQtyBaru = ada.qty + qtyInput;
                if (totalQtyBaru > sRak) { 
                    alert(`🚫 Stok rak sisa ${sRak} pcs!`); 
                    input.value = ''; 
                    return; 
                }
                ada.qty = totalQtyBaru;
                ada.subtotal = ada.qty * ada.harga_jual;
            } else {
                if (qtyInput > sRak) { 
                    alert(`🚫 Stok rak sisa ${sRak} pcs!`); 
                    input.value = ''; 
                    return; 
                }
                this.keranjang.push({
                    barcode: p.barcode,
                    nama_barang: p.nama,
                    qty: qtyInput,
                    harga_jual: p.hargaJual || p.harga_jual || 0,
                    subtotal: qtyInput * (p.hargaJual || p.harga_jual || 0)
                });
            }
            
            input.value = '';
            this.renderKeranjang();
            input.focus();

        } catch (error) { 
            console.error(error); 
            input.value = ''; 
        }
    },

    // 3. MENAMPILKAN DATA KERANJANG KE TABEL KASIR HP
    renderKeranjang() {
        const tbody = document.getElementById('bodyKeranjangKasir');
        if (!tbody) return;
        tbody.innerHTML = '';

        let total = 0;
        this.keranjang.forEach((item, index) => {
            total += item.subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.nama_barang}</strong><br><small>Rp ${item.harga_jual.toLocaleString('id-ID')}</small></td>
                <td class="text-center"><input type="number" min="1" value="${item.qty}" style="width:55px; text-align:center; font-weight:bold;" onchange="Kasir.ubahQtyManual(${index}, this.value)"></td>
                <td style="text-align:right; font-weight:bold;">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
                <td class="text-center"><button class="btn btn-sm btn-danger" onclick="Kasir.hapusItem(${index})">✕</button></td>
            `;
            tbody.appendChild(tr);
        });
        document.getElementById('txtTotalBayar').textContent = `Rp ${total.toLocaleString('id-ID')}`;
        this.hitungKembalian();
    },

    // 4. MENGUBAH KUANTITAS SECARA MANUAL DI TABEL
    async ubahQtyManual(index, value) {
        let qtyBaru = parseInt(value);
        if (isNaN(qtyBaru) || qtyBaru <= 0) qtyBaru = 1;
        const item = this.keranjang[index];
        if (!item) return;

        const p = await DB.get("produk", item.barcode);
        if (p) {
            const sRak = p.stokRak !== undefined ? p.stokRak : (p.stok_rak || 0);
            if (qtyBaru > sRak) { 
                alert(`🚫 Stok maksimal rak adalah ${sRak} pcs!`); 
                qtyBaru = sRak; 
            }
        }
        item.qty = qtyBaru;
        item.subtotal = item.qty * item.harga_jual;
        this.renderKeranjang();
    },

    // 5. FITUR HOLD & RECALL NOTA ANTREAN (DRAFT LACI LOCALSTORAGE)
    simpanDraftLaci() {
        if (this.keranjang.length === 0) return;
        localStorage.setItem('kasirPro_holdDraft', JSON.stringify(this.keranjang));
        alert("💾 Nota berhasil di-hold sementara!");
        this.kosongkanKeranjang();
        this.perbaruiVisualTombolDraft();
    },

    panggilDraftLaci() {
        const dataDraft = localStorage.getItem('kasirPro_holdDraft');
        if (!dataDraft) return;
        this.keranjang = JSON.parse(dataDraft);
        localStorage.removeItem('kasirPro_holdDraft');
        alert("📂 Draft nota antrean dipanggil kembali!");
        this.renderKeranjang();
        this.perbaruiVisualTombolDraft();
    },

    perbaruiVisualTombolDraft() {
        const badge = document.getElementById('badgeDraftCount');
        if (badge) {
            const data = localStorage.getItem('kasirPro_holdDraft');
            badge.style.display = data ? "inline-block" : "none";
        }
    },

    hapusItem(index) { this.keranjang.splice(index, 1); this.renderKeranjang(); },
    kosongkanKeranjang() { this.keranjang = []; this.renderKeranjang(); },
    
    setUangPas() {
        const totalText = document.getElementById('txtTotalBayar').textContent.replace('Rp ', '').replace(/\./g, '');
        document.getElementById('inputUangBayar').value = parseFloat(totalText) || 0;
        this.hitungKembalian();
    },

    hitungKembalian() {
        const totalText = document.getElementById('txtTotalBayar').textContent.replace('Rp ', '').replace(/\./g, '');
        const total = parseFloat(totalText) || 0;
        const bayar = parseFloat(document.getElementById('inputUangBayar').value) || 0;
        const kembalian = bayar - total;
        const txt = document.getElementById('txtKembalian');
        if (txt) txt.textContent = kembalian < 0 ? "Rp 0 (Kurang)" : `Rp ${kembalian.toLocaleString('id-ID')}`;
    },

    // ⚡ MENGHITUNG DAN MEMBENTUK TRX-ID SECARA KUSTOM SESUAI KESEPAKATAN
    async generateSistemTrxID(namaLengkapUser) {
        let kodeToko = "119"; // Cadangan standar jika di Firebase kosong
        
        // 1. Ambil KODE TOKO Angka dari Cloud hasil setting Owner
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            const snapToko = await firebase.database().ref('pengaturan_toko').once('value');
            const dataToko = snapToko.val();
            if (dataToko && dataToko.kode) {
                kodeToko = dataToko.kode; 
            }
        }

        // 2. Pembentukan Inisial Nama Belakang Kasir Aktif (Maksimal 3 Huruf Kapital)
        let inisialKasir = "KSR";
        if (namaLengkapUser) {
            const pisahNama = namaLengkapUser.trim().split(/\s+/);
            const namaPilihan = pisahNama.length > 1 ? pisahNama[pisahNama.length - 1] : pisahNama[0];
            
            if (namaPilihan.length >= 3) {
                inisialKasir = namaPilihan.substring(0, 3).toUpperCase();
            } else {
                inisialKasir = namaPilihan.toUpperCase().padEnd(3, 'X');
            }
        }

        // 3. Mengambil Format Bulan & Tahun Berjalan (MMYY)
        const sekarang = new Date();
        const mm = String(sekarang.getMonth() + 1).padStart(2, '0');
        const yy = String(sekarang.getFullYear()).substring(2);
        const klusterBulanTahun = mm + yy; 

        // 4. Hitung Urutan Auto-Increment per Bulan di Firebase (Auto-Reset di Tanggal 1)
        let nomorUrutLokal = 1;
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            const pathCounter = `counter_transaksi/${mm}-${yy}`;
            const refCounter = firebase.database().ref(pathCounter);
            
            // Menggunakan transaksi atomik cloud agar nomor urut anti-tabrakan/ganda
            const hasilTransaksiBulanIni = await refCounter.transaction((currentValue) => {
                return (currentValue || 0) + 1;
            });
            nomorUrutLokal = hasilTransaksiBulanIni.snapshot.val();
        } else {
            nomorUrutLokal = Math.floor(Math.random() * 900) + 1; // Offline fallback
        }

        const stringNomorUrut = String(nomorUrutLokal).padStart(4, '0'); 

        // Hasil Gabungan Sempurna: KODETOKO + INISIAL + BULANTAHUN + NOURUT (Misal: 119ARD06260001)
        return `${kodeToko}${inisialKasir}${klusterBulanTahun}${stringNomorUrut}`;
    },

    // 6. FINISH TRANSAKSI, SIMPAN KE DATA KASIR LOCAL & SYNC KE CLOUD
    async selesaiTransaksi() {
        if (this.keranjang.length === 0) return;
        const totalText = document.getElementById('txtTotalBayar').textContent.replace('Rp ', '').replace(/\./g, '');
        const total = parseFloat(totalText) || 0;
        const bayar = parseFloat(document.getElementById('inputUangBayar').value) || 0;
        if (bayar < total) { alert("❌ Pembayaran kurang!"); return; }

        // Otomatis membaca siapa akun kasir yang sedang login melayani transaksi
        let namaKasirReal = "Kasir Pro";
        if (typeof Auth !== 'undefined' && Auth.currentUser) {
            namaKasirReal = Auth.currentUser.nama || Auth.currentUser.username;
        }

        if (typeof showLoading === 'function') showLoading("Membentuk Nota Transaksi...");

        // Panggil generator kode kustom kesepakatan
        const noStrukDinamis = await this.generateSistemTrxID(namaKasirReal);

        try {
            const transaksiData = { 
                noStruk: noStrukDinamis, 
                tanggal: new Date().toISOString(), 
                kasir: namaKasirReal, 
                total, 
                bayar, 
                kembalian: bayar - total, 
                synced: false,
                device_id: (typeof DBSync !== 'undefined') ? DBSync.deviceId : 'unknown'
            };

            // Simpan transaksi baru ke database local IndexedDB
            await DB.put("transaksi", transaksiData);

            // Potong Stok Rak Barang Terjual
            for (let item of this.keranjang) {
                const p = await DB.get("produk", item.barcode);
                if (p) {
                    const current = p.stokRak !== undefined ? p.stokRak : (p.stok_rak || 0);
                    p.stokRak = Math.max(0, current - item.qty);
                    p.lastUpdate = Date.now();
                    await DB.put("produk", p);
                    if (typeof DBSync !== 'undefined' && DBSync.tambahQueue) DBSync.tambahQueue('produk', p);
                }
            }

            if (typeof DBSync !== 'undefined' && DBSync.tambahQueue) {
                DBSync.tambahQueue('transaksi', transaksiData);
            }

            if (typeof DBSync !== 'undefined') DBSync.jalankanSinkronisasi(false);
            if (typeof Beep !== 'undefined' && Beep.success) Beep.success();

            if (typeof hideLoading === 'function') hideLoading();
            this.transaksiAktif = { data: transaksiData, barang: [...this.keranjang] };
            
            // Render cetakan struk visual ke pop-up screen
            await this.renderStrukVisual(transaksiData, this.keranjang);

        } catch (e) { 
            if (typeof hideLoading === 'function') hideLoading();
            alert("❌ Transaksi gagal."); 
            console.error(e); 
        }
    },

    // 7. RENDER STRUK DIGITAL & SEJAJARKAN KASIR BESERTA NO STRUK KUSTOM
    async renderStrukVisual(trx, barang) {
        let namaToko = "", alamatToko = "", kotaToko = "", telpToko = "", logoCustom = "";

        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            const snap = await firebase.database().ref('pengaturan_toko').once('value');
            const info = snap.val();
            if (info) {
                namaToko = info.nama || "";
                alamatToko = info.alamat || "";
                kotaToko = info.kota || "";
                telpToko = info.telp || "";
                logoCustom = info.logoData || "";
            }
        }

        const elLogoDefault = document.getElementById('stLogoDefault');
        const elLogoCustom = document.getElementById('stLogoCustom');
        if (logoCustom) {
            if (elLogoDefault) elLogoDefault.style.display = 'none';
            if (elLogoCustom) { elLogoCustom.src = logoCustom; elLogoCustom.style.display = 'block'; }
        } else {
            if (elLogoDefault) elLogoDefault.style.display = 'inline-block';
            if (elLogoCustom) elLogoCustom.style.display = 'none';
        }

        document.getElementById('stTxtNamaToko').textContent = namaToko;
        document.getElementById('stTxtAlamatToko').textContent = alamatToko;
        document.getElementById('stTxtKotaToko').textContent = kotaToko;
        document.getElementById('stTxtTelpToko').textContent = telpToko;
        document.getElementById('stTxtCabang').textContent = kotaToko ? `Cabang ${kotaToko}` : "";
        
        // MENYUNTIKKAN nama kasir murni yang login aktif saat transaksi
        document.getElementById('stNamaKasir').textContent = trx.kasir;

        const dt = new Date(trx.tanggal);
        document.getElementById('stTanggal').textContent = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
        document.getElementById('stTanggalJam').textContent = String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0') + ':' + String(dt.getSeconds()).padStart(2, '0');
        
        // MENYUNTIKKAN nomor struk kustom baru hasil rumusan otomatis
        document.getElementById('stNoStruk').textContent = trx.noStruk;
        
        const bodyStruk = document.getElementById('stBodyBarang');
        bodyStruk.innerHTML = '';
        let totalQtyTerjual = 0;

        barang.forEach((item, index) => {
            totalQtyTerjual += item.qty;
            const div = document.createElement('div');
            div.style.cssText = "display:flex; flex-direction:column; margin-bottom:4px;";
            div.innerHTML = `
                <div style="font-weight:bold;">${index + 1}. ${item.nama_barang}</div>
                <div style="display:flex; justify-content:space-between; padding-left:14px; font-size:11px;">
                    <span>@ ${item.qty} pcs x ${item.harga_jual.toLocaleString('id-ID')}</span>
                    <span>Rp ${item.subtotal.toLocaleString('id-ID')}</span>
                </div>
            `;
            bodyStruk.appendChild(div);
        });

        document.getElementById('stTotalQty').textContent = totalQtyTerjual;
        document.getElementById('stSubTotal').textContent = `Rp ${trx.total.toLocaleString('id-ID')}`;
        document.getElementById('stTotal').textContent = `Rp ${trx.total.toLocaleString('id-ID')}`;
        document.getElementById('stBayar').textContent = `Rp ${trx.bayar.toLocaleString('id-ID')}`;
        document.getElementById('stKembalian').textContent = `Rp ${trx.kembalian.toLocaleString('id-ID')}`;

        const modal = document.getElementById('modalStokStruk');
        if (modal) { modal.style.display = 'flex'; modal.classList.remove('hidden'); }
    },

    // 8. CETAK NOTA KERTAS THERMAL 58MM SEJAJAR RAPI
    aksiCetakThermal() {
        if (!this.transaksiAktif) return;
        const trx = this.transaksiAktif.data;
        const barang = this.transaksiAktif.barang;
        const printWindow = window.open('', '_blank');
        
        let itemHtml = '';
        barang.forEach((item, index) => {
            itemHtml += `
                <div style="margin-bottom: 5px;">
                    <div>${index + 1}. ${item.nama_barang}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; padding-left: 10px;">
                        <span>${item.qty} pcs x ${item.harga_jual.toLocaleString('id-ID')}</span>
                        <span>Rp ${item.subtotal.toLocaleString('id-ID')}</span>
                    </div>
                </div>
            `;
        });

        const namaT = document.getElementById('stTxtNamaToko').textContent;
        const alamatT = document.getElementById('stTxtAlamatToko').textContent;
        const telpT = document.getElementById('stTxtTelpToko').textContent;

        printWindow.document.write(`
            <html>
            <head>
                <title>Cetak Struk #${trx.noStruk}</title>
                <style>
                    @page { size: 58mm auto; margin: 0; }
                    body { font-family: 'Courier New', monospace; width: 54mm; margin: 0; padding: 4px; background: #fff; color: #000; font-size: 12px; }
                    .center { text-align: center; }
                    .dashed { border-top: 1px dashed #000; margin: 6px 0; }
                </style>
            </head>
            <body>
                <div class="center" style="font-size: 14px; font-weight: bold;">${namaT || "🏪"}</div>
                <div class="center" style="font-size: 10px;">${alamatT}</div>
                <div class="center" style="font-size: 10px;">${telpT}</div>
                <div class="dashed"></div>
                <div style="display:flex; justify-content:space-between; font-size:10px;">
                    <span>${new Date(trx.tanggal).toLocaleDateString('id-ID')}</span>
                    <span>Kasir: ${trx.kasir}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:2px;">
                    <span>${new Date(trx.tanggal).toLocaleTimeString('id-ID')}</span>
                    <span>Trx-ID: ${trx.noStruk}</span>
                </div>
                <div class="dashed"></div>
                ${itemHtml}
                <div class="dashed"></div>
                <div style="display: flex; justify-content: space-between; font-weight:bold;"><span>TOTAL:</span><span>Rp ${trx.total.toLocaleString('id-ID')}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Bayar:</span><span>Rp ${trx.bayar.toLocaleString('id-ID')}</span></div>
                <div style="display: flex; justify-content: space-between;"><span>Kembali:</span><span>Rp ${trx.kembalian.toLocaleString('id-ID')}</span></div>
                <div class="dashed"></div>
                <div class="center" style="font-size: 11px; font-weight: bold;">Terima Kasih Telah Berbelanja!</div>
            </body>
            </html>
        `);
        printWindow.document.close(); printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
    },

    // 9. DOWNLOAD STRUK DIGITAL BERUPA GAMBAR (.JPG) KE HP KASIR
    aksiDownloadDigital() {
        const target = document.getElementById('areaKertasStruk');
        if (!target) return;
        html2canvas(target, { scale: 2, backgroundColor: "#ffffff" }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Struk_${Date.now()}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.95);
            document.body.appendChild(link); 
            link.click(); 
            document.body.removeChild(link);
            alert("📱 Struk digital (.jpg) berhasil diunduh!");
        });
    },

    // 10. MENUTUP MODAL POP-UP DAN KEMBALI FOKUS KE KOLOM SCAN BARCODE BARU
    tutupStrukPopUp() {
        const modal = document.getElementById('modalStokStruk');
        if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
        this.kosongkanKeranjang();
        this.transaksiAktif = null;
        document.getElementById('inputUangBayar').value = '';
        this.perbaruiVisualTombolDraft();
        setTimeout(() => { document.getElementById('inputBarcode')?.focus(); }, 200);
    }
};
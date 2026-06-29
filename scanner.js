// scanner.js — Modul Kamera Scanner HP Universal (Versi Anti-Double Scan & Autofokus Makro) — FULL COMPLIT

const ScannerGlobal = {
    codeReader: null,
    kameraAktif: false,
    targetInputId: null,
    targetMenu: null,
    
    // Variabel pengunci jeda pembacaan kamera
    terakhirDiScan: null,
    waktuScanTerakhir: 0,
    DURASI_JEDA: 2000, // Mengunci kamera selama 2 detik setelah sukses membaca pertama kali

    initReader() {
        if (!this.codeReader && typeof ZXing !== 'undefined') {
            this.codeReader = new ZXing.BrowserMultiFormatReader();
        }
    },

    async sakelarKamera(inputId, namaMenu) {
        this.initReader();
        const box = document.getElementById('areaScannerGlobalBox');

        if (!box) return;

        if (this.kameraAktif && this.targetMenu === namaMenu) {
            this.matikanKamera();
            return;
        }

        if (this.kameraAktif) {
            this.matikanKamera();
        }

        this.targetInputId = inputId;
        this.targetMenu = namaMenu;

        try {
            box.style.display = 'block';
            box.classList.remove('hidden');

            if (this.codeReader) {
                this.kameraAktif = true;
                
                // Reset memori jejak scan setiap kali kamera baru dinyalakan
                this.terakhirDiScan = null;
                this.waktuScanTerakhir = 0;

                const videoConstraints = {
                    video: {
                        facingMode: "environment",
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        focusMode: "continuous"
                    }
                };

                await this.codeReader.decodeFromConstraints(videoConstraints, 'videoScannerGlobal', (result, err) => {
                    if (result) {
                        const barcodeHasil = result.text.trim();
                        const sekarang = Date.now();

                        // =========================================================
                        // 🛡️ SISTEM INTERSEPTOR JEDA ANTI-DOUBLE SCAN BERUNTUN
                        // =========================================================
                        // Jika barcode yang dibaca sama dengan 2 detik lalu, abaikan dan buang kodenya
                        if (barcodeHasil === this.terakhirDiScan && (sekarang - this.waktuScanTerakhir) < this.DURASI_JEDA) {
                            console.log(`⏳ Kamera mengabaikan scan beruntun untuk barcode: ${barcodeHasil}`);
                            return; // Potong alur di sini, jangan masukkan ke keranjang kasir
                        }

                        // Jika lolos seleksi (pembacaan pertama atau barang berbeda), catat jejak barunya
                        this.terakhirDiScan = barcodeHasil;
                        this.waktuScanTerakhir = sekarang;

                        console.log(`📷 Kamera HP [${namaMenu}] sukses membaca: ${barcodeHasil}`);

                        if (typeof Beep !== 'undefined' && typeof Beep.ok === 'function') Beep.ok();

                        const inputTarget = document.getElementById(this.targetInputId);
                        if (inputTarget) {
                            inputTarget.value = barcodeHasil;
                            
                            if (this.targetMenu === 'kasir' && typeof Kasir !== 'undefined' && Kasir.handleScanResult) {
                                Kasir.handleScanResult(barcodeHasil);
                            } else if (this.targetMenu === 'patroli' && typeof PatroliRak !== 'undefined' && PatroliRak.scanPatroli) {
                                PatroliRak.scanPatroli();
                            } else if (this.targetMenu === 'master' && typeof Stok !== 'undefined' && Stok.cekProdukLama) {
                                Stok.cekProdukLama();
                            } else if (this.targetMenu === 'request' && typeof RequestStok !== 'undefined' && RequestStok.cekStokLama) {
                                RequestStok.cekStokLama();
                            }
                        }
                    }
                });
            } else {
                alert("❌ Pustaka kamera scanner belum termuat sempurna.");
            }
        } catch (error) {
            console.error("Gagal membuka kamera:", error);
            alert("❌ Hambatan Kamera: Izinkan izin kamera pada browser HP Anda!");
            this.matikanKamera();
        }
    },

    matikanKamera() {
        if (this.codeReader) {
            try { this.codeReader.reset(); } catch(e){}
        }
        const box = document.getElementById('areaScannerGlobalBox');
        if (box) {
            box.style.display = 'none';
            box.classList.add('hidden');
        }
        this.kameraAktif = false;
        this.targetInputId = null;
        this.targetMenu = null;
        this.terakhirDiScan = null;
        this.waktuScanTerakhir = 0;
    }
};

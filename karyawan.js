// karyawan.js — Modul Manajemen Akun Karyawan & Log Kinerja Individu — FULL TEXT COMPLIT V15

const Karyawan = {
    AVATAR_DEFAULT: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999999'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>",

    async loadList() {
        const tbody = document.getElementById('tabelKaryawanBodi');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (typeof Auth !== 'undefined' && !Auth.isOwner() && !Auth.isSupervisor()) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">⛔ Akses ditolak. Hanya Owner/Supervisor yang dapat melihat daftar karyawan.</td></tr>';
            return;
        }

        // Sync dari Firebase jika online
        if (typeof firebase !== 'undefined' && firebase.apps.length) {
            try {
                const snapshot = await firebase.database().ref('karyawan').once('value');
                const fbData = snapshot.val();
                if (fbData) {
                    for (const [key, val] of Object.entries(fbData)) {
                        const local = await DB.get("karyawan", key);
                        if (!local || (val.updatedAt && local.updatedAt && val.updatedAt > local.updatedAt)) {
                            await DB.put("karyawan", val);
                        }
                    }
                }
            } catch (e) {
                console.log("Sync karyawan from Firebase failed (offline?):", e);
            }
        }

        const list = await DB.getAll("karyawan");

        if (list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#999; padding:15px;">Belum ada akun karyawan terdaftar.</td></tr>';
            return;
        }

        list.forEach(k => {
            const roleDisplay = k.role || k.level || 'Kasir';

            let badgeRole = `<span class="badge-info bg-success" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#fff;">👤 Kasir</span>`;
            if (roleDisplay === 'Owner' || k.level === 'admin' || k.level === 'owner') {
                badgeRole = `<span class="badge-info bg-danger" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#fff;">👑 Owner</span>`;
            } else if (roleDisplay === 'Supervisor' || k.level === 'supervisor') {
                badgeRole = `<span class="badge-info bg-warning" style="padding:2px 6px; font-size:11px; border-radius:4px; color:#333;">⚡ Ka. Toko</span>`;
            }

            const fotoSrc = k.foto || this.AVATAR_DEFAULT;
            const isSelf = Auth.currentUser && Auth.currentUser.username === k.username;

            let hapusBtn = '-';
            if (Auth.isOwner()) {
                hapusBtn = isSelf 
                    ? `<span style="color:#999; font-size:11px;">🚫 Sesi Aktif</span>`
                    : `<button class="btn btn-sm" style="background:#d9534f; color:white; padding:2px 6px; font-size:11px;" onclick="Karyawan.hapusAkun('${k.username}')">✕ Hapus</button>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${k.username}</code></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${fotoSrc}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc;" onerror="this.src='${this.AVATAR_DEFAULT}'">
                        <a href="javascript:void(0)" onclick="Karyawan.bukaDetailProfil('${k.username}')" style="font-weight: bold; color: #2196F3; text-decoration: none;">${k.nama}</a>
                    </div>
                </td>
                <td>${badgeRole}</td>
                <td style="text-align:center;">
                    <button class="btn btn-sm" style="background:#2196F3; color:white; padding:2px 6px; font-size:11px; margin-right:4px;" onclick="Karyawan.persiapanEdit('${k.username}')">📝 Edit</button>
                    ${hapusBtn}
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    bukaFormTambah() {
        if (!Auth.isOwner()) {
            alert("⛔ Akses ditolak! Hanya Owner utama yang dapat mendaftarkan akun baru.");
            return;
        }
        this.resetForm();
        this.tampilkanForm();
        document.getElementById('kUsername').disabled = false;
        document.getElementById('kUsername').focus();
    },

    async persiapanEdit(username) {
        if (!Auth.isOwner()) {
            alert("⛔ Akses ditolak! Hanya Owner utama yang dapat memodifikasi akun.");
            return;
        }

        const k = await DB.get("karyawan", username);
        if (!k) return;

        this.tampilkanForm();

        document.getElementById('judulFormKaryawan').textContent = `📝 Edit Akun @${username}`;
        document.getElementById('kUsername').value = k.username;
        document.getElementById('kUsername').disabled = true;
        document.getElementById('kNama').value = k.nama;
        document.getElementById('kLevel').value = k.role || k.level || 'Kasir';
        document.getElementById('kPassword').value = '';
        document.getElementById('kPassword').placeholder = "(Kosongkan jika sandi tidak diubah)";

        const previewBox = document.getElementById('previewFotoForm');
        const previewImg = document.getElementById('imgPreviewForm');
        if (k.foto && previewBox && previewImg) {
            previewImg.src = k.foto;
            previewBox.style.display = 'block';
        } else if (previewBox) {
            previewBox.style.display = 'none';
        }
    },

    tampilkanForm() {
        document.getElementById('panelFormKaryawan')?.classList.remove('hidden');
        document.getElementById('btnTambahKaryawan')?.classList.add('hidden');
    },

    sembunyikanForm() {
        document.getElementById('panelFormKaryawan')?.classList.add('hidden');
        document.getElementById('btnTambahKaryawan')?.classList.remove('hidden');
        this.resetForm();
    },

    resetForm() {
        document.getElementById('judulFormKaryawan').textContent = "Tambah Akun Baru";
        document.getElementById('kUsername').value = '';
        document.getElementById('kNama').value = '';
        document.getElementById('kPassword').value = '';
        document.getElementById('kPassword').placeholder = "Sandi masuk...";
        document.getElementById('kLevel').value = 'Kasir';  
        document.getElementById('kFoto').value = '';
        document.getElementById('previewFotoForm').style.display = 'none';
    },

    async simpanKaryawan() {
        const username = document.getElementById('kUsername').value.trim().toLowerCase();
        const nama = document.getElementById('kNama').value.trim();
        const password = document.getElementById('kPassword').value;
        const level = document.getElementById('kLevel').value;
        const fileEl = document.getElementById('kFoto');

        if (!username || !nama) {
            alert("❌ Username dan Nama Lengkap wajib diisi!");
            return;
        }

        const akunLama = await DB.get("karyawan", username);
        let passwordFinal = "";

        if (akunLama) {
            passwordFinal = !password ? akunLama.pass : btoa(password);
        } else {
            if (!password) {
                alert("❌ Untuk pembuatan akun baru, Password wajib diisi!");
                return;
            }
            passwordFinal = btoa(password);
        }

        let role = 'Kasir';
        if (level === 'admin' || level === 'Owner') role = 'Owner';
        else if (level === 'supervisor' || level === 'Supervisor') role = 'Supervisor';
        else if (level === 'kasir' || level === 'Kasir') role = 'Kasir';

        const prosesSimpan = async (fotoBase64) => {
            const dataKaryawan = {
                username: username,
                nama: nama,
                level: level,
                role: role,  
                pass: passwordFinal,
                foto: fotoBase64 || (akunLama ? akunLama.foto : null),
                updatedAt: Date.now()
            };

            try {
                // Simpan ke IndexedDB lokal
                await DB.put("karyawan", dataKaryawan);

                // Upload ke Firebase Cloud
                if (typeof firebase !== 'undefined' && firebase.apps.length) {
                    await firebase.database().ref('karyawan/' + username).set(dataKaryawan);
                    console.log("☁️ Karyawan synced to Firebase");
                }

                if (typeof Beep !== 'undefined' && Beep.ok) Beep.ok();
                this.sembunyikanForm();
                alert(`✅ Akun @${username} berhasil disimpan & disinkron ke cloud!`);
                this.loadList();
            } catch (err) {
                alert("❌ Gagal menyimpan: " + err);
                console.error(err);
            }
        };

        if (fileEl && fileEl.files && fileEl.files[0]) {
            this.kompresFoto(fileEl.files[0], 200, 200, 0.6, (fotoBase64) => {
                prosesSimpan(fotoBase64);
            });
        } else {
            prosesSimpan(null);
        }
    },

    kompresFoto(file, maxWidth, maxHeight, quality, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }}
                else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }}
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async hapusAkun(username) {
        if (!confirm(`⚠️ Hapus akun @${username} secara permanen?`)) return;

        try {
            // Hapus dari IndexedDB lokal
            await DB.delete("karyawan", username);

            // Hapus dari Firebase Cloud
            if (typeof firebase !== 'undefined' && firebase.apps.length) {
                await firebase.database().ref('karyawan/' + username).remove();
                console.log("☁️ Karyawan deleted from Firebase");
            }

            alert(`🗑️ Akun @${username} berhasil dihapus dari lokal & cloud.`);
            this.loadList();
        } catch (err) {
            alert("❌ Gagal menghapus: " + err.message);
            console.error(err);
        }
    },

    async bukaDetailProfil(username) {
        const k = await DB.get("karyawan", username);
        if (!k) return;

        const semuaTransaksi = await DB.getAll("transaksi");
        const semuaRequest = await DB.getAll("request_stok");

        const transaksiSaya = semuaTransaksi.filter(t => t.kasir === k.username);
        const requestSaya = semuaRequest.filter(r => r.kasir === k.username);

        document.getElementById('detFoto').src = k.foto || this.AVATAR_DEFAULT;
        document.getElementById('detNama').textContent = k.nama;
        document.getElementById('detUsername').textContent = `@${k.username}`;

        const roleDisplay = k.role || k.level || 'Kasir';
        let badgeHtml = `<span class="badge-info bg-success" style="padding:3px 8px; border-radius:4px; color:#fff; font-size:12px;">👤 Kasir Toko</span>`;
        if (roleDisplay === 'Owner' || k.level === 'admin' || k.level === 'owner') {
            badgeHtml = `<span class="badge-info bg-danger" style="padding:3px 8px; border-radius:4px; color:#fff; font-size:12px;">👑 Owner Toko</span>`;
        } else if (roleDisplay === 'Supervisor' || k.level === 'supervisor') {
            badgeHtml = `<span class="badge-info bg-warning" style="padding:3px 8px; border-radius:4px; color:#333; font-size:12px;">⚡ Kepala Toko</span>`;
        }
        document.getElementById('detBadge').innerHTML = badgeHtml;

        document.getElementById('detStatTrans').textContent = transaksiSaya.length;
        document.getElementById('detStatReq').textContent = requestSaya.length;

        const panelLog = document.getElementById('detRiwayatKerja');
        if (panelLog) {
            let logHtml = "";
            if (transaksiSaya.length === 0 && requestSaya.length === 0) {
                logHtml = `<div style="color:#999; text-align:center; padding:10px;">Belum ada jejak riwayat aktivitas.</div>`;
            } else {
                transaksiSaya.slice(0, 3).forEach(t => {
                    logHtml += `<div style="border-bottom:1px dashed #eee; padding:6px 0;">🛒 <small style="color:#888;">${new Date(t.tanggal).toLocaleDateString('id-ID')}</small><br>Melayani <strong>${t.noStruk}</strong> — <strong>Rp ${t.total.toLocaleString('id-ID')}</strong></div>`;
                });
                requestSaya.slice(0, 3).forEach(r => {
                    logHtml += `<div style="border-bottom:1px dashed #eee; padding:6px 0; background:#fffde7;">📤 <small style="color:#888;">${new Date(r.tgl_request).toLocaleDateString('id-ID')}</small><br>Request Stok <strong>${r.nama_barang}</strong> (${r.jumlah} pcs) - <span style="color:#2196F3; font-weight:bold;">${r.status.toUpperCase()}</span></div>`;
                });
            }
            panelLog.innerHTML = logHtml;
        }

        document.getElementById('areaKaryawanUtama').classList.add('hidden');
        document.getElementById('areaKaryawanDetail').classList.remove('hidden');
    },

    kembaliKeDaftar() {
        document.getElementById('areaKaryawanDetail').classList.add('hidden');
        document.getElementById('areaKaryawanUtama').classList.remove('hidden');
        this.loadList();
    }
};

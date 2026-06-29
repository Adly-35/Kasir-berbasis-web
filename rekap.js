// rekap.js — Modul Analisis Omset, Laba, dan Histori Penjualan — FIXED MATCH SQL

const Rekap = {
    kasAwal: 0,

    async load() {
        const data = await DB.get("kas_laci", "laci_utama");
        if (data) {
            this.kasAwal = data.kas_awal || 0;
            document.getElementById('inputKasAwal').value = this.kasAwal;
        }
        await this.loadHistoriTransaksi();
    },

    async aturKasAwal(nilai) {
        this.kasAwal = parseFloat(nilai) || 0;
        await DB.put("kas_laci", { id: "laci_utama", kas_awal: this.kasAwal, kas_akhir: this.kasAwal, diperbarui_oleh: "adly" });
        this.loadHistoriTransaksi();
    },

    async loadHistoriTransaksi() {
        const tbody = document.getElementById('bodyHistoriTransaksi');
        if (!tbody) return;
        tbody.innerHTML = '';

        const listTrans = await DB.getAll("transaksi");
        let omset = 0;
        let totalLaba = 0;

        if (listTrans.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Belum ada rekaman nota.</td></tr>';
            return;
        }

        for (let t of listTrans) {
            omset += t.total;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${t.noStruk}</code></td>
                <td>${new Date(t.tanggal).toLocaleTimeString('id-ID')}</td>
                <td>${t.kasir}</td>
                <td style="font-weight:bold;">Rp ${t.total.toLocaleString('id-ID')}</td>
                <td><span class="badge" style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-size:11px;">TUNAI</span></td>
            `;
            tbody.appendChild(tr);
        }

        document.getElementById('txtOmset').textContent = `Rp ${omset.toLocaleString('id-ID')}`;
        document.getElementById('txtKasLaci').textContent = `Rp ${(this.kasAwal + omset).toLocaleString('id-ID')}`;
        document.getElementById('txtLaba').textContent = `Rp ${(omset * 0.15).toLocaleString('id-ID')} (Est. 15%)`;
    }
};

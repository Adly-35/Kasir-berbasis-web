// utils.js — Helper & Formatter

const Utils = {
    formatRupiah(n) {
        return 'Rp. ' + (n || 0).toLocaleString('id-ID');
    },

    formatRupiahStruk(n) {
        return (n || 0).toLocaleString('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },

    formatTanggal(d) {
        return new Date(d).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatTimer(ms) {
        const menit = Math.floor(ms / 60000);
        const detik = Math.floor((ms % 60000) / 1000);
        return `${menit}:${detik.toString().padStart(2, '0')}`;
    },

    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    },

    encodePass(pass) {
        return btoa(pass);
    },

    debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }
};

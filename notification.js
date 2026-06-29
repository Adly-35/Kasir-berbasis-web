// notification.js — Modul Notifikasi Real-time & Task Alert — v1.0

const Notifikasi = {
    // Store for pending notifications
    queue: [],

    // Initialize notification system
    init() {
        this.startPolling();
        this.checkPendingTasks();
        console.log("🔔 Sistem Notifikasi aktif");
    },

    // Polling interval for real-time checks
    startPolling() {
        // Check every 10 seconds
        setInterval(() => {
            this.checkPendingTasks();
        }, 10000);

        // Also check on tab visibility change
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.checkPendingTasks();
            }
        });
    },

    // Check pending tasks based on role
    async checkPendingTasks() {
        if (!Auth.currentUser) return;

        const role = Auth.currentUser.role;

        try {
            if (role === 'Owner') {
                await this.checkOwnerTasks();
            } else if (role === 'Supervisor' || role === 'Kasir') {
                await this.checkStaffTasks();
            }
        } catch (e) {
            console.error("Notifikasi error:", e);
        }
    },

    // Tasks for Owner
    async checkOwnerTasks() {
        const requests = await DB.getAll("request_stok");
        const pendingCount = requests.filter(r => r.status === 'pending').length;
        const approvedCount = requests.filter(r => r.status === 'approved').length;

        // Update badge
        this.updateBadge('badgeNotifApp', pendingCount);

        // Full screen alert if there are pending requests
        if (pendingCount > 0) {
            this.showFullScreenAlert({
                title: '📋 Tugas Menunggu',
                message: `Ada ${pendingCount} permintaan restok yang perlu di-approve`,
                type: 'warning',
                action: () => bukaTab('tab-approval'),
                actionText: 'Lihat Approval'
            });
        }

        // Toast for approved items waiting pickup
        if (approvedCount > 0) {
            this.showToast({
                message: `${approvedCount} barang sudah di-approve menunggu diambil kasir`,
                type: 'info',
                duration: 5000
            });
        }
    },

    // Tasks for Kasir/Supervisor
    async checkStaffTasks() {
        const username = Auth.currentUser.username;
        const requests = await DB.getAll("request_stok");

        // My pending requests
        const myPending = requests.filter(r => r.kasir === username && r.status === 'pending').length;

        // My approved requests (ready to pickup)
        const myApproved = requests.filter(r => r.kasir === username && r.status === 'approved').length;

        // Low stock items in rak
        const products = await DB.getAll("produk");
        const lowStock = products.filter(p => (p.stokRak || 0) <= 5 && (p.stokRak || 0) > 0).length;
        const emptyStock = products.filter(p => (p.stokRak || 0) === 0).length;

        // Update badges
        this.updateBadge('badgeNotifReq', myApproved);

        // Full screen alert for approved items ready to pickup
        if (myApproved > 0) {
            this.showFullScreenAlert({
                title: '📦 Barang Siap Diambil!',
                message: `${myApproved} permintaan restok sudah di-approve oleh Owner. Silakan ambil barang di gudang.`,
                type: 'success',
                action: () => bukaTab('tab-request'),
                actionText: 'Ambil Barang'
            });
        }

        // Toast for low stock
        if (emptyStock > 0) {
            this.showToast({
                message: `⚠️ ${emptyStock} barang di rak HABIS! Segera request restok.`,
                type: 'error',
                duration: 8000
            });
        } else if (lowStock > 0) {
            this.showToast({
                message: `⚠️ ${lowStock} barang stok menipis (≤5 pcs)`,
                type: 'warning',
                duration: 6000
            });
        }

        // Toast for pending requests
        if (myPending > 0) {
            this.showToast({
                message: `⏳ ${myPending} request masih menunggu approval Owner`,
                type: 'info',
                duration: 4000
            });
        }
    },

    // Update badge count on nav button
    updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;

        // Also update dot indicator
        const dotId = badgeId.replace('badge', 'dot');
        const dot = document.getElementById(dotId);

        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
            badge.style.animation = 'pulse 1.5s infinite';

            // Show dot indicator
            if (dot) {
                dot.classList.remove('hidden');
                dot.style.animation = 'pulse 1.5s infinite';
            }

            // Add alert class to parent button
            const btn = badge.closest('.tab-btn');
            if (btn) btn.classList.add('has-alert');
        } else {
            badge.classList.add('hidden');
            badge.style.animation = 'none';

            if (dot) {
                dot.classList.add('hidden');
                dot.style.animation = 'none';
            }

            const btn = badge.closest('.tab-btn');
            if (btn) btn.classList.remove('has-alert');
        }
    },

    // Show full screen alert overlay
    showFullScreenAlert({ title, message, type = 'info', action, actionText = 'OK' }) {
        // Check if already showing this alert
        const existing = document.getElementById('fullscreenAlert');
        if (existing) {
            // Update existing instead of creating new
            const titleEl = existing.querySelector('.fs-alert-title');
            const msgEl = existing.querySelector('.fs-alert-message');
            if (titleEl) titleEl.textContent = title;
            if (msgEl) msgEl.textContent = message;
            return;
        }

        const colors = {
            info: { bg: '#2196F3', icon: 'ℹ️' },
            warning: { bg: '#FF9800', icon: '⚠️' },
            error: { bg: '#f44336', icon: '❌' },
            success: { bg: '#4CAF50', icon: '✅' }
        };

        const color = colors[type] || colors.info;

        const overlay = document.createElement('div');
        overlay.id = 'fullscreenAlert';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            animation: fadeIn 0.3s ease;
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                border-radius: 16px;
                padding: 30px;
                max-width: 90%;
                width: 380px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                animation: slideUp 0.4s ease;
            ">
                <div style="
                    width: 70px; height: 70px;
                    background: ${color.bg}20;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                    font-size: 36px;
                ">${color.icon}</div>
                <h2 class="fs-alert-title" style="margin: 0 0 12px; color: #333; font-size: 22px;">${title}</h2>
                <p class="fs-alert-message" style="margin: 0 0 25px; color: #666; font-size: 15px; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 10px; flex-direction: column;">
                    ${action ? `<button onclick="Notifikasi.closeFullScreen(); ${action.toString().replace(/"/g, '&quot;')}" style="
                        background: ${color.bg};
                        color: white;
                        border: none;
                        padding: 14px 24px;
                        border-radius: 8px;
                        font-size: 15px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">${actionText}</button>` : ''}
                    <button onclick="Notifikasi.closeFullScreen()" style="
                        background: #f5f5f5;
                        color: #666;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                        width: 100%;
                    ">Nanti Saja</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Auto-play sound
        if (typeof Beep !== 'undefined' && Beep.alert) {
            Beep.alert();
        }
    },

    // Close full screen alert
    closeFullScreen() {
        const overlay = document.getElementById('fullscreenAlert');
        if (overlay) {
            overlay.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => overlay.remove(), 300);
        }
    },

    // Show toast notification
    showToast({ message, type = 'info', duration = 5000 }) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const colors = {
            info: { bg: '#2196F3', icon: 'ℹ️' },
            warning: { bg: '#FF9800', icon: '⚠️' },
            error: { bg: '#f44336', icon: '❌' },
            success: { bg: '#4CAF50', icon: '✅' }
        };

        const color = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${color.bg};
            color: white;
            padding: 14px 18px;
            border-radius: 10px;
            margin-bottom: 10px;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            animation: slideInRight 0.4s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            max-width: 320px;
            word-break: break-word;
        `;

        toast.innerHTML = `
            <span style="font-size: 20px;">${color.icon}</span>
            <span style="flex: 1;">${message}</span>
            <button onclick="this.parentElement.remove()" style="
                background: rgba(255,255,255,0.3);
                border: none;
                color: white;
                width: 24px; height: 24px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">✕</button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

// CSS animations for notifications
const notificationStyles = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
    @keyframes slideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = notificationStyles;
document.head.appendChild(styleEl);

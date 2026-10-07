/**
 * 📊 داشبورد ادمین — مدیریت مشتری‌ها
 */

let allGyms = [];
let currentFilter = "all";

// ═══════════════════════════════════════════════════════
// راه‌اندازی
// ═══════════════════════════════════════════════════════
async function initDashboard() {
    const session = await checkAdminSession();
    if (!session) {
        window.location.href = CONFIG.LOGIN_PAGE;
        return;
    }

    const nameEl = document.getElementById("admin-name");
    if (nameEl) nameEl.textContent = session.full_name;

    await loadGyms();
}

// ═══════════════════════════════════════════════════════
// بارگذاری مشتری‌ها
// ═══════════════════════════════════════════════════════
async function loadGyms() {
    showLoading(true);

    try {
        const client = getSupabase();
        let gyms = [];

        // ─── مستقیم از جدول gyms (چون RLS برای ادمین همه رو میده) ───
        const { data, error } = await client
            .from("gyms")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        gyms = data || [];
        console.log("✅ مشتری‌ها لود شدند:", gyms.length);

        allGyms = gyms;
        updateStats();
        renderGyms();

    } catch (e) {
        console.error("❌ خطا در بارگذاری:", e);
        showError("خطا: " + e.message);
    } finally {
        showLoading(false);
    }
}

// ═══════════════════════════════════════════════════════
// آمار
// ═══════════════════════════════════════════════════════
function updateStats() {
    const total = allGyms.length;
    const active = allGyms.filter(g => g.is_active && !g.is_blocked).length;
    const trial = allGyms.filter(g => g.subscription_plan === "trial").length;
    const expired = allGyms.filter(g => {
        if (!g.subscription_end) return false;
        return new Date(g.subscription_end) < new Date();
    }).length;

    const el = (id) => document.getElementById(id);
    if (el("stat-total")) el("stat-total").textContent = total;
    if (el("stat-active")) el("stat-active").textContent = active;
    if (el("stat-trial")) el("stat-trial").textContent = trial;
    if (el("stat-expired")) el("stat-expired").textContent = expired;
}

// ═══════════════════════════════════════════════════════
// رندر جدول
// ═══════════════════════════════════════════════════════
function renderGyms() {
    const tbody = document.getElementById("gyms-tbody");
    if (!tbody) return;

    const search = (document.getElementById("search-input")?.value || "").toLowerCase();

    let filtered = allGyms;

    if (currentFilter === "active") {
        filtered = filtered.filter(g => g.is_active && !g.is_blocked);
    } else if (currentFilter === "trial") {
        filtered = filtered.filter(g => g.subscription_plan === "trial");
    } else if (currentFilter === "expired") {
        filtered = filtered.filter(g => {
            if (!g.subscription_end) return false;
            return new Date(g.subscription_end) < new Date();
        });
    }

    if (search) {
        filtered = filtered.filter(g =>
            (g.name || "").toLowerCase().includes(search) ||
            (g.owner_name || "").toLowerCase().includes(search) ||
            (g.phone || "").includes(search) ||
            (g.customer_code || "").toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty">هیچ مشتری‌ای پیدا نشد</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(g => {
        const status = getStatusBadge(g);
        const created = formatDate(g.created_at);
        const plan = g.subscription_plan || "trial";
        const phone = g.phone || "-";
        const owner = g.owner_name || "-";
        const customerCode = g.customer_code || "-";
        const actions = renderActions(g);

        return `
            <tr ${g.is_blocked ? 'style="opacity: 0.6;"' : ''}>
                <td><code style="color: #f39c12; font-size: 11px;">${escapeHtml(customerCode)}</code></td>
                <td><strong>${escapeHtml(g.name || "بی‌نام")}</strong></td>
                <td>${escapeHtml(owner)}</td>
                <td dir="ltr" style="text-align: right;">${escapeHtml(phone)}</td>
                <td>${plan}</td>
                <td>${formatRemaining(g)}</td>
                <td>${created}</td>
                <td>${status}</td>
                <td class="actions-cell">${actions}</td>
            </tr>
        `;
    }).join("");
}

// ═══════════════════════════════════════════════════════
// دکمه‌های عملیات
// ═══════════════════════════════════════════════════════
function renderActions(g) {
    const isBlocked = g.is_blocked === true;
    const isArchived = g.archived_at !== null && g.archived_at !== undefined;
    const isDeleted = g.deleted_at !== null && g.deleted_at !== undefined;

    if (isDeleted) {
        return `<button class="btn-action btn-restore" onclick="restoreGym('${g.id}')" title="بازگردانی">♻️</button>`;
    }

    if (isArchived) {
        return `<button class="btn-action btn-restore" onclick="restoreGym('${g.id}')" title="خروج از آرشیو">♻️</button>`;
    }

    if (isBlocked) {
        return `
            <button class="btn-action btn-unblock" onclick="unblockGym('${g.id}')" title="رفع مسدودی">🔓</button>
            <button class="btn-action btn-delete" onclick="deleteGym('${g.id}')" title="حذف">🗑</button>
        `;
    }

    return `
        <button class="btn-action btn-archive" onclick="archiveGym('${g.id}')" title="آرشیو">📦</button>
        <button class="btn-action btn-block" onclick="blockGym('${g.id}')" title="مسدود کردن">🚫</button>
        <button class="btn-action btn-delete" onclick="deleteGym('${g.id}')" title="حذف">🗑</button>
    `;
}

// ═══════════════════════════════════════════════════════
// Badge وضعیت
// ═══════════════════════════════════════════════════════
function getStatusBadge(g) {
    if (g.is_blocked) return '<span class="badge badge-red">🚫 مسدود</span>';
    if (g.deleted_at) return '<span class="badge badge-gray">🗑 حذف</span>';
    if (g.archived_at) return '<span class="badge badge-gray">📦 آرشیو</span>';
    if (!g.is_active) return '<span class="badge badge-gray">غیرفعال</span>';
    if (g.subscription_end && new Date(g.subscription_end) < new Date()) {
        return '<span class="badge badge-red">منقضی</span>';
    }
    if (g.subscription_plan === "trial") {
        return '<span class="badge badge-orange">آزمایشی</span>';
    }
    return '<span class="badge badge-green">فعال</span>';
}

// ═══════════════════════════════════════════════════════
// نمایش اعتبار
// ═══════════════════════════════════════════════════════
function formatRemaining(g) {
    const days = getRemainingDays(g);
    if (days === null) return '<span style="color:#95a5a6;">—</span>';
    if (days < 0) return '<span style="color:#e74c3c; font-weight:bold;">منقضی</span>';
    if (days === 0) return '<span style="color:#e74c3c; font-weight:bold;">امروز</span>';
    if (days <= 7) return `<span style="color:#f39c12; font-weight:bold;">${days} روز ⚠️</span>`;
    if (days <= 30) return `<span style="color:#3498db; font-weight:bold;">${days} روز</span>`;
    return `<span style="color:#2ecc71; font-weight:bold;">${days} روز</span>`;
}

function getRemainingDays(g) {
    if (!g.subscription_end) return null;
    const end = new Date(g.subscription_end);
    const now = new Date();
    const diffMs = end - now;
    if (diffMs < 0) return -1;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════
// فیلتر
// ═══════════════════════════════════════════════════════
function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    renderGyms();
}

// ═══════════════════════════════════════════════════════
// ابزارها
// ═══════════════════════════════════════════════════════
function formatDate(iso) {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleDateString("fa-IR");
    } catch {
        return "-";
    }
}

function escapeHtml(s) {
    if (!s) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function showLoading(show) {
    const el = document.getElementById("loading");
    if (el) el.style.display = show ? "block" : "none";
}

function showError(msg) {
    const el = document.getElementById("error-msg");
    if (el) {
        el.textContent = msg;
        el.style.display = "block";
        setTimeout(() => { el.style.display = "none"; }, 5000);
    }
}

// ═══════════════════════════════════════════════════════
// شروع
// ═══════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", initDashboard);

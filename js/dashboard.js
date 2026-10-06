/**
 * 📊 داشبورد ادمین — مدیریت مشتری‌ها
 */

let allGyms = [];
let currentFilter = "all";

// ─────────────────────────────────────────────
// راه‌اندازی
// ─────────────────────────────────────────────
async function initDashboard() {
    const session = await checkAdminSession();
    if (!session) {
        window.location.href = CONFIG.LOGIN_PAGE;
        return;
    }

    // نمایش نام ادمین
    const nameEl = document.getElementById("admin-name");
    if (nameEl) nameEl.textContent = session.full_name;

    await loadGyms();
}

// ─────────────────────────────────────────────
// بارگذاری مشتری‌ها
// ─────────────────────────────────────────────
async function loadGyms() {
    showLoading(true);

    try {
        const client = getSupabase();
        const { data, error } = await client
            .from("gyms")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        allGyms = data || [];

        updateStats();
        renderGyms();
    } catch (e) {
        console.error("خطا در بارگذاری:", e);
        showError("خطا در بارگذاری مشتری‌ها: " + e.message);
    } finally {
        showLoading(false);
    }
}

// ─────────────────────────────────────────────
// آمار
// ─────────────────────────────────────────────
function updateStats() {
    const total = allGyms.length;
    const active = allGyms.filter(g => g.is_active).length;
    const trial = allGyms.filter(g => g.subscription_plan === "trial").length;
    const expired = allGyms.filter(g => {
        if (!g.subscription_end) return false;
        return new Date(g.subscription_end) < new Date();
    }).length;

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-active").textContent = active;
    document.getElementById("stat-trial").textContent = trial;
    document.getElementById("stat-expired").textContent = expired;
}

// ─────────────────────────────────────────────
// رندر جدول
// ─────────────────────────────────────────────
function renderGyms() {
    const tbody = document.getElementById("gyms-tbody");
    const search = (document.getElementById("search-input")?.value || "").toLowerCase();

    let filtered = allGyms;

    if (currentFilter === "active") {
        filtered = filtered.filter(g => g.is_active);
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
            (g.phone || "").includes(search)
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">هیچ مشتری‌ای پیدا نشد</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(g => {
        const status = getStatusBadge(g);
        const created = formatDate(g.created_at);
        const plan = g.subscription_plan || "trial";
        const phone = g.phone || "-";
        const owner = g.owner_name || "-";

        return `
            <tr>
                <td><strong>${escapeHtml(g.name || "بی‌نام")}</strong></td>
                <td>${escapeHtml(owner)}</td>
                <td dir="ltr" style="text-align: right;">${escapeHtml(phone)}</td>
                <td>${plan}</td>
                <td>${created}</td>
                <td>${status}</td>
            </tr>
        `;
    }).join("");
}

function getStatusBadge(g) {
    if (!g.is_active) {
        return '<span class="badge badge-gray">غیرفعال</span>';
    }
    if (g.subscription_end && new Date(g.subscription_end) < new Date()) {
        return '<span class="badge badge-red">منقضی</span>';
    }
    if (g.subscription_plan === "trial") {
        return '<span class="badge badge-orange">آزمایشی</span>';
    }
    return '<span class="badge badge-green">فعال</span>';
}

// ─────────────────────────────────────────────
// فیلتر
// ─────────────────────────────────────────────
function setFilter(filter) {
    currentFilter = filter;

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    renderGyms();
}

// ─────────────────────────────────────────────
// ابزارها
// ─────────────────────────────────────────────
function formatDate(iso) {
    if (!iso) return "-";
    try {
        const d = new Date(iso);
        return d.toLocaleDateString("fa-IR");
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

// ─────────────────────────────────────────────
// شروع
// ─────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", initDashboard);

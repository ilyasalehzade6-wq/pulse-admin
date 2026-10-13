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

    // 👁️ دکمه‌ی مشاهده‌ی نام کاربری + رمز (فقط خواندنی)
    const viewBtn = `<button class="btn-action btn-view" onclick="viewGymCredentials('${g.id}', '${escapeHtml(g.name || "")}')" title="مشاهده نام کاربری و رمز" style="background: rgba(52, 152, 219, 0.15); color: #3498db;">👁️</button>`;

    // این دکمه در همه‌ی حالت‌ها نمایش داده می‌شه
    const withView = (others) => viewBtn + others;

    if (isDeleted) {
        return withView(`<button class="btn-action btn-restore" onclick="restoreGym('${g.id}')" title="بازگردانی">♻️</button>`);
    }

    if (isArchived) {
        return withView(`<button class="btn-action btn-restore" onclick="restoreGym('${g.id}')" title="خروج از آرشیو">♻️</button>`);
    }

    if (isBlocked) {
        return withView(`
            <button class="btn-action btn-unblock" onclick="unblockGym('${g.id}')" title="رفع مسدودی">🔓</button>
            <button class="btn-action btn-delete" onclick="deleteGym('${g.id}')" title="حذف">🗑</button>
        `);
    }

    // ✅ حالت عادی — با دکمه‌ی مشاهده
    return withView(`
        <button class="btn-action btn-archive" onclick="archiveGym('${g.id}')" title="آرشیو">📦</button>
        <button class="btn-action btn-block" onclick="blockGym('${g.id}')" title="مسدود کردن">🚫</button>
        <button class="btn-action btn-delete" onclick="deleteGym('${g.id}')" title="حذف">🗑</button>
    `);
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
    return Math.ceil(diffMs / 86400000);
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

// ═══════════════════════════════════════════════════════
//  👁️ مشاهده‌ی اطلاعات مشتری (فقط خواندنی)
//  نام کاربری + رمز عبور فعلی
// ═══════════════════════════════════════════════════════
async function viewGymCredentials(gymId, gymName) {
    try {
        const client = getSupabase();

        // نمایش loading
        const loading = document.createElement("div");
        loading.id = "cred-loading";
        loading.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.85); display:flex; align-items:center;
            justify-content:center; z-index:9999; direction:rtl;
        `;
        loading.innerHTML = `
            <div style="background:#1a1a2e; padding:30px; border-radius:16px; color:#e8e8f0; text-align:center;">
                <div style="font-size:32px; margin-bottom:15px;">⏳</div>
                <div>در حال دریافت اطلاعات...</div>
            </div>
        `;
        document.body.appendChild(loading);

        // RPC
        const { data, error } = await client.rpc("admin_get_gym_credentials", {
            p_gym_id: gymId,
        });

        loading.remove();

        if (error) throw error;
        if (!data?.success) {
            alert("❌ " + (data?.error || "خطا"));
            return;
        }

        // ─── نمایش modal ───
        const modal = document.createElement("div");
        modal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.88); display:flex; align-items:center;
            justify-content:center; z-index:9999; padding:20px; direction:rtl;
        `;

        const hasPassword = !!data.password;
        const hasUsername = !!data.username;

        modal.innerHTML = `
            <div style="background:#1a1a2e; padding:30px; border-radius:16px; max-width:540px; width:100%; color:#e8e8f0;">

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="color:#f1c40f; margin:0;">🔐 اطلاعات ورود مشتری</h3>
                    <button onclick="this.closest('div[style*=fixed]').remove();" style="background:transparent; border:none; color:#95a5a6; font-size:20px; cursor:pointer;">✖</button>
                </div>

                <div style="background: rgba(241,196,15,0.08); padding:12px; border-radius:10px; margin-bottom:15px; border-right:3px solid #f1c40f;">
                    <div style="color:#95a5a6; font-size:11px; margin-bottom:3px;">🏢 نام مجموعه</div>
                    <div style="color:#f1c40f; font-size:16px; font-weight:bold;">${escapeHtml(data.gym?.name || gymName)}</div>
                </div>

                <div style="background: rgba(52,152,219,0.08); padding:15px; border-radius:10px; margin-bottom:12px; border-right:3px solid #3498db;">
                    <div style="color:#95a5a6; font-size:11px; margin-bottom:6px;">👤 نام کاربری</div>
                    ${hasUsername ? `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <code style="background:#0f0f1a; padding:10px 14px; border-radius:6px; direction:ltr; font-size:18px; letter-spacing:1px; color:#3498db; flex:1; text-align:center; user-select:all;">${escapeHtml(data.username)}</code>
                            <button onclick="copyText('${escapeHtml(data.username)}')" style="background:#3498db; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:13px;">📋</button>
                        </div>
                    ` : `
                        <div style="color:#95a5a6; text-align:center; padding:10px;">ذخیره نشده</div>
                    `}
                </div>

                <div style="background: rgba(46,204,113,0.08); padding:15px; border-radius:10px; margin-bottom:15px; border-right:3px solid #2ecc71;">
                    <div style="color:#95a5a6; font-size:11px; margin-bottom:6px;">🔒 رمز عبور</div>
                    ${hasPassword ? `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                            <code id="pwd-display" style="background:#0f0f1a; padding:10px 14px; border-radius:6px; direction:ltr; font-size:18px; letter-spacing:2px; color:#2ecc71; flex:1; text-align:center; user-select:all;">${escapeHtml(data.password)}</code>
                            <button onclick="copyText('${escapeHtml(data.password)}')" style="background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-size:13px;">📋</button>
                        </div>
                    ` : `
                        <div style="color:#f39c12; text-align:center; padding:10px; font-size:13px;">
                            ⚠️ رمز ذخیره نشده<br>
                            <span style="font-size:11px; color:#95a5a6;">(مشتری قبل از این قابلیت ثبت‌نام کرده)</span>
                        </div>
                    `}
                </div>

                <div style="background: rgba(52,152,219,0.05); padding:12px; border-radius:8px; margin-bottom:15px;">
                    <div style="color:#95a5a6; font-size:11px; margin-bottom:3px;">📱 شماره موبایل</div>
                    <code style="direction:ltr; color:#e8e8f0;">${escapeHtml(data.gym?.phone || "-")}</code>
                </div>

                <div style="display:flex; gap:10px;">
                    <button onclick="copyText('باشگاه: ${escapeHtml(data.gym?.name || "")}\\nنام کاربری: ${escapeHtml(data.username || "")}\\nرمز: ${escapeHtml(data.password || "")}\\nشماره: ${escapeHtml(data.gym?.phone || "")}'); this.textContent='✅ کپی شد'; setTimeout(()=>this.textContent='📋 کپی همه',1500);" style="flex:2; background:#f1c40f; color:#0f0f1a; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:bold; font-size:14px;">📋 کپی همه</button>
                    <button onclick="this.closest('div[style*=fixed]').remove();" style="flex:1; background:transparent; color:#95a5a6; border:1px solid #95a5a6; padding:12px; border-radius:10px; cursor:pointer; font-size:14px;">بستن</button>
                </div>

                <div style="text-align:center; margin-top:15px; color:#95a5a6; font-size:11px;">
                    🔒 فقط خواندنی — برای تغییر از تب «رمزها» استفاده کن
                </div>

            </div>
        `;
        document.body.appendChild(modal);

        // بستن با کلیک بیرون
        modal.addEventListener("click", (e) => {
            if (e.target === modal) modal.remove();
        });

    } catch (e) {
        console.error(e);
        alert("❌ خطا: " + e.message);
    }
}

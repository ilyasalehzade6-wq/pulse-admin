/**
 * 🔐 پنل ادمین — مدیریت رمزهای مشتری‌ها
 */

let allPasswordResets = [];
let currentPwdFilter = "all";
let currentSearchResults = [];

// ═══════════════════════════════════════════════════════
//  نرمال‌سازی اعداد فارسی/عربی به انگلیسی
// ═══════════════════════════════════════════════════════
function normalizeDigits(str) {
    if (!str) return "";
    return String(str)
        .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

// ═══════════════════════════════════════════════════════
//  آمار vault
// ═══════════════════════════════════════════════════════
async function updateVaultStats() {
    try {
        const client = getSupabase();

        const { count, error } = await client
            .from("customer_vault")
            .select("*", { count: "exact", head: true });

        if (!error && document.getElementById("pwd-vault-total")) {
            document.getElementById("pwd-vault-total").textContent = count || 0;
        }
    } catch (e) {
        console.warn("updateVaultStats:", e);
    }
}

// ═══════════════════════════════════════════════════════
//  بارگذاری درخواست‌های فراموشی
// ═══════════════════════════════════════════════════════
async function loadPasswordResets() {
    const loading = document.getElementById("pwd-loading");
    const err = document.getElementById("pwd-error");
    const list = document.getElementById("pwd-requests-list");

    loading.style.display = "block";
    err.style.display = "none";
    list.innerHTML = "";

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_list_password_resets");

        if (error) throw error;

        if (!data?.success) {
            throw new Error(data?.error || "خطا در دریافت لیست");
        }

        allPasswordResets = data.requests || [];

        // آمار
        const pending = allPasswordResets.filter(r => r.status === "pending").length;
        const resolved = allPasswordResets.filter(r => r.status === "resolved").length;
        document.getElementById("pwd-pending").textContent = pending;
        document.getElementById("pwd-resolved").textContent = resolved;

        renderPasswordResets();

    } catch (e) {
        console.error(e);
        err.style.display = "block";
        err.textContent = "⚠️ " + (e.message || "خطا در بارگذاری");
    } finally {
        loading.style.display = "none";
    }
}

// ═══════════════════════════════════════════════════════
//  فیلتر
// ═══════════════════════════════════════════════════════
function setPwdFilter(filter) {
    currentPwdFilter = filter;
    document.querySelectorAll(".pwd-filter").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filter === filter);
    });
    renderPasswordResets();
}

// ═══════════════════════════════════════════════════════
//  نمایش لیست
// ═══════════════════════════════════════════════════════
function renderPasswordResets() {
    const list = document.getElementById("pwd-requests-list");

    let filtered = allPasswordResets;
    if (currentPwdFilter !== "all") {
        filtered = filtered.filter(r => r.status === currentPwdFilter);
    }

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 40px; color:#95a5a6;">
                <div style="font-size: 48px; margin-bottom: 15px;">📭</div>
                <p>هیچ درخواستی وجود ندارد</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(req => renderResetCard(req)).join("");
}

function renderResetCard(req) {
    const isPending = req.status === "pending";
    const statusBadge = isPending
        ? '<span class="badge badge-orange">⏳ در انتظار</span>'
        : '<span class="badge badge-green">✅ حل شده</span>';

    const requestedDate = req.requested_at
        ? new Date(req.requested_at).toLocaleString("fa-IR")
        : "-";

    const resolvedDate = req.resolved_at
        ? new Date(req.resolved_at).toLocaleString("fa-IR")
        : null;

    const newPwdSection = req.new_password
        ? `<div style="background: rgba(46,204,113,0.1); padding: 10px; border-radius: 8px; margin-top: 10px;">
              <strong>🔑 رمز جدید:</strong>
              <code style="background:#0f0f1a; padding: 4px 10px; border-radius: 5px; direction: ltr; display: inline-block; margin-right: 8px;">${escapeHtml(req.new_password)}</code>
              <button class="btn-ghost" onclick="copyText('${escapeHtml(req.new_password)}')" style="margin-right: 8px;">📋 کپی</button>
           </div>`
        : "";

    const actions = isPending
        ? `<button class="btn-primary" onclick="openResetDialog('${req.gym_id}', '${escapeHtml(req.gym_name || "")}', '${req.id}')">🔄 تولید رمز جدید</button>
           <button class="btn-ghost" onclick="viewGymPassword('${req.gym_id}', '${escapeHtml(req.gym_name || "")}')">👁️ مشاهده رمز فعلی</button>`
        : "";

    return `
        <div class="request-card" style="background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-right: 4px solid ${isPending ? '#f39c12' : '#2ecc71'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 17px; color:#f1c40f;">🏢 ${escapeHtml(req.gym_name || "نامشخص")}</strong>
                ${statusBadge}
            </div>
            <div style="color:#95a5a6; font-size: 14px; line-height: 1.8;">
                <div>📱 شماره: <code style="direction:ltr; display:inline-block;">${escapeHtml(req.phone || "-")}</code></div>
                <div>🕐 زمان درخواست: ${requestedDate}</div>
                ${resolvedDate ? `<div>✅ حل شده در: ${resolvedDate}</div>` : ""}
            </div>
            ${newPwdSection}
            ${actions ? `<div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">${actions}</div>` : ""}
        </div>
    `;
}

// ═══════════════════════════════════════════════════════
//  مشاهده‌ی رمز فعلی
// ═══════════════════════════════════════════════════════
async function viewGymPassword(gymId, gymName) {
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_get_gym_password", {
            p_gym_id: gymId,
        });

        if (error) throw error;

        if (!data?.success) {
            alert("❌ " + (data?.error || "خطا"));
            return;
        }

        if (!data.password) {
            alert("⚠️ " + (data.message || "رمز ذخیره نشده"));
            return;
        }

        // نمایش modal
        const modal = document.createElement("div");
        modal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.85); display:flex; align-items:center;
            justify-content:center; z-index:9999; padding:20px; direction:rtl;
        `;
        modal.innerHTML = `
            <div style="background:#1a1a2e; padding:30px; border-radius:16px; max-width:500px; width:100%; color:#e8e8f0;">
                <h3 style="color:#f1c40f; margin:0 0 20px 0;">🔐 رمز باشگاه ${escapeHtml(gymName)}</h3>
                <div style="background:#0f0f1a; padding:20px; border-radius:10px; margin-bottom:20px; text-align:center;">
                    <div style="font-size: 32px; font-family: monospace; direction: ltr; letter-spacing: 3px; color:#2ecc71; user-select: all;">${escapeHtml(data.password)}</div>
                </div>
                <div style="display:flex; gap:10px; justify-content:center;">
                    <button class="btn-primary" onclick="copyText('${escapeHtml(data.password)}'); this.parentElement.parentElement.parentElement.remove();">📋 کپی و بستن</button>
                    <button class="btn-ghost" onclick="this.parentElement.parentElement.parentElement.remove();">بستن</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (e) {
        console.error(e);
        alert("❌ خطا: " + e.message);
    }
}

// ═══════════════════════════════════════════════════════
//  باز کردن دیالوگ ریست
// ═══════════════════════════════════════════════════════
function openResetDialog(gymId, gymName, requestId) {
    const modal = document.createElement("div");
    modal.id = "reset-modal";
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.85); display:flex; align-items:center;
        justify-content:center; z-index:9999; padding:20px; direction:rtl;
    `;
    modal.innerHTML = `
        <div style="background:#1a1a2e; padding:30px; border-radius:16px; max-width:500px; width:100%; color:#e8e8f0;">
            <h3 style="color:#f1c40f; margin:0 0 20px 0;">🔄 تولید رمز جدید برای ${escapeHtml(gymName)}</h3>
            <p style="color:#95a5a6; margin-bottom:15px; font-size: 13px;">
                رمز جدید ساخته می‌شود و در Supabase اعمال می‌گردد.
                همچنین در vault ذخیره می‌شود تا بعداً قابل مشاهده باشد.
            </p>
            <input type="text" id="new-pwd-input" placeholder="مثلاً: Pulse1234"
                   style="width:100%; padding:14px; font-family: monospace; font-size: 18px;
                          direction:ltr; text-align:center; background:#0f0f1a; color:#2ecc71;
                          border:1px solid #34495e; border-radius:10px; margin-bottom:15px; letter-spacing:2px;">
            <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
                <button class="btn-ghost" onclick="document.getElementById('new-pwd-input').value = generateRandomPassword();" style="flex:1;">🎲 تصادفی</button>
                <button class="btn-ghost" onclick="document.getElementById('new-pwd-input').value = 'Pulse' + Math.floor(1000 + Math.random()*9000);" style="flex:1;">⚡ سریع</button>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-primary" onclick="doResetPassword('${gymId}', '${requestId}')" style="flex:2;">✅ اعمال رمز</button>
                <button class="btn-ghost" onclick="document.getElementById('reset-modal').remove()" style="flex:1;">انصراف</button>
            </div>
            <div id="reset-error" style="color:#e74c3c; margin-top:15px; display:none;"></div>
        </div>
    `;
    document.body.appendChild(modal);
    setTimeout(() => document.getElementById("new-pwd-input").focus(), 100);
}

function generateRandomPassword() {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
        pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
}

// ═══════════════════════════════════════════════════════
//  اجرای ریست
// ═══════════════════════════════════════════════════════
async function doResetPassword(gymId, requestId) {
    const input = document.getElementById("new-pwd-input");
    const errBox = document.getElementById("reset-error");
    const newPwd = input.value.trim();

    if (newPwd.length < 6) {
        errBox.style.display = "block";
        errBox.textContent = "⚠️ رمز باید حداقل ۶ کاراکتر باشد";
        return;
    }

    errBox.style.display = "none";
    input.disabled = true;

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_reset_gym_password", {
            p_gym_id: gymId,
            p_new_password: newPwd,
            p_request_id: requestId,
        });

        if (error) throw error;

        if (!data?.success) {
            throw new Error(data?.error || "خطا در ریست");
        }

        // بستن modal
        document.getElementById("reset-modal").remove();

        // نمایش رمز جدید به ادمین
        showPasswordResult(newPwd, data.phone || data.email);

        // رفرش لیست
        loadPasswordResets();

    } catch (e) {
        console.error(e);
        errBox.style.display = "block";
        errBox.textContent = "❌ " + (e.message || "خطا");
        input.disabled = false;
    }
}

function showPasswordResult(newPwd, contact) {
    const modal = document.createElement("div");
    modal.style.cssText = `
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.85); display:flex; align-items:center;
        justify-content:center; z-index:9999; padding:20px; direction:rtl;
    `;
    modal.innerHTML = `
        <div style="background:#1a1a2e; padding:30px; border-radius:16px; max-width:500px; width:100%; color:#e8e8f0;">
            <h3 style="color:#2ecc71; margin:0 0 20px 0;">✅ رمز با موفقیت تغییر کرد!</h3>
            <div style="background:#0f0f1a; padding:20px; border-radius:10px; margin-bottom:20px; text-align:center;">
                <div style="font-size: 32px; font-family: monospace; direction: ltr; letter-spacing: 3px; color:#2ecc71; user-select: all;">${escapeHtml(newPwd)}</div>
            </div>
            <div style="background: rgba(241,196,15,0.1); border-right: 4px solid #f1c40f; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong>📌 این رمز را به مشتری اطلاع بده:</strong><br>
                <span style="color:#95a5a6; font-size: 13px;">از طریق: روبیکا / تماس تلفنی</span>
            </div>
            <div style="display:flex; gap:10px;">
                <button class="btn-primary" onclick="copyText('رمز: ${escapeHtml(newPwd)}\\nتماس: ${escapeHtml(contact || "")}'); this.parentElement.parentElement.remove();" style="flex:2;">📋 کپی همه</button>
                <button class="btn-ghost" onclick="this.parentElement.parentElement.parentElement.remove();" style="flex:1;">بستن</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ═══════════════════════════════════════════════════════
//  جستجوی مشتری
// ═══════════════════════════════════════════════════════
async function searchGymsForPassword() {
    const input = document.getElementById("pwd-search-input");
    const query = normalizeDigits(input.value.trim());
    const errBox = document.getElementById("pwd-search-error");
    const results = document.getElementById("pwd-search-results");

    if (!query) {
        errBox.style.display = "block";
        errBox.textContent = "⚠️ عبارت جستجو را وارد کن";
        return;
    }

    errBox.style.display = "none";
    results.innerHTML = '<div class="loading">⏳ در حال جستجو...</div>';

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_search_gyms", {
            p_query: query,
        });

        if (error) throw error;

        if (!data?.success) throw new Error(data?.error);

        currentSearchResults = data.gyms || [];
        renderSearchResults();

    } catch (e) {
        console.error(e);
        errBox.style.display = "block";
        errBox.textContent = "❌ " + e.message;
        results.innerHTML = "";
    }
}

function renderSearchResults() {
    const results = document.getElementById("pwd-search-results");

    if (currentSearchResults.length === 0) {
        results.innerHTML = `
            <div class="empty-state" style="text-align:center; padding: 40px; color:#95a5a6;">
                <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
                <p>نتیجه‌ای پیدا نشد</p>
            </div>`;
        return;
    }

    results.innerHTML = currentSearchResults.map(g => `
        <div class="request-card" style="background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 15px; border-right: 4px solid ${g.has_vault ? '#2ecc71' : '#f39c12'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 17px; color:#f1c40f;">🏢 ${escapeHtml(g.name || "بدون نام")}</strong>
                ${g.has_vault
                    ? '<span class="badge badge-green">🔐 رمز ذخیره شده</span>'
                    : '<span class="badge badge-orange">⚠️ رمز ذخیره نشده</span>'}
            </div>
            <div style="color:#95a5a6; font-size: 14px; line-height: 1.8;">
                <div>👤 مالک: ${escapeHtml(g.owner_name || "-")}</div>
                <div>📱 شماره: <code style="direction:ltr; display:inline-block;">${escapeHtml(g.phone || "-")}</code></div>
                <div>🆔 یوزرنیم: <code style="direction:ltr; display:inline-block;">${escapeHtml(g.username || "-")}</code></div>
            </div>
            <div style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                ${g.has_vault
                    ? `<button class="btn-primary" onclick="viewGymPassword('${g.id}', '${escapeHtml(g.name || "")}')">👁️ مشاهده رمز</button>`
                    : ""}
                <button class="btn-ghost" onclick="openResetDialog('${g.id}', '${escapeHtml(g.name || "")}', null)">🔄 تولید رمز جدید</button>
            </div>
        </div>
    `).join("");
}

// ═══════════════════════════════════════════════════════
//  ابزارها
// ═══════════════════════════════════════════════════════
function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.createElement("div");
        toast.style.cssText = `
            position:fixed; bottom:30px; left:50%; transform:translateX(-50%);
            background:#2ecc71; color:#000; padding:12px 24px; border-radius:10px;
            font-weight:bold; z-index:10000; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        toast.textContent = "✅ کپی شد";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
    }).catch(err => {
        alert("خطا در کپی: " + err);
    });
}

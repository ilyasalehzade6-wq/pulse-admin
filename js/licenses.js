/**
 * 🔑 تب لایسنس‌ها
 */

let allLicenses = [];
let licenseFilter = "all";

// ═══════════════════════════════════════════════════════
async function initLicensesTab() {
    const session = await checkAdminSession();
    if (!session) return;

    await loadLicenses();
}

async function loadLicenses() {
    showLicLoading(true);
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_list_licenses");

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        allLicenses = data.licenses || [];

        updateLicStats();
        renderLicenses();
    } catch (e) {
        console.error(e);
        showLicError("خطا: " + e.message);
    } finally {
        showLicLoading(false);
    }
}

function updateLicStats() {
    const total = allLicenses.length;
    const active = allLicenses.filter(l => !l.is_revoked && isNotExpired(l)).length;
    const expired = allLicenses.filter(l => !l.is_revoked && !isNotExpired(l)).length;
    const revoked = allLicenses.filter(l => l.is_revoked).length;

    const el = (id) => document.getElementById(id);
    if (el("lic-total")) el("lic-total").textContent = total;
    if (el("lic-active")) el("lic-active").textContent = active;
    if (el("lic-expired")) el("lic-expired").textContent = expired;
    if (el("lic-revoked")) el("lic-revoked").textContent = revoked;
}

function isNotExpired(l) {
    if (!l.license_expiry) return false;
    return new Date(l.license_expiry) > new Date();
}

function renderLicenses() {
    const container = document.getElementById("licenses-list");
    const search = (document.getElementById("lic-search")?.value || "").toLowerCase();

    let filtered = allLicenses;

    if (licenseFilter === "active") {
        filtered = filtered.filter(l => !l.is_revoked && isNotExpired(l));
    } else if (licenseFilter === "expired") {
        filtered = filtered.filter(l => !l.is_revoked && !isNotExpired(l));
    } else if (licenseFilter === "revoked") {
        filtered = filtered.filter(l => l.is_revoked);
    }

    if (search) {
        filtered = filtered.filter(l =>
            (l.license_key || "").toLowerCase().includes(search) ||
            (l.gym_name || "").toLowerCase().includes(search) ||
            (l.gym_phone || "").includes(search) ||
            (l.hwid || "").toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state">هیچ لایسنسی پیدا نشد</div>';
        return;
    }

    container.innerHTML = filtered.map(l => renderLicenseCard(l)).join("");
}

function renderLicenseCard(l) {
    const expired = !isNotExpired(l);
    const revoked = l.is_revoked;

    let statusClass = "lic-active";
    let statusText = "✅ فعال";
    let statusColor = "#2ecc71";

    if (revoked) {
        statusClass = "lic-revoked";
        statusText = "🔒 لغو شده";
        statusColor = "#e74c3c";
    } else if (expired) {
        statusClass = "lic-expired";
        statusText = "⏰ منقضی";
        statusColor = "#f39c12";
    }

    const daysLeft = getDaysLeft(l.license_expiry);
    const keyPreview = (l.license_key || "").substring(0, 45) + "...";

    // ─── دکمه‌ها ───
    let actions = `
        <button class="lic-btn lic-btn-copy" onclick="copyLicense('${escapeAttr(l.license_key)}')">
            📋 کپی
        </button>
    `;

    if (!revoked && !expired) {
        actions += `
            <button class="lic-btn lic-btn-revoke" onclick="openRevokeModal('${l.id}')">
                🔒 لغو
            </button>
        `;
    }

    if (revoked || expired) {
        actions += `
            <button class="lic-btn lic-btn-renew" onclick="openRenewModal('${l.gym_id}', ${l.plan_id ? "'" + l.plan_id + "'" : "null"})">
                🔄 تمدید
            </button>
        `;
    }

    if (revoked) {
        actions += `
            <button class="lic-btn lic-btn-delete" onclick="openDeleteLicenseModal('${l.id}')">
                🗑 حذف
            </button>
        `;
    }

    return `
        <div class="license-card ${statusClass}">
            <div class="lic-header">
                <div class="lic-key">
                    <span class="lic-icon">🔑</span>
                    <code dir="ltr">${escapeHtml(keyPreview)}</code>
                </div>
                <span class="lic-status" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor};">
                    ${statusText}
                </span>
            </div>

            <div class="lic-info-grid">
                <div class="lic-info">
                    <span class="lic-info-label">🏢 مشتری</span>
                    <span class="lic-info-value">${escapeHtml(l.gym_name || "-")}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">👤 مالک</span>
                    <span class="lic-info-value">${escapeHtml(l.gym_owner || "-")}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">📱 شماره</span>
                    <span class="lic-info-value" dir="ltr">${escapeHtml(l.gym_phone || "-")}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">💎 پلن</span>
                    <span class="lic-info-value">${escapeHtml(l.plan_name || "-")}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">🖥️ HWID</span>
                    <span class="lic-info-value mono" dir="ltr">${escapeHtml(l.hwid || "-")}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">💰 مبلغ</span>
                    <span class="lic-info-value">${(l.price_toman || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">📅 صادر</span>
                    <span class="lic-info-value">${formatDate(l.license_created_at)}</span>
                </div>
                <div class="lic-info">
                    <span class="lic-info-label">⏰ انقضا</span>
                    <span class="lic-info-value">${formatDate(l.license_expiry)}</span>
                </div>
            </div>

            ${!revoked && !expired && daysLeft !== null ? `
                <div class="lic-remaining" style="color: ${daysLeft <= 7 ? '#e74c3c' : daysLeft <= 30 ? '#f39c12' : '#2ecc71'};">
                    ⏳ ${daysLeft} روز مونده
                </div>
            ` : ''}

            ${revoked ? `
                <div class="lic-revoked-reason">
                    🚫 دلیل لغو: ${escapeHtml(l.revoked_reason || "-")}
                </div>
            ` : ''}

            <div class="lic-actions">${actions}</div>
        </div>
    `;
}

function getDaysLeft(iso) {
    if (!iso) return null;
    const end = new Date(iso);
    const now = new Date();
    const diff = end - now;
    if (diff < 0) return null;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function formatDate(iso) {
    if (!iso) return "-";
    try {
        return new Date(iso).toLocaleDateString("fa-IR");
    } catch { return "-"; }
}

function escapeAttr(s) {
    return (s || "").replace(/'/g, "\\'");
}

function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function copyLicense(key) {
    navigator.clipboard.writeText(key).then(() => {
        alert("✅ کلید کپی شد");
    }).catch(() => {
        alert("❌ خطا در کپی");
    });
}

function setLicFilter(filter) {
    licenseFilter = filter;
    document.querySelectorAll(".lic-filter").forEach(b => {
        b.classList.toggle("active", b.dataset.filter === filter);
    });
    renderLicenses();
}

function showLicLoading(show) {
    const el = document.getElementById("lic-loading");
    if (el) el.style.display = show ? "block" : "none";
}

function showLicError(msg) {
    const el = document.getElementById("lic-error");
    if (el) {
        el.textContent = msg;
        el.style.display = "block";
        setTimeout(() => { el.style.display = "none"; }, 5000);
    }
}

// ═══════════════════════════════════════════════════════
// 🔒 Revoke Modal
// ═══════════════════════════════════════════════════════
function openRevokeModal(licenseId) {
    const lic = allLicenses.find(l => l.id === licenseId);
    if (!lic) return;

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>🔒 لغو لایسنس</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="danger-warning">
                    ⚠️ این عمل باعث می‌شود کاربر نتواند وارد برنامه شود
                </div>

                <div class="info-row"><strong>🏢 مشتری:</strong> ${escapeHtml(lic.gym_name || "-")}</div>
                <div class="info-row"><strong>🖥️ HWID:</strong> <code dir="ltr">${escapeHtml(lic.hwid)}</code></div>

                <div class="form-group">
                    <label>📋 دلیل لغو (حداقل ۳ کاراکتر)</label>
                    <textarea id="revoke-reason" rows="3" placeholder="مثلاً: عدم پرداخت، درخواست مشتری..."></textarea>
                </div>

                <div class="form-group">
                    <label>🖥️ HWID را دقیقاً وارد کنید</label>
                    <input type="text" id="revoke-hwid" dir="ltr" placeholder="${escapeHtml(lic.hwid)}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">لغو</button>
                <button class="btn-danger" onclick="confirmRevoke('${lic.id}')">🔒 لغو کن</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function confirmRevoke(licenseId) {
    const reason = document.getElementById("revoke-reason").value.trim();
    const hwid = document.getElementById("revoke-hwid").value.trim();

    if (reason.length < 3) { alert("❌ دلیل خیلی کوتاه است"); return; }
    if (!hwid) { alert("❌ HWID را وارد کنید"); return; }

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_revoke_license", {
            p_license_id: licenseId,
            p_confirm_hwid: hwid,
            p_reason: reason,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        alert("✅ " + data.message);
        document.querySelector(".modal-overlay")?.remove();
        await loadLicenses();
    } catch (e) {
        alert("❌ " + e.message);
    }
}

// ═══════════════════════════════════════════════════════
// 🗑 Delete Modal
// ═══════════════════════════════════════════════════════
function openDeleteLicenseModal(licenseId) {
    const lic = allLicenses.find(l => l.id === licenseId);
    if (!lic) return;

    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>🗑 حذف لایسنس</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">✕</button>
            </div>
            <div class="modal-body">
                <div class="danger-warning">
                    ⚠️ هشدار: این عمل غیرقابل بازگشت است
                </div>

                <div class="info-row"><strong>🏢 مشتری:</strong> ${escapeHtml(lic.gym_name || "-")}</div>
                <div class="info-row"><strong>🖥️ HWID:</strong> <code dir="ltr">${escapeHtml(lic.hwid)}</code></div>

                <div class="form-group">
                    <label>🖥️ HWID را دقیقاً وارد کنید</label>
                    <input type="text" id="del-hwid" dir="ltr" placeholder="${escapeHtml(lic.hwid)}">
                </div>

                <div class="form-group">
                    <label>🔐 برای دریافت کد تأیید کلیک کنید:</label>
                    <button class="btn-secondary" onclick="getDeleteCode('${lic.id}')">🔄 دریافت کد</button>
                    <div id="del-code-display" class="code-display" style="display:none;"></div>
                </div>

                <div class="form-group">
                    <label>🔑 کد تأیید</label>
                    <input type="text" id="del-code" placeholder="XXXXXXXX" style="text-transform: uppercase;">
                </div>

                <div class="checkbox-row">
                    <input type="checkbox" id="del-confirm">
                    <label for="del-confirm">✅ مسئولیت این عمل را می‌پذیرم</label>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-cancel" onclick="this.closest('.modal-overlay').remove()">لغو</button>
                <button class="btn-danger" onclick="confirmDeleteLicense('${lic.id}')">🗑 حذف کن</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function getDeleteCode(licenseId) {
    const display = document.getElementById("del-code-display");
    const btn = event?.target;

    if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ در حال دریافت...";
    }

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_get_delete_code", {
            p_license_id: licenseId,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        display.innerHTML = `🔐 کد تأیید: <strong style="font-size: 20px; color: #f39c12; letter-spacing: 4px;">${data.code}</strong>`;
        display.style.display = "block";

        // چک‌باکس خودکار تیک نخوره

    } catch (e) {
        display.innerHTML = `❌ خطا: ${e.message}`;
        display.style.display = "block";
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🔄 دریافت کد";
        }
    }
}

async function confirmDeleteLicense(licenseId) {
    const hwid = document.getElementById("del-hwid").value.trim();
    const code = document.getElementById("del-code").value.trim();
    const checkbox = document.getElementById("del-confirm").checked;

    if (!hwid) { alert("❌ HWID را وارد کنید"); return; }
    if (!code) { alert("❌ کد تأیید را وارد کنید"); return; }
    if (!checkbox) { alert("❌ باید مسئولیت را بپذیرید"); return; }

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_delete_license", {
            p_license_id: licenseId,
            p_confirm_hwid: hwid,
            p_confirm_code: code,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        alert("✅ " + data.message);
        document.querySelector(".modal-overlay")?.remove();
        await loadLicenses();
    } catch (e) {
        alert("❌ " + e.message);
    }
}

// ═══════════════════════════════════════════════════════
// 🔄 Renew
// ═══════════════════════════════════════════════════════
async function openRenewModal(gymId, planId) {
    if (!gymId) { alert("❌ gym_id ندارد"); return; }

    const planDays = { "1m": 30, "3m": 90, "6m": 180, "1y": 365 };
    const days = planDays[planId] || 30;

    if (!confirm(`🔄 تمدید لایسنس؟\\n\\n📅 ${days} روز اضافه میشود.`)) return;

    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_renew_license_gym", {
            p_gym_id: gymId,
            p_new_days: days,
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        alert(`✅ تمدید شد!\\n📅 انقضای جدید: ${new Date(data.new_expiry).toLocaleDateString('fa-IR')}`);
        await loadLicenses();
    } catch (e) {
        alert("❌ " + e.message);
    }
}

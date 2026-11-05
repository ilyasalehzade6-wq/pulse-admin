/**
 * 🎫 License Utils — منبع واحد حقیقت
 * همه‌ی محاسبات روز از subscription_end (ISO UTC) محاسبه میشه
 */

function toDate(input) {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * ✅ تنها تابع مجاز برای روز باقی‌مونده
 * از Math.floor استفاده می‌کنیم چون می‌خوایم با محاسبه‌ی SQL
 * (subscription_end::date - CURRENT_DATE) هماهنگ باشه
 */
function getRemainingDays(subscriptionEnd) {
    const end = toDate(subscriptionEnd);
    if (!end) return 0;
    const now = new Date();
    // ─── نرمال‌سازی به UTC midnight برای هماهنگی با SQL ───
    const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diffDays = Math.round((endUTC - nowUTC) / 86400000);
    return Math.max(0, diffDays);
}

function getElapsedDays(subscriptionStart) {
    const start = toDate(subscriptionStart);
    if (!start) return 0;
    const now = new Date();
    const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.max(0, Math.round((nowUTC - startUTC) / 86400000));
}

function getTotalPlanDays(start, end) {
    const s = toDate(start), e = toDate(end);
    if (!s || !e) return 30;
    const sUTC = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate());
    const eUTC = Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
    return Math.max(1, Math.round((eUTC - sUTC) / 86400000));
}

function getLicenseStatus(subscriptionEnd, subscriptionStart) {
    const days = getRemainingDays(subscriptionEnd);
    const total = getTotalPlanDays(subscriptionStart, subscriptionEnd);
    const elapsed = Math.max(0, total - days);
    const percent = Math.max(0, Math.min(100, Math.round((days / total) * 100)));

    if (days <= 0) {
        return { status: 'expired', days: 0, total, elapsed, percent,
                 color: '#e74c3c', icon: '❌', label: 'منقضی شده' };
    }
    if (days <= 7) {
        return { status: 'warning', days, total, elapsed, percent,
                 color: '#f39c12', icon: '⚠️', label: `${days} روز مانده` };
    }
    return { status: 'active', days, total, elapsed, percent,
             color: '#2ecc71', icon: '✅', label: `فعال — ${days} روز مانده` };
}

function formatISODate(isoStr) {
    const d = toDate(isoStr);
    if (!d) return '—';
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
}

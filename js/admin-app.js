window.allGyms = [];
window.currentFilter = 'all';

window.initDashboard = async function() {
    console.log("⏳ در حال دریافت اطلاعات مشتریان...");
    const tbody = document.getElementById("gyms-tbody");
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-zinc-500">در حال بارگذاری...</td></tr>';

    try {
        const client = window.getSupabase();
        if (!client) throw new Error("اتصال به دیتابیس برقرار نشد (Client is null)");

        // اعمال تایم‌اوت ۵ ثانیه‌ای
        const fetchPromise = client.from('gyms').select('*').order('created_at', { ascending: false });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        
        const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
        if (error) throw error;
        
        console.log("✅ اطلاعات دریافت شد:", data);
        window.allGyms = data || [];
        updateStats();
        window.renderGyms();
    } catch (e) {
        console.error("❌ خطا در بارگذاری:", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-red-500">خطا در اتصال (یا اطلاعاتی وجود ندارد)</td></tr>';
    }
};

function updateStats() {
    const total = window.allGyms.length;
    const active = window.allGyms.filter(g => g.is_active && !g.is_blocked).length;
    const trial = window.allGyms.filter(g => g.subscription_plan === "trial").length;
    const expired = window.allGyms.filter(g => g.subscription_end && new Date(g.subscription_end) < new Date()).length;
    
    const el = (id) => document.getElementById(id);
    if (el("stat-total")) el("stat-total").textContent = total;
    if (el("stat-active")) el("stat-active").textContent = active;
    if (el("stat-trial")) el("stat-trial").textContent = trial;
    if (el("stat-expired")) el("stat-expired").textContent = expired;
}

window.renderGyms = function() {
    const tbody = document.getElementById("gyms-tbody");
    if (!tbody) return;
    const search = (document.getElementById("search-input")?.value || "").toLowerCase();
    let filtered = window.allGyms;
    
    if (window.currentFilter === "active") filtered = filtered.filter(g => g.is_active && !g.is_blocked);
    else if (window.currentFilter === "trial") filtered = filtered.filter(g => g.subscription_plan === "trial");
    else if (window.currentFilter === "expired") filtered = filtered.filter(g => g.subscription_end && new Date(g.subscription_end) < new Date());

    if (search) {
        filtered = filtered.filter(g => (g.name || "").toLowerCase().includes(search) || (g.owner_name || "").toLowerCase().includes(search) || (g.phone || "").includes(search) || (g.customer_code || "").toLowerCase().includes(search));
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-zinc-500">هیچ مشتری‌ای یافت نشد</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(g => {
        const status = getStatusBadge(g);
        const created = g.created_at ? new Date(g.created_at).toLocaleDateString('fa-IR') : '-';
        const actions = renderActions(g);

        return `
            <tr>
                <td><code class="text-amber-500 text-xs">${g.customer_code || '-'}</code></td>
                <td><strong>${g.name || '-'}</strong></td>
                <td>${g.owner_name || '-'}</td>
                <td dir="ltr" class="text-right">${g.phone || '-'}</td>
                <td>${g.subscription_plan || 'trial'}</td>
                <td>${getRemainingDays(g)}</td>
                <td>${created}</td>
                <td>${status}</td>
                <td class="text-center flex gap-2 justify-center">${actions}</td>
            </tr>
        `;
    }).join("");
    if (window.lucide) lucide.createIcons();
};

window.setFilter = function(filter) {
    window.currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === filter));
    window.renderGyms();
};

function getRemainingDays(g) {
    if (!g.subscription_end) return '-';
    const end = new Date(g.subscription_end);
    const now = new Date();
    const days = Math.ceil((end - now) / 86400000);
    if (days < 0) return '<span class="text-red-500 font-bold">منقضی</span>';
    if (days <= 7) return `<span class="text-amber-500 font-bold">${days} روز</span>`;
    return `<span class="text-emerald-500 font-bold">${days} روز</span>`;
}

function getStatusBadge(g) {
    if (g.is_blocked) return '<span class="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs">مسدود</span>';
    if (!g.is_active) return '<span class="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs">غیرفعال</span>';
    if (g.subscription_plan === "trial") return '<span class="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs">آزمایشی</span>';
    return '<span class="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs">فعال</span>';
}

function renderActions(g) {
    const isBlocked = g.is_blocked === true;
    const isArchived = g.archived_at != null;
    const isDeleted = g.deleted_at != null;

    const viewBtn = `<button onclick="viewGymCredentials('${g.id}', '${g.name || ""}')" class="p-1.5 text-zinc-400 hover:text-blue-400 rounded-md hover:bg-blue-500/10" title="مشاهده"><i data-lucide="eye" class="w-4 h-4"></i></button>`;
    
    if (isDeleted || isArchived) return viewBtn + `<button onclick="restoreGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-md hover:bg-emerald-500/10" title="بازگردانی"><i data-lucide="rotate-ccw" class="w-4 h-4"></i></button>`;
    
    if (isBlocked) return viewBtn + `<button onclick="unblockGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-emerald-400 rounded-md hover:bg-emerald-500/10" title="رفع مسدودی"><i data-lucide="unlock" class="w-4 h-4"></i></button>` + `<button onclick="deleteGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-500/10" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
    
    return viewBtn + `<button onclick="archiveGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-blue-400 rounded-md hover:bg-blue-500/10" title="آرشیو"><i data-lucide="archive" class="w-4 h-4"></i></button>` + `<button onclick="blockGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-amber-400 rounded-md hover:bg-amber-500/10" title="مسدود"><i data-lucide="lock" class="w-4 h-4"></i></button>` + `<button onclick="deleteGym('${g.id}')" class="p-1.5 text-zinc-400 hover:text-red-400 rounded-md hover:bg-red-500/10" title="حذف"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`;
}

// توابع عملیات و رمزها (همان‌ها که قبلا نوشتیم)
window.viewGymCredentials = async function(gymId, gymName) {
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_get_gym_credentials", { p_gym_id: gymId });
        if (error) throw error;
        if (!data?.success) return alert("❌ " + (data?.error || "خطا"));
        
        const modal = document.createElement("div");
        modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4";
        modal.innerHTML = `<div class="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden">
            <div class="p-4 border-b border-zinc-800 bg-[#111111] flex justify-between items-center"><h3 class="text-white font-bold">اطلاعات ورود</h3><button class="text-zinc-400" onclick="this.closest('.fixed').remove()">✕</button></div>
            <div class="p-5 flex flex-col gap-3">
                <div class="text-sm text-zinc-300">باشگاه: <strong class="text-amber-500">${gymName}</strong></div>
                <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3"><div class="text-[10px] text-blue-400 mb-1">نام کاربری</div><div class="text-sm font-mono text-blue-400">${data.username || 'ذخیره نشده'}</div></div>
                <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3"><div class="text-[10px] text-emerald-400 mb-1">رمز عبور</div><div class="text-sm font-mono text-emerald-400">${data.password || 'ذخیره نشده'}</div></div>
            </div>
            <div class="p-4 border-t border-zinc-800 bg-[#111111]"><button class="w-full bg-zinc-800 text-white rounded-lg py-2" onclick="this.closest('.fixed').remove()">بستن</button></div>
        </div>`;
        document.body.appendChild(modal);
        if(window.lucide) lucide.createIcons();
    } catch (e) { alert("❌ " + e.message); }
};

window.archiveGym = async function(gymId) {
    const gym = window.allGyms.find(g => g.id === gymId);
    if (!gym) return;
    const input = prompt(`📦 آرشیو کردن مشتری\n\n🏢 نام: ${gym.name}\n\n⚠️ برای تأیید، نام مجموعه را دقیقاً وارد کنید:`, "");
    if (input === null) return;
    if (input.trim() !== gym.name.trim()) { alert("❌ نام اشتباه است"); return; }
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_archive_gym", { p_gym_id: gymId, p_confirm_name: input.trim() });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ مشتری آرشیو شد");
        window.initDashboard();
    } catch (e) { alert("❌ " + e.message); }
};

window.restoreGym = async function(gymId) {
    if (!confirm("بازگردانی این مشتری؟")) return;
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_restore_gym", { p_gym_id: gymId });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ بازگردانی شد");
        window.initDashboard();
    } catch (e) { alert("❌ " + e.message); }
};

window.blockGym = function(gymId) {
    const gym = window.allGyms.find(g => g.id === gymId);
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4";
    modal.innerHTML = `<div class="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
        <div class="p-5 border-b border-zinc-800 flex justify-between items-center bg-[#111111]"><h2 class="text-white font-bold">🚫 مسدود کردن مشتری</h2><button class="text-zinc-400 hover:text-white" onclick="this.closest('.fixed').remove()">✕</button></div>
        <div class="p-5 flex flex-col gap-4">
            <div class="text-red-500 bg-red-500/10 p-3 rounded-xl text-xs">⚠️ هشدار: این عمل باعث می‌شود کاربر نتواند وارد برنامه شود</div>
            <div class="text-sm text-zinc-300">نام مجموعه: <strong class="text-amber-500">${gym.name}</strong></div>
            <div class="flex flex-col gap-2"><label class="text-xs text-zinc-400">دلیل (حداقل ۵ کاراکتر)</label><textarea id="block-reason" class="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white"></textarea></div>
            <div class="flex flex-col gap-2"><label class="text-xs text-zinc-400">نام مجموعه را دقیقاً وارد کنید</label><input type="text" id="block-name" class="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-sm text-white" placeholder="${gym.name}"></div>
            <div class="flex items-center gap-2"><input type="checkbox" id="block-confirm" class="w-4 h-4 rounded bg-[#09090b] border-zinc-800"><label for="block-confirm" class="text-xs text-zinc-300">مسئولیت این عمل را می‌پذیرم</label></div>
        </div>
        <div class="p-4 border-t border-zinc-800 bg-[#111111] flex gap-3"><button class="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-bold" onclick="confirmBlock('${gym.id}')">مسدود کن</button><button class="flex-1 border border-zinc-700 text-zinc-300 rounded-lg py-2 text-sm" onclick="this.closest('.fixed').remove()">لغو</button></div>
    </div>`;
    document.body.appendChild(modal);
};

window.confirmBlock = async function(gymId) {
    const reason = document.getElementById("block-reason").value.trim();
    const nameConfirm = document.getElementById("block-name").value.trim();
    const checkbox = document.getElementById("block-confirm").checked;
    if (reason.length < 5) return alert("دلیل باید حداقل ۵ کاراکتر باشد");
    if (!checkbox) return alert("مسئولیت را بپذیرید");
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_block_gym", { p_gym_id: gymId, p_confirm_name: nameConfirm, p_reason: reason });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ " + data.message);
        document.querySelector(".fixed")?.remove();
        window.initDashboard();
    } catch (e) { alert("❌ " + e.message); }
};

window.unblockGym = async function(gymId) {
    if (!confirm("رفع مسدودی؟")) return;
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_unblock_gym", { p_gym_id: gymId });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ رفع مسدودی شد");
        window.initDashboard();
    } catch (e) { alert("❌ " + e.message); }
};

window.deleteGym = async function(gymId) {
    const gym = window.allGyms.find(g => g.id === gymId);
    if (!gym) return;
    if (!confirm(`⚠️ حذف «${gym.name}»؟`)) return;
    const namePrompt = prompt(`برای تأیید، نام مجموعه را دقیقاً تایپ کنید:\n«${gym.name}»`);
    if (namePrompt !== gym.name) return alert("❌ نام اشتباه است");
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_delete_gym", { p_gym_id: gymId, p_confirm_name: namePrompt });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ حذف شد");
        window.initDashboard();
    } catch (e) { alert("❌ " + e.message); }
};

window.loadPasswordResets = async function() {
    const list = document.getElementById('pwd-requests-list');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-zinc-500">در حال بارگذاری...</div>';
    try {
        const client = window.getSupabase();
        const { data, error } = await client.rpc("admin_list_password_resets");
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "خطا");
        
        const pending = data.requests?.filter(r => r.status === "pending").length || 0;
        const resolved = data.requests?.filter(r => r.status === "resolved").length || 0;
        document.getElementById('pwd-pending').textContent = pending;
        document.getElementById('pwd-resolved').textContent = resolved;
        
        if (!data.requests || data.requests.length === 0) {
            list.innerHTML = '<div class="text-center py-6 text-zinc-500">هیچ درخواستی وجود ندارد</div>';
            return;
        }
        list.innerHTML = data.requests.map(req => `<div class="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col gap-2"><div class="flex justify-between items-center"><strong class="text-amber-500">${req.gym_name || 'نامشخص'}</strong><span class="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">${req.status}</span></div><div class="text-xs text-zinc-400">شماره: ${req.phone || '-'}</div><div class="text-xs text-zinc-400">نوع: ${req.request_type === 'username' ? 'نام کاربری' : 'رمز عبور'}</div></div>`).join('');
    } catch (e) {
        list.innerHTML = `<div class="text-center py-4 text-red-500">خطا: ${e.message}</div>`;
    }
};

// راه‌اندازی خودکار
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('login.html')) return;
    window.initDashboard();
});

(function() {
    let allGyms = [];
    let currentFilter = "all";

    window.initDashboard = async function() {
        const client = window.getSupabase();
        if (!client) return;
        
        const tbody = document.getElementById("gyms-tbody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-zinc-500">در حال بارگذاری...</td></tr>';

        try {
            const { data, error } = await client.from('gyms').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            allGyms = data || [];
            updateStats();
            renderGyms();
        } catch (e) {
            console.error(e);
            if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-red-500">خطا در اتصال به دیتابیس</td></tr>';
        }
    };

    function updateStats() {
        const total = allGyms.length;
        const active = allGyms.filter(g => g.is_active && !g.is_blocked).length;
        const trial = allGyms.filter(g => g.subscription_plan === "trial").length;
        const expired = allGyms.filter(g => g.subscription_end && new Date(g.subscription_end) < new Date()).length;
        
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
        let filtered = allGyms;
        
        if (currentFilter === "active") filtered = filtered.filter(g => g.is_active && !g.is_blocked);
        else if (currentFilter === "trial") filtered = filtered.filter(g => g.subscription_plan === "trial");
        else if (currentFilter === "expired") filtered = filtered.filter(g => g.subscription_end && new Date(g.subscription_end) < new Date());

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
        currentFilter = filter;
        document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.filter === filter));
        renderGyms();
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
})();

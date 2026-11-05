
(function() {
    let currentTab = 'dashboard';

    window.switchTab = async function(tabName) {
        currentTab = tabName;
        
        // مخفی کردن همه تب‌ها
        document.querySelectorAll('[id^="tab-"]').forEach(el => {
            el.classList.add('hidden');
            el.classList.remove('flex');
        });
        
        // نمایش تب جاری
        const target = document.getElementById('tab-' + tabName);
        if (target) {
            target.classList.remove('hidden');
            target.classList.add('flex');
        }

        // تغییر رنگ دکمه منو
        document.querySelectorAll('aside nav a').forEach(a => {
            a.className = 'flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-medium transition-colors';
        });
        if (window.event && window.event.currentTarget) {
            window.event.currentTarget.className = 'flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-500/10 text-amber-500 border-r-2 border-amber-500 font-bold transition-colors';
        }
        
        // تغییر عنوان
        const titles = { dashboard: 'داشبورد مدیریت', licenses: 'مدیریت اشتراک‌ها', clubs: 'مدیریت باشگاه‌ها' };
        const titleEl = document.getElementById('pageTitle');
        if (titleEl) titleEl.textContent = titles[tabName] || 'پنل ادمین';

        // لود دیتای مربوطه
        if (tabName === 'dashboard') loadDashboardStats();
        if (tabName === 'licenses') loadLicenses();
        if (tabName === 'clubs') loadClubs();
    };

    async function loadDashboardStats() {
        try {
            const client = window.getSupabase();
            
            // واکشی همه داده‌ها بدون فیلتر (جلوگیری از خطای 400)
            const { data: subs } = await client.from('subscriptions').select('*');
            const { data: gyms } = await client.from('gyms').select('*');

            const totalSubs = subs ? subs.length : 0;
            let activeSubs = 0;
            let expiredSubs = 0;

            if (subs) {
                // شمارش امن بر اساس فیلدهای احتمالی
                subs.forEach(s => {
                    if (s.status === 'active' || s.is_active === true) activeSubs++;
                    else expiredSubs++;
                });
            }

            document.getElementById('totalLicenses').textContent = totalSubs;
            document.getElementById('activeLicenses').textContent = activeSubs;
            document.getElementById('expiredLicenses').textContent = expiredSubs;
            document.getElementById('totalClubs').textContent = gyms ? gyms.length : 0;
            
        } catch (e) {
            console.error('خطا در آمار:', e);
        }
    }

    async function loadLicenses() {
        const list = document.getElementById('licensesList');
        list.innerHTML = '<div class="p-6 text-center text-zinc-500 text-sm">در حال بارگذاری...</div>';
        try {
            const client = window.getSupabase();
            const { data, error } = await client.from('subscriptions').select('*').limit(50);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                list.innerHTML = '<div class="p-6 text-center text-zinc-500 text-sm">هیچ اشتراکی یافت نشد.</div>';
                return;
            }

            list.innerHTML = data.map(item => {
                // استخراج امن اطلاعات
                const displayId = item.id ? item.id.substring(0,8) : 'بدون کد';
                const displayInfo = item.plan_name || item.plan || item.type || 'اطلاعات نامشخص';
                
                return `
                <div class="p-4 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <div class="flex flex-col">
                        <div class="text-sm font-bold text-white mb-1">${displayId}</div>
                        <div class="text-xs text-zinc-400">${displayInfo}</div>
                    </div>
                    <div class="text-left">
                        <span class="px-2 py-1 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-400">مشاهده</span>
                    </div>
                </div>
                `;
            }).join('');
        } catch (e) {
            console.error(e);
            list.innerHTML = '<div class="p-6 text-center text-red-500 text-sm">خطا در اتصال به دیتابیس (RLS).</div>';
        }
    }

    async function loadClubs() {
        const list = document.getElementById('clubsList');
        list.innerHTML = '<div class="p-6 text-center text-zinc-500 text-sm">در حال بارگذاری...</div>';
        try {
            const client = window.getSupabase();
            const { data, error } = await client.from('gyms').select('*').order('created_at', { ascending: false }).limit(50);
            
            if (error) throw error;
            if (!data || data.length === 0) {
                list.innerHTML = '<div class="p-6 text-center text-zinc-500 text-sm">هیچ باشگاهی یافت نشد.</div>';
                return;
            }

            list.innerHTML = data.map(item => `
                <div class="p-4 flex items-center justify-between border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <div class="flex flex-col">
                        <div class="text-sm font-bold text-white mb-1">${item.name || 'بدون نام'}</div>
                        <div class="text-xs text-zinc-400">${item.owner_name || 'نامشخص'} - ${item.phone || ''}</div>
                    </div>
                    <div class="text-left">
                        <span class="px-2 py-1 rounded-md text-[10px] font-bold ${item.is_blocked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}">${item.is_blocked ? 'مسدود' : 'فعال'}</span>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error(e);
            list.innerHTML = '<div class="p-6 text-center text-red-500 text-sm">خطا در اتصال به دیتابیس (RLS).</div>';
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        if (window.location.pathname.includes('login.html')) return;
        
        // لود اولیه
        loadDashboardStats();
        if (window.lucide) lucide.createIcons();
    });
})();

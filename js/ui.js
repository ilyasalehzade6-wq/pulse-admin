
function switchTab(tabName, btnElement) {
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

    // مدیریت ظاهر دکمه‌های سایدبار
    document.querySelectorAll('.nav-item').forEach(a => {
        a.className = 'flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-medium transition-colors nav-item';
    });
    if (btnElement) {
        btnElement.className = 'flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-500/10 text-amber-500 border-r-2 border-amber-500 font-bold transition-colors nav-item';
    }
    
    // تغییر عنوان هدر
    const titles = { dashboard: 'داشبورد مدیریت', clubs: 'مدیریت مشتریان', passwords: 'مدیریت رمزهای عبور' };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || 'پنل ادمین';

    // لود دیتای مربوطه هنگام تغییر تب
    if (tabName === 'passwords' && typeof loadPasswordResets === 'function') {
        loadPasswordResets();
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('pulse_theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('pulse_theme', 'dark');
    }
}

function logout() {
    if (confirm('از حساب خارج می‌شوید؟')) {
        if (window.supabase) {
            // تلاش برای خروج از سوپابیس
            const client = window.getSupabase ? window.getSupabase() : null;
            if(client) client.auth.signOut().then(() => window.location.href = 'login.html');
            else window.location.href = 'login.html';
        } else {
            window.location.href = 'login.html';
        }
    }
}

if (localStorage.getItem('pulse_theme') === 'light') {
    document.documentElement.classList.remove('dark');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full');
        overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('translate-x-full');
        overlay.classList.add('hidden');
    }
}

// تابع کپی سراسری
window.copyText = function(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.createElement("div");
            toast.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-4 py-2 rounded-lg font-bold text-sm shadow-xl z-[10000] transition-all";
            toast.textContent = "✅ کپی شد";
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2000);
        }).catch(err => {
            console.error("Copy error:", err);
        });
    }
};

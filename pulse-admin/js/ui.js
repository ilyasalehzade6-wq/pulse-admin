function switchTab(tabName, btnElement) {
    document.querySelectorAll('[id^="tab-"]').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('flex');
    });
    const target = document.getElementById('tab-' + tabName);
    if (target) { target.classList.remove('hidden'); target.classList.add('flex'); }

    document.querySelectorAll('.nav-item').forEach(a => {
        a.className = 'flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-medium transition-colors nav-item';
    });
    if (btnElement) {
        btnElement.className = 'flex items-center gap-3 px-3 py-3 rounded-xl bg-amber-500/10 text-amber-500 border-r-2 border-amber-500 font-bold transition-colors nav-item';
    }
    
    const titles = { dashboard: 'داشبورد مدیریت', clubs: 'مدیریت مشتریان', passwords: 'مدیریت رمزهای عبور' };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[tabName] || 'پنل ادمین';

    if (tabName === 'passwords' && typeof loadPasswordResets === 'function') loadPasswordResets();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) { document.documentElement.classList.remove('dark'); localStorage.setItem('pulse_theme', 'light'); }
    else { document.documentElement.classList.add('dark'); localStorage.setItem('pulse_theme', 'dark'); }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar.classList.contains('translate-x-full')) {
        sidebar.classList.remove('translate-x-full'); overlay.classList.remove('hidden');
    } else {
        sidebar.classList.add('translate-x-full'); overlay.classList.add('hidden');
    }
}

function logout() {
    if (confirm('از حساب خارج می‌شوید؟')) {
        const client = window.getSupabase ? window.getSupabase() : null;
        if(client) client.auth.signOut().then(() => window.location.href = 'login.html');
        else window.location.href = 'login.html';
    }
}

if (localStorage.getItem('pulse_theme') === 'light') { document.documentElement.classList.remove('dark'); }

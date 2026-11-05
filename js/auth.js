
// تعریف کلاینت به صورت سراسری
window.getSupabase = function() {
    if (!window._supabaseClient) {
        window._supabaseClient = window.supabase.createClient(
            "https://lxicakedhhocpdphgzrt.supabase.co",
            "sb_publishable_ldxkcUuBekMeitRc57ZAsw_fFbva3Zi"
        );
    }
    return window._supabaseClient;
};

// تابع بررسی سشن (حالا مقدار سشن را برمی‌گرداند)
async function checkAdminSession() {
    try {
        const client = window.getSupabase();
        const { data: { session } } = await client.auth.getSession();
        
        // اگر در صفحه لاگین هستیم و کاربر لاگین است، برو داشبورد
        if (window.location.pathname.includes('login.html') && session) {
            window.location.href = 'index.html';
            return session;
        }
        
        return session; // برگرداندن سشن (اگر null باشد یعنی لاگین نیست)
    } catch (err) {
        console.error("Auth error:", err);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.getSupabase();
    
    // منطق فرم لاگین
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');
            const btnText = btn.querySelector('.btn-text');
            const spinner = btn.querySelector('.spinner');
            const errorMsg = document.getElementById('errorMsg');

            btn.disabled = true;
            if(btnText) btnText.textContent = 'در حال بررسی...';
            if(spinner) spinner.style.display = 'inline-block';
            if(errorMsg) errorMsg.classList.add('hidden');

            try {
                const email = user.includes('@') ? user : user + '@pulse.local';
                const { error } = await window.getSupabase().auth.signInWithPassword({ email, password: pass });
                if (error) throw error;
                window.location.href = 'index.html';
            } catch (err) {
                if(errorMsg) {
                    errorMsg.textContent = 'نام کاربری یا رمز عبور اشتباه است';
                    errorMsg.classList.remove('hidden');
                }
            } finally {
                btn.disabled = false;
                if(btnText) btnText.textContent = 'ورود به پنل';
                if(spinner) spinner.style.display = 'none';
            }
        });
    }
});

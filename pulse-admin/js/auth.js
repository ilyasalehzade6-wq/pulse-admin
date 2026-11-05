(function() {
    let supabaseClient = null;
    window.getSupabase = function() {
        if (!supabaseClient) {
            supabaseClient = window.supabase.createClient(
                "https://lxicakedhhocpdphgzrt.supabase.co",
                "sb_publishable_ldxkcUuBekMeitRc57ZAsw_fFbva3Zi"
            );
        }
        return supabaseClient;
    };

    async function checkAdminSession() {
        try {
            const client = window.getSupabase();
            const { data: { session } } = await client.auth.getSession();
            if (window.location.pathname.includes('login.html') && session) {
                window.location.href = 'index.html';
            } else if (window.location.pathname.includes('index.html') && !session) {
                // window.location.href = 'login.html';
            }
        } catch (err) { console.error(err); }
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.getSupabase();
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
        } else {
            checkAdminSession();
        }
    });
})();

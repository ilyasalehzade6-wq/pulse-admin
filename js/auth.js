/**
 * 🔐 مدیریت احراز هویت ادمین
 */

let supabaseClient = null;

function getSupabase() {
    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(
            CONFIG.SUPABASE_URL,
            CONFIG.SUPABASE_KEY
        );
    }
    return supabaseClient;
}

/**
 * چک کردن اینکه کاربر ادمین معتبره یا نه
 */
async function checkAdminSession() {
    const client = getSupabase();
    const { data: { session } } = await client.auth.getSession();

    if (!session) return null;

    const meta = session.user.user_metadata || {};

    // 🛡️ چک امنیتی دوگانه
    if (!meta.is_admin) {
        console.warn("⛔ کاربر is_admin نداره");
        return null;
    }

    const email = session.user.email || "";
    const phone = email.split("@")[0];

    if (!CONFIG.ADMIN_PHONES.includes(phone)) {
        console.warn("⛔ شماره توی لیست ادمین‌ها نیست");
        return null;
    }

    return {
        user_id: session.user.id,
        email: email,
        phone: phone,
        full_name: meta.full_name || phone,
        is_admin: true,
        access_token: session.access_token,
    };
}

/**
 * ورود ادمین
 */
async function adminLogin(phone, password) {
    if (!CONFIG.ADMIN_PHONES.includes(phone)) {
        throw new Error("این شماره دسترسی ادمین ندارد");
    }

    const client = getSupabase();
    const email = `${phone}@pulse.local`;

    const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) throw error;
    if (!data.session) throw new Error("خطا در ورود");

    return {
        user_id: data.user.id,
        email: email,
        phone: phone,
        full_name: data.user.user_metadata?.full_name || phone,
        access_token: data.session.access_token,
    };
}

/**
 * خروج
 */
async function adminLogout() {
    const client = getSupabase();
    await client.auth.signOut();
    localStorage.removeItem("admin_session");
    window.location.href = CONFIG.LOGIN_PAGE;
}

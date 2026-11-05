async function loadPasswordResets() {
    const list = document.getElementById('pwd-requests-list');
    if (!list) return;
    list.innerHTML = '<div class="text-center py-4 text-zinc-500">در حال بارگذاری...</div>';
    try {
        const client = getSupabase();
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

        list.innerHTML = data.requests.map(req => `
            <div class="bg-[#121215] border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
                <div class="flex justify-between items-center"><strong class="text-amber-500">${req.gym_name || 'نامشخص'}</strong><span class="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300">${req.status}</span></div>
                <div class="text-xs text-zinc-400">شماره: ${req.phone || '-'}</div>
                <div class="text-xs text-zinc-400">نوع: ${req.request_type === 'username' ? 'نام کاربری' : 'رمز عبور'}</div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = `<div class="text-center py-4 text-red-500">خطا: ${e.message}</div>`;
    }
}

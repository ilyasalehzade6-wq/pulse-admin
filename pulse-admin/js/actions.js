async function archiveGym(gymId) {
    const gym = allGyms.find(g => g.id === gymId);
    if (!gym) return;
    const input = prompt(`📦 آرشیو کردن مشتری\n\n🏢 نام: ${gym.name}\n\n⚠️ برای تأیید، نام مجموعه را دقیقاً وارد کنید:`, "");
    if (input === null) return;
    if (input.trim() !== gym.name.trim()) { alert("❌ نام اشتباه است"); return; }
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_archive_gym", { p_gym_id: gymId, p_confirm_name: input.trim() });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ مشتری آرشیو شد");
        initDashboard();
    } catch (e) { alert("❌ " + e.message); }
}

async function restoreGym(gymId) {
    if (!confirm("بازگردانی این مشتری؟")) return;
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_restore_gym", { p_gym_id: gymId });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ بازگردانی شد");
        initDashboard();
    } catch (e) { alert("❌ " + e.message); }
}

async function blockGym(gymId) { showBlockModal(allGyms.find(g => g.id === gymId)); }
function showBlockModal(gym) {
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
}
async function confirmBlock(gymId) {
    const reason = document.getElementById("block-reason").value.trim();
    const nameConfirm = document.getElementById("block-name").value.trim();
    const checkbox = document.getElementById("block-confirm").checked;
    if (reason.length < 5) return alert("دلیل باید حداقل ۵ کاراکتر باشد");
    if (!checkbox) return alert("مسئولیت را بپذیرید");
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_block_gym", { p_gym_id: gymId, p_confirm_name: nameConfirm, p_reason: reason });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ " + data.message);
        document.querySelector(".fixed")?.remove();
        initDashboard();
    } catch (e) { alert("❌ " + e.message); }
}

async function unblockGym(gymId) {
    if (!confirm("رفع مسدودی؟")) return;
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_unblock_gym", { p_gym_id: gymId });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ رفع مسدودی شد");
        initDashboard();
    } catch (e) { alert("❌ " + e.message); }
}

async function deleteGym(gymId) {
    const gym = allGyms.find(g => g.id === gymId);
    if (!gym) return;
    if (!confirm(`⚠️ حذف «${gym.name}»؟`)) return;
    const namePrompt = prompt(`برای تأیید، نام مجموعه را دقیقاً تایپ کنید:\n«${gym.name}»`);
    if (namePrompt !== gym.name) return alert("❌ نام اشتباه است");
    try {
        const client = getSupabase();
        const { data, error } = await client.rpc("admin_delete_gym", { p_gym_id: gymId, p_confirm_name: namePrompt });
        if (error) throw error;
        if (!data.success) throw new Error(data.error);
        alert("✅ حذف شد");
        initDashboard();
    } catch (e) { alert("❌ " + e.message); }
}

async function viewGymCredentials(gymId, gymName) {
    try {
        const client = getSupabase();
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
}

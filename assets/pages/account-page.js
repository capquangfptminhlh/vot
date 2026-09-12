import { backendConfig, friendlyError, getSupabase } from "../core/backend.js";

const status = document.querySelector("[data-account-status]");
const profileBox = document.querySelector("[data-account-profile]");
const listingBox = document.querySelector("[data-account-listings]");
const signOutButton = document.querySelector("[data-sign-out]");

function setStatus(message, type = "") {
  if (!status) return;
  status.textContent = message;
  status.dataset.type = type;
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function load() {
  if (!backendConfig().configured) {
    setStatus("Backend production chưa được nối cho bản preview này.", "warning");
    return;
  }
  try {
    const supabase = await getSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const user = sessionData.session?.user;
    if (!user) {
      window.location.replace(`dang-nhap.html?next=${encodeURIComponent("tai-khoan.html")}`);
      return;
    }

    const [{ data: profile, error: profileError }, { data: verification, error: verificationError }, { data: listings, error: listingsError }] = await Promise.all([
      supabase.from("profiles").select("display_name,avatar_url,province,bio,seller_score,rating,rating_count,created_at").eq("id", user.id).single(),
      supabase.from("seller_verifications").select("phone_verified,identity_verified,bank_name_verified,status,reviewed_at").eq("user_id", user.id).single(),
      supabase.from("listings").select("id,title,status,moderation_state,price_vnd,created_at").eq("seller_id", user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    if (profileError) throw profileError;
    if (verificationError) throw verificationError;
    if (listingsError) throw listingsError;

    if (profileBox) profileBox.innerHTML = `<h2>${escapeHtml(profile.display_name || user.email || user.phone || "Tài khoản")}</h2><p>${escapeHtml(profile.province || "Chưa cập nhật khu vực")}</p><div class="trust-strip"><div class="trust-item"><b>SĐT</b><small>${verification.phone_verified ? "Đã xác thực" : "Chưa xác thực"}</small></div><div class="trust-item"><b>Danh tính</b><small>${verification.identity_verified ? "Đã xác thực" : "Chưa xác thực"}</small></div><div class="trust-item"><b>Ngân hàng</b><small>${verification.bank_name_verified ? "Đã đối chiếu" : "Chưa đối chiếu"}</small></div><div class="trust-item"><b>Trạng thái seller</b><small>${escapeHtml(verification.status)}</small></div></div>`;

    if (listingBox) listingBox.innerHTML = listings?.length ? listings.map((item) => `<a class="panel" style="display:block;margin-bottom:10px" href="san-pham.html?id=${encodeURIComponent(item.id)}"><b>${escapeHtml(item.title)}</b><p style="margin:6px 0 0;color:#66736b">${escapeHtml(item.status)} • moderation: ${escapeHtml(item.moderation_state)}</p></a>`).join("") : "<p>Bạn chưa có tin nào.</p>";
    setStatus("Đã đồng bộ dữ liệu tài khoản.", "success");
  } catch (error) {
    setStatus(friendlyError(error), "error");
  }
}

signOutButton?.addEventListener("click", async () => {
  try {
    const supabase = await getSupabase();
    await supabase.auth.signOut({ scope: "local" });
    window.location.replace("index.html");
  } catch (error) {
    setStatus(friendlyError(error), "error");
  }
});

load();

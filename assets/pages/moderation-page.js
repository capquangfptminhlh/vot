import { backendConfig, friendlyError } from "../core/backend.js";
import { getStaffRole, getDashboardCounts, getModerationQueue, getModerationEvidence, moderateListing } from "../services/admin-service.js";

const statusEl = document.querySelector("[data-admin-status]");
const statsEl = document.querySelector("[data-admin-stats]");
const queueEl = document.querySelector("[data-admin-queue]");

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function money(value) { return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " đ"; }
function setStatus(message, type="") { if (statusEl) { statusEl.textContent = message; statusEl.dataset.type = type; } }

async function reviewRow(row) {
  const evidence = await getModerationEvidence(row.listing_id);
  const reason = window.prompt(`Review: ${row.title}\nEvidence: ${evidence.length}\nNhập lý do/ghi chú moderation:`) ?? "";
  const choice = window.prompt("Nhập quyết định: approve / reject / needs_review", "needs_review");
  if (!choice) return;
  await moderateListing(row.listing_id, choice.trim(), reason);
  await load();
}

async function load() {
  if (!backendConfig().configured) {
    setStatus("Bản preview chưa nối backend production. Console admin thật đang khóa.", "warning");
    if (statsEl) statsEl.innerHTML = "";
    if (queueEl) queueEl.innerHTML = `<div class="panel">Không hiển thị số liệu giả.</div>`;
    return;
  }
  try {
    const [role, counts, queue] = await Promise.all([getStaffRole(), getDashboardCounts(), getModerationQueue()]);
    setStatus(`Đã xác thực quyền ${role}. Dữ liệu lấy trực tiếp từ backend.`, "success");
    if (statsEl) statsEl.innerHTML = `<div class="moderation-stat"><small>Chờ duyệt</small><b>${Number(counts.pending_review || 0)}</b></div><div class="moderation-stat"><small>Report mở</small><b>${Number(counts.open_reports || 0)}</b></div><div class="moderation-stat"><small>Seller bị treo</small><b>${Number(counts.suspended_sellers || 0)}</b></div>`;
    if (!queueEl) return;
    if (!queue.length) { queueEl.innerHTML = `<div class="panel">Queue hiện trống.</div>`; return; }
    queueEl.innerHTML = queue.map(row => `<div class="queue-row" data-row="${esc(row.listing_id)}"><div><b>${esc(row.title)}</b><small style="display:block">${money(row.price_vnd)} • ${esc(row.condition)}${row.province ? ` • ${esc(row.province)}` : ""}</small></div><span>Ảnh: ${Number(row.image_count || 0)} • Evidence: ${Number(row.evidence_count || 0)}</span><span class="risk ${Number(row.report_count || 0) ? "high" : "low"}">Report: ${Number(row.report_count || 0)}</span><button class="btn btn-outline" type="button">Review</button></div>`).join("");
    queue.forEach(row => queueEl.querySelector(`[data-row="${row.listing_id}"] button`)?.addEventListener("click", async () => {
      try { await reviewRow(row); } catch (error) { setStatus(friendlyError(error), "error"); }
    }));
  } catch (error) {
    setStatus(friendlyError(error), "error");
    if (queueEl) queueEl.innerHTML = `<div class="panel"><b>Không thể mở moderation console.</b><p>Yêu cầu tài khoản có role moderator/admin.</p></div>`;
  }
}
load();

import { backendConfig, friendlyError } from "../core/backend.js";
import { getListing, getSellerTrust, publicListingImageUrl } from "../services/listing-service.js";
import { favoriteState, toggleFavorite, reportListing } from "../services/engagement-service.js";

const host = document.querySelector("[data-product-live]");
const notice = document.querySelector("[data-product-status]");

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function money(value) { return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " đ"; }
function yesNo(value) { return value === true ? "Có" : value === false ? "Không" : "Chưa cung cấp"; }
function initials(name) { return String(name || "CV").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); }
function requireLoginRedirect() { location.href = `dang-nhap.html?next=${encodeURIComponent(location.pathname.split('/').pop()+location.search)}`; }

async function bindActions(listingId) {
  const fav = host?.querySelector("[data-favorite]");
  const report = host?.querySelector("[data-report]");
  if (fav) {
    try { fav.dataset.active = (await favoriteState(listingId)) ? "true" : "false"; fav.textContent = fav.dataset.active === "true" ? "♥ Đã lưu" : "♡ Lưu tin"; }
    catch (error) { if (error?.code === "AUTH_REQUIRED") fav.textContent = "♡ Lưu tin"; }
    fav.addEventListener("click", async () => {
      try { const active = await toggleFavorite(listingId); fav.dataset.active = String(active); fav.textContent = active ? "♥ Đã lưu" : "♡ Lưu tin"; }
      catch (error) { if (error?.code === "AUTH_REQUIRED") requireLoginRedirect(); else if (notice) notice.textContent = friendlyError(error); }
    });
  }
  report?.addEventListener("click", async () => {
    const reason = window.prompt("Lý do: fake / scam / wrong_condition / wrong_product / prohibited / spam / other", "other");
    if (!reason) return;
    const detail = window.prompt("Mô tả thêm (không bắt buộc):", "") ?? "";
    try { await reportListing(listingId, reason, detail); if (notice) notice.textContent = "Đã ghi nhận báo cáo. Moderation sẽ xem xét."; }
    catch (error) { if (error?.code === "AUTH_REQUIRED") requireLoginRedirect(); else if (notice) notice.textContent = friendlyError(error); }
  });
}

async function renderLive(id) {
  const listing = await getListing(id);
  const trust = await getSellerTrust(listing.seller_id);
  const brand = listing.paddle_models?.brands?.name || listing.custom_brand || "Chưa rõ";
  const model = listing.paddle_models?.name || listing.custom_model || "Chưa rõ";
  const thickness = listing.paddle_models?.thickness_mm ? `${listing.paddle_models.thickness_mm} mm` : "Chưa rõ";
  const images = [...(listing.listing_images || [])].sort((a,b)=>a.sort_order-b.sort_order);
  const urls = await Promise.all(images.map(x => publicListingImageUrl(x.storage_path)));
  const sellerName = trust?.display_name || "Người bán ChoVot";
  const sellerVerified = Boolean(trust?.seller_verified);
  const media = urls.filter(Boolean).length
    ? `<div class="gallery" style="display:grid;gap:10px">${urls.filter(Boolean).map((url,i)=>`<img src="${esc(url)}" alt="Ảnh ${i+1} của ${esc(listing.title)}" loading="${i ? "lazy" : "eager"}" style="width:100%;border-radius:18px;object-fit:cover">`).join("")}</div>`
    : `<div class="gallery"><div class="mini-paddle"><span>${esc(brand)}</span></div></div>`;

  host.innerHTML = `<div class="detail">${media}<div><div class="chips"><span class="badge ${sellerVerified ? "verified" : "used"}">${sellerVerified ? "✓ Người bán đã xác thực" : "Chưa xác thực seller"}</span><span class="badge used">${esc(listing.status)}</span></div><h1>${esc(listing.title)}</h1><div class="detail-price">${money(listing.price_vnd)}</div><p style="color:#66736b">Tình trạng: <b>${esc(listing.condition)}</b>${listing.province ? ` • ${esc(listing.province)}` : ""}</p><div class="info-list"><div class="info"><small>Thương hiệu</small><b>${esc(brand)}</b></div><div class="info"><small>Model</small><b>${esc(model)}</b></div><div class="info"><small>Độ dày</small><b>${esc(thickness)}</b></div><div class="info"><small>NFC được khai báo</small><b>${esc(yesNo(listing.nfc_available))}</b></div><div class="info"><small>Hóa đơn được khai báo</small><b>${esc(yesNo(listing.invoice_available))}</b></div><div class="info"><small>Trạng thái</small><b>${esc(listing.status)}</b></div></div>${listing.description ? `<div class="panel" style="margin:16px 0"><h2 style="font-size:20px">Mô tả người bán</h2><p>${esc(listing.description)}</p></div>` : ""}<div class="panel" style="padding:18px"><div class="seller-card"><div class="avatar">${esc(initials(sellerName))}</div><div><b>${esc(sellerName)}</b><br><small>${sellerVerified ? "Seller đã hoàn tất xác thực ChoVot" : "Chưa có badge xác thực seller"}</small></div></div><div class="trust-strip" style="margin-top:14px"><div class="trust-item"><b>SĐT</b><small>${trust?.phone_verified ? "Đã xác thực" : "Chưa xác thực"}</small></div><div class="trust-item"><b>Danh tính</b><small>${trust?.identity_verified ? "Đã xác thực" : "Chưa xác thực"}</small></div><div class="trust-item"><b>Ngân hàng</b><small>${trust?.bank_name_verified ? "Đã đối chiếu" : "Chưa đối chiếu"}</small></div></div></div><div class="sticky-buy contact-bar"><a class="btn btn-primary" href="tin-nhan.html?listing=${encodeURIComponent(listing.id)}">💬 Nhắn người bán</a><button class="btn btn-outline" type="button" data-favorite>♡ Lưu tin</button><button class="btn btn-outline" type="button" data-report>⚑ Báo cáo</button></div><p style="font-size:12px;color:#66736b">Hai bên tự thỏa thuận giá, địa điểm xem vợt, thanh toán và giao nhận. ChoVot không thu tiền hộ. Serial thô không được công khai; badge evidence phải do backend xác minh riêng.</p></div></div>`;
  document.title = `${listing.title} | ChoVot`;
  if (notice) notice.textContent = "Dữ liệu tin và trạng thái seller đang lấy trực tiếp từ backend ChoVot.";
  await bindActions(listing.id);
}

async function init() {
  const id = new URLSearchParams(location.search).get("id");
  if (!backendConfig().configured || !id) {
    if (notice) notice.textContent = "Bản preview đang hiển thị một tin minh họa; khi backend production được nối, URL ?id=... sẽ tải dữ liệu thật.";
    return;
  }
  try { await renderLive(id); }
  catch (error) {
    if (notice) notice.textContent = friendlyError(error);
    if (host) host.innerHTML = `<div class="panel"><h1>Không tìm thấy tin</h1><p>Tin có thể đã bị gỡ, hết hạn hoặc không còn công khai.</p><a class="btn btn-primary" href="mua-vot.html">Quay lại chợ vợt</a></div>`;
  }
}
init();

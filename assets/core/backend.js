const CONFIG = window.__CHOVOT_CONFIG__ || {};
let accessToken = "";
let refreshInFlight = null;

export class BackendUnavailableError extends Error {
  constructor(message = "Backend ChoVot chưa được cấu hình cho môi trường này.") {
    super(message); this.name = "BackendUnavailableError"; this.code = "BACKEND_UNAVAILABLE";
  }
}

export class AuthRequiredError extends Error {
  constructor(message = "AUTH_REQUIRED") { super(message); this.name = "AuthRequiredError"; this.code = "AUTH_REQUIRED"; }
}

export function backendConfig() {
  const apiBaseUrl = String(CONFIG.apiBaseUrl || "").replace(/\/$/, "");
  return Object.freeze({ environment: CONFIG.environment || "preview", configured: Boolean(apiBaseUrl), apiBaseUrl });
}

function base() {
  const cfg = backendConfig();
  if (!cfg.configured) throw new BackendUnavailableError();
  return cfg.apiBaseUrl;
}

function errorFromPayload(payload, status) {
  const raw = payload?.message;
  const message = Array.isArray(raw) ? raw.join("; ") : String(raw || payload?.error || `HTTP_${status}`);
  const error = status === 401 ? new AuthRequiredError(message) : new Error(message);
  error.code = status === 401 ? "AUTH_REQUIRED" : message;
  error.status = status;
  return error;
}

async function readPayload(response) {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json().catch(() => ({}));
  const text = await response.text().catch(() => "");
  return text ? { message: text } : {};
}

export function setAccessToken(token) { accessToken = String(token || ""); }
export function clearAccessToken() { accessToken = ""; }

export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = fetch(`${base()}/auth/refresh`, { method: "POST", credentials: "include", headers: { accept: "application/json" } })
    .then(async response => {
      const payload = await readPayload(response);
      if (!response.ok || !payload?.accessToken) { clearAccessToken(); throw new AuthRequiredError(payload?.message || "AUTH_REQUIRED"); }
      setAccessToken(payload.accessToken); return accessToken;
    })
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function getAccessToken() {
  if (accessToken) return accessToken;
  return refreshAccessToken();
}

export async function api(path, options = {}) {
  const { auth = false, retryAuth = true, body, headers = {}, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("accept", "application/json");
  let requestBody = body;
  if (body && !(body instanceof FormData) && typeof body !== "string" && !(body instanceof Blob)) {
    requestHeaders.set("content-type", "application/json"); requestBody = JSON.stringify(body);
  }
  if (auth) {
    try { requestHeaders.set("authorization", `Bearer ${await getAccessToken()}`); }
    catch { throw new AuthRequiredError(); }
  }
  const response = await fetch(`${base()}${path.startsWith("/") ? path : `/${path}`}`, { ...rest, headers: requestHeaders, body: requestBody, credentials: "include" });
  if (response.status === 401 && auth && retryAuth) {
    clearAccessToken(); await refreshAccessToken();
    return api(path, { ...options, retryAuth: false });
  }
  const payload = await readPayload(response);
  if (!response.ok) throw errorFromPayload(payload, response.status);
  return payload;
}

export async function requireUser() {
  try { return await api("/me", { auth: true }); }
  catch (error) { if (error?.status === 401 || error?.code === "AUTH_REQUIRED") throw new AuthRequiredError(); throw error; }
}

const FRIENDLY = {
  AUTH_REQUIRED: "Vui lòng đăng nhập trước khi tiếp tục.",
  SELLER_VERIFICATION_REQUIRED: "Bạn cần hoàn tất xác thực người bán trước khi gửi tin duyệt.",
  OTP_PROVIDER_NOT_CONFIGURED: "Hệ thống gửi OTP production chưa được cấu hình.",
  KYC_PROVIDER_NOT_CONFIGURED: "Nhà cung cấp eKYC production chưa được cấu hình.",
  MESSAGE_RATE_LIMIT: "Bạn gửi tin quá nhanh. Vui lòng thử lại sau.",
  PHONE_ALREADY_USED: "Số điện thoại này đã thuộc một tài khoản khác.",
  LISTING_NOT_FOUND: "Không tìm thấy tin đăng hoặc tin không còn công khai.",
};
export function friendlyError(error) {
  if (!error) return "Đã có lỗi xảy ra.";
  if (error instanceof BackendUnavailableError) return error.message;
  const code = String(error.code || error.message || "");
  return FRIENDLY[code] || FRIENDLY[code.split(":")[0]] || (typeof error.message === "string" && error.message ? error.message : "Đã có lỗi xảy ra. Vui lòng thử lại.");
}

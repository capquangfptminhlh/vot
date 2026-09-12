const CONFIG = window.__CHOVOT_CONFIG__ || {};
let singleton = null;
let loading = null;

export class BackendUnavailableError extends Error {
  constructor(message = "Backend ChoVot chưa được cấu hình cho môi trường này.") {
    super(message);
    this.name = "BackendUnavailableError";
  }
}

export function backendConfig() {
  return Object.freeze({
    environment: CONFIG.environment || "preview",
    configured: Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey),
    supabaseUrl: CONFIG.supabaseUrl || "",
  });
}

export async function getSupabase() {
  if (singleton) return singleton;
  if (loading) return loading;
  if (!CONFIG.supabaseUrl || !CONFIG.supabasePublishableKey) throw new BackendUnavailableError();

  loading = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
    .then(({ createClient }) => {
      singleton = createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey, {
        db: { schema: "public" },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
        global: { headers: { "x-client-info": "chovot-web" } },
      });
      return singleton;
    })
    .finally(() => { loading = null; });

  return loading;
}

export async function requireUser() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data?.user) {
    const err = new Error("AUTH_REQUIRED");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return data.user;
}

export function friendlyError(error) {
  if (!error) return "Đã có lỗi xảy ra.";
  if (error instanceof BackendUnavailableError) return error.message;
  if (error.code === "AUTH_REQUIRED") return "Vui lòng đăng nhập trước khi tiếp tục.";
  if (typeof error.message === "string" && error.message) return error.message;
  return "Đã có lỗi xảy ra. Vui lòng thử lại.";
}

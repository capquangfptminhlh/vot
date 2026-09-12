(() => {
  const current = window.__CHOVOT_CONFIG__ || {};
  window.__CHOVOT_CONFIG__ = Object.freeze({
    environment: current.environment || "preview",
    supabaseUrl: current.supabaseUrl || "",
    supabasePublishableKey: current.supabasePublishableKey || "",
    kycProvider: current.kycProvider || "disabled",
    sentryDsn: current.sentryDsn || "",
  });
})();

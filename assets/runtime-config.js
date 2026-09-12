(() => {
  const current = window.__CHOVOT_CONFIG__ || {};
  window.__CHOVOT_CONFIG__ = Object.freeze({
    environment: current.environment || "preview",
    apiBaseUrl: String(current.apiBaseUrl || "").replace(/\/$/, ""),
    kycProvider: current.kycProvider || "disabled",
    sentryDsn: current.sentryDsn || "",
  });
})();

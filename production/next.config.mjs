/** @type {import('next').NextConfig} */
const nextConfig={
  images:{dangerouslyAllowSVG:true,contentDispositionType:'attachment',contentSecurityPolicy:"default-src 'self'; script-src 'none'; sandbox;"},
  poweredByHeader:false,
  compress:true,
}
export default nextConfig

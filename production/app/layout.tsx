import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import './globals.css'
import { footerGroups, nav, site } from '@/lib/site'

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — Chợ vợt có xác thực`, template: `%s | ${site.shortName}` },
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: site.locale, siteName: site.name, title: `${site.name} — Chợ vợt có xác thực`, description: site.description, url: '/' },
  twitter: { card: 'summary_large_image', title: site.name, description: site.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
}

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.name,
  url: site.url,
  logo: `${site.url}/brand/logo.svg`,
  description: site.description,
  email: site.email,
  sameAs: site.social,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
        <header className="header">
          <div className="container nav">
            <Link className="brand" href="/" aria-label="ChoVot Pickleball - Trang chủ">
              <Image src="/brand/icon.svg" width={40} height={40} alt="" priority />
              <span>ChoVot <strong style={{ color: 'var(--green)' }}>Pickleball</strong></span>
            </Link>
            <nav className="navlinks" aria-label="Điều hướng chính">
              {nav.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </nav>
            <div className="actions">
              <Link className="btn" href="/dang-nhap">Đăng nhập</Link>
              <Link className="btn lime" href="/dang-ban">＋ Đăng bán</Link>
            </div>
          </div>
        </header>
        {children}
        <footer className="footer">
          <div className="container footerGrid">
            <div>
              <Link className="brand" href="/"><Image src="/brand/icon.svg" width={40} height={40} alt="" /><span>ChoVot Pickleball</span></Link>
              <p>{site.description}</p><p><strong>{site.tagline}</strong></p>
            </div>
            {footerGroups.map(group => <div key={group.title}><h4>{group.title}</h4>{group.links.map(([href,label]) => <Link key={href} href={href}>{label}</Link>)}</div>)}
          </div>
          <div className="container legal">© {new Date().getFullYear()} ChoVot Pickleball. Nội dung và dữ liệu giao dịch phải được xác minh trước khi công bố.</div>
        </footer>
      </body>
    </html>
  )
}

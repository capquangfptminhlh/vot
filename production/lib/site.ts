export const site = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'ChoVot Pickleball',
  shortName: 'ChoVot',
  description: 'Marketplace chuyên mua bán, định giá và giao dịch vợt pickleball với hồ sơ người mua, người bán được xác thực.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  locale: 'vi_VN',
  language: 'vi',
  email: 'support@chovot.vn',
  tagline: 'Người thật • Vợt thật • Giao dịch minh bạch',
  social: [] as string[],
}

export const nav = [
  { href: '/marketplace', label: 'Mua vợt' },
  { href: '/dang-ban', label: 'Bán vợt' },
  { href: '/blog', label: 'Kiến thức' },
  { href: '/an-toan-giao-dich', label: 'An toàn' },
  { href: '/gioi-thieu', label: 'Giới thiệu' },
]

export const footerGroups = [
  { title: 'Marketplace', links: [
    ['/marketplace','Mua vợt'], ['/dang-ban','Đăng bán'], ['/blog','Kiến thức pickleball']
  ]},
  { title: 'Tin cậy & pháp lý', links: [
    ['/an-toan-giao-dich','An toàn giao dịch'], ['/dieu-khoan','Điều khoản'], ['/chinh-sach-rieng-tu','Chính sách riêng tư']
  ]},
  { title: 'Hỗ trợ', links: [
    ['/ho-tro','Trung tâm hỗ trợ'], ['/gioi-thieu','Về ChoVot']
  ]},
] as const

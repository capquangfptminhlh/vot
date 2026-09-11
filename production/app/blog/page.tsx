import type { Metadata } from 'next'
import Link from 'next/link'
import { articles } from '@/lib/content'

export const metadata:Metadata={title:'Kiến thức Pickleball',description:'Hướng dẫn chọn vợt, mua vợt cũ, định giá và giao dịch pickleball minh bạch.'}

export default function BlogPage(){return <main><section className="pageHero"><div className="container"><span className="eyebrow">Kiến thức Pickleball</span><h1>Chọn vợt tốt hơn, giao dịch an toàn hơn</h1><p>Nội dung tập trung vào câu hỏi thật của người chơi, có câu trả lời trực tiếp và ngày cập nhật rõ ràng.</p></div></section><section className="section"><div className="container grid grid3">{articles.map(a=><Link className="card articleCard" key={a.slug} href={`/blog/${a.slug}`}><small>Cập nhật {new Date(a.updated).toLocaleDateString('vi-VN')}</small><h3>{a.title}</h3><p>{a.description}</p><strong style={{color:'var(--green)'}}>Đọc bài →</strong></Link>)}</div></section></main>}

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles, getArticle } from '@/lib/content'
import { site } from '@/lib/site'

const articleImages:Record<string,string>={
 'vot-pickleball-14mm-va-16mm':'/articles/14mm-vs-16mm.svg',
 'kiem-tra-vot-pickleball-cu':'/articles/check-vot-cu.svg',
 'dinh-gia-vot-pickleball-cu':'/articles/dinh-gia-vot-cu.svg',
}
export function generateStaticParams(){return articles.map(a=>({slug:a.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const a=getArticle(slug);if(!a)return{};const image=articleImages[a.slug];return{title:a.title,description:a.description,keywords:a.keywords,alternates:{canonical:`/blog/${a.slug}`},openGraph:{type:'article',title:a.title,description:a.description,url:`/blog/${a.slug}`,modifiedTime:a.updated,images:[{url:image,width:1200,height:630,alt:a.title}]},twitter:{card:'summary_large_image',title:a.title,description:a.description,images:[image]}}}

export default async function ArticlePage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const a=getArticle(slug);if(!a)notFound();const image=articleImages[a.slug];const schema={'@context':'https://schema.org','@type':'Article',headline:a.title,description:a.description,image:`${site.url}${image}`,datePublished:a.updated,dateModified:a.updated,inLanguage:'vi',mainEntityOfPage:`${site.url}/blog/${a.slug}`,author:{'@type':'Organization',name:site.name,url:site.url},publisher:{'@type':'Organization',name:site.name,logo:{'@type':'ImageObject',url:`${site.url}/brand/logo.svg`}}};const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Trang chủ',item:site.url},{'@type':'ListItem',position:2,name:'Kiến thức',item:`${site.url}/blog`},{'@type':'ListItem',position:3,name:a.title,item:`${site.url}/blog/${a.slug}`}]};return <main><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(crumbs)}}/><section className="section"><article className="container prose"><nav aria-label="Breadcrumb"><Link href="/">Trang chủ</Link> › <Link href="/blog">Kiến thức</Link></nav><h1>{a.title}</h1><p><small>Cập nhật: {new Date(a.updated).toLocaleDateString('vi-VN')} • Biên tập bởi ChoVot Pickleball</small></p><Image src={image} width={1200} height={630} alt={a.title} priority style={{borderRadius:24,margin:'24px 0'}}/><div className="answer"><strong>Câu trả lời nhanh</strong><p>{a.answer}</p></div><div dangerouslySetInnerHTML={{__html:a.html}}/><div className="answer"><strong>Bước tiếp theo</strong><p>Đang tìm mua? <Link href="/marketplace">Xem marketplace</Link>. Muốn bán? <Link href="/dang-ban">Đăng cây vợt của bạn</Link>.</p></div></article></section></main>}

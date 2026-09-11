import type { MetadataRoute } from 'next'
import { articles } from '@/lib/content'
import { site } from '@/lib/site'

export default function sitemap():MetadataRoute.Sitemap{
 const staticRoutes=['','/marketplace','/dang-ban','/blog','/gioi-thieu','/an-toan-giao-dich','/dieu-khoan','/chinh-sach-rieng-tu','/ho-tro']
 const now=new Date()
 return [
  ...staticRoutes.map(route=>({url:`${site.url}${route}`,lastModified:now,changeFrequency:route===''?'daily':'weekly' as const,priority:route===''?1:0.7})),
  ...articles.map(a=>({url:`${site.url}/blog/${a.slug}`,lastModified:new Date(a.updated),changeFrequency:'monthly' as const,priority:0.75}))
 ]
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const hasSupabaseEnv=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

export async function createSupabaseServerClient(){
 if(!hasSupabaseEnv()) throw new Error('Supabase environment variables are not configured')
 const store=await cookies()
 return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookies:{getAll(){return store.getAll()},setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}
 })
}

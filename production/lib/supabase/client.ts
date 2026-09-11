'use client'
import { createBrowserClient } from '@supabase/ssr'

export const hasSupabaseEnv=()=>Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
export function createSupabaseBrowserClient(){
 if(!hasSupabaseEnv()) throw new Error('Supabase environment variables are not configured')
 return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
}

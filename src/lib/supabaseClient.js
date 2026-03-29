import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tknrxiksvsmygtszlytf.supabase.co'
const supabaseAnonKey = 'sb_publishable_yY3njiGWMWufpD3P8UQUGw__rSc2B0i'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)


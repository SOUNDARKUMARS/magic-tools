import {createClient} from '@supabase/supabase-js'

export const supabase=createClient( //TODO: move to .env
    process.env.REACT_APP_SUPABASE_URL,
    process.env.REACT_APP_SUPABASE_API_KEY
)
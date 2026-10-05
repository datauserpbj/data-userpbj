import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
  const raw = fs.readFileSync(envPath, 'utf-8')
  const parsed = Object.fromEntries(
    raw.split(/\r?\n/).map((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match) return null
      let value = match[2]
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      return [match[1], value]
    }).filter(Boolean)
  )
} else {
  var parsed = {}
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || parsed.SUPABASE_URL || parsed['VITE_SUPABASE_URL']
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || parsed.SUPABASE_SERVICE_ROLE_KEY || parsed['VITE_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

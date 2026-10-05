import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

async function verify() {
  console.log('Verifying Supabase connection...')
  console.log('URL:', url)

  const { data, error } = await supabase
    .from('formulir_pengajuan')
    .select('count', { count: 'exact', head: true })

  if (error) {
    console.error('Connection failed:', error.message)
    console.error('Hint: Have you run the SQL migrations? Check supabase/migrations/setup.sql')
    process.exit(1)
  }

  console.log('Connection successful!')
  console.log('formulir_pengajuan table exists and is accessible.')

  const tables = [
    'formulir_pengajuan',
    'dokumen',
    'admin_verifikator',
    'admin_pemohon',
    'satker',
    'ppk',
    'pp',
  ]

  for (const table of tables) {
    const { error: tableError } = await supabase
      .from(table)
      .select('*', { head: true, limit: 1 })

    if (tableError) {
      console.error(`Table "${table}" not found or not accessible:`, tableError.message)
      process.exit(1)
    }
    console.log(`  [OK] ${table}`)
  }

  console.log('\nAll tables verified successfully!')
}

verify().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})

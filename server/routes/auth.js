import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import bcrypt from 'bcryptjs'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password harus diisi' })
    }

    const { data: admin, error } = await supabase
      .from('admin_verifikator')
      .select('*')
      .ilike('email', email.toLowerCase())
      .single()

    if (error || !admin) {
      return res.status(401).json({ error: 'Email atau password salah' })
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash)
    const isPlainText = admin.password_hash === password

    if (!passwordMatch && !isPlainText) {
      return res.status(401).json({ error: 'Email atau password salah' })
    }

    if (isPlainText) {
      const hashed = await bcrypt.hash(password, 10)
      await supabase
        .from('admin_verifikator')
        .update({ password_hash: hashed })
        .eq('id', admin.id)
    }

    res.json({
      data: {
        id: admin.id,
        email: admin.email,
        nama_lengkap: admin.nama_lengkap,
        role: admin.role || 'verifikator',
      },
      error: null,
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Gagal login' })
  }
})

export default router

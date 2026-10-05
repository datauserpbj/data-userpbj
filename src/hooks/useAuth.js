import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import bcrypt from 'bcryptjs'

const STORAGE_KEY = 'lpse_auth_user'

function getStoredUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setStoredUser(user) {
  if (typeof window === 'undefined') return
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      const stored = getStoredUser()
      if (stored) setUser(stored)
      setLoading(false)
      return
    }

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUser(session.user)
          setStoredUser(session.user)
        } else {
          const stored = getStoredUser()
          if (stored) setUser(stored)
        }
      } catch (error) {
        const stored = getStoredUser()
        if (stored) setUser(stored)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setUser(session.user)
          setStoredUser(session.user)
        } else {
          const stored = getStoredUser()
          if (stored) {
            setUser(stored)
          } else {
            setUser(null)
            setStoredUser(null)
          }
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password, table) => {
    if (!supabase) {
      return { error: { message: 'Supabase belum dikonfigurasi' } }
    }

    const { data: admin, error: adminError } = await supabase
      .from(table)
      .select('*')
      .ilike('email', email.toLowerCase())
      .maybeSingle()

    if (adminError || !admin) {
      return { error: { message: 'Email atau password salah' } }
    }

    const passwordMatch = await bcrypt.compare(password, admin.password_hash)
    const isPlainText = admin.password_hash === password

    if (!passwordMatch && !isPlainText) {
      return { error: { message: 'Email atau password salah' } }
    }

    if (isPlainText) {
      const hashed = await bcrypt.hash(password, 10)
      await supabase
        .from(table)
        .update({ password_hash: hashed })
        .eq('id', admin.id)
    }

    const dbUser = {
      id: admin.id,
      email: admin.email,
      nama_lengkap: admin.nama_lengkap,
      role: admin.role || 'verifikator',
    }

    setUser(dbUser)
    setStoredUser(dbUser)

    return { data: dbUser, error: null }
  }

  const signOut = async () => {
    setUser(null)
    setStoredUser(null)
    if (!supabase) {
      return { error: { message: 'Supabase belum dikonfigurasi' } }
    }

    const result = await supabase.auth.signOut()
    if (!result) {
      return { error: null }
    }
    return { error: result.error }
  }

  return { user, loading, signIn, signOut }
}

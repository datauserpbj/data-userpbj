import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function ProfilPopup({ open, onClose }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setProfile(null)
    setLoading(true)

    const loadProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('admin_verifikator')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error || !data) {
          setProfile({
            nama_lengkap: user.nama_lengkap || user.user_metadata?.nama_lengkap || user.email?.split('@')[0] || 'User',
            email: user.email || '-',
            role: user.role || user.user_metadata?.role || 'verifikator',
          })
        } else {
          setProfile(data)
        }
      } catch {
        setProfile({
          nama_lengkap: user.nama_lengkap || user.user_metadata?.nama_lengkap || user.email?.split('@')[0] || 'User',
          email: user.email || '-',
          role: user.role || user.user_metadata?.role || 'verifikator',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [open, user])

  const handleLogout = async () => {
    onClose()
    const { error } = await signOut()
    if (!error) {
      navigate('/loginverifikator')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full md:w-80 bg-surface border-t md:border border-outline-variant rounded-t-xl md:rounded-xl shadow-xl p-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-md">
          <h3 className="text-label-md font-bold text-primary">Profil</h3>
          <button onClick={onClose} className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-md">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : profile ? (
          <div className="space-y-sm">
            <div className="flex items-center gap-sm">
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
              </div>
              <div className="min-w-0">
                <p className="text-body-sm font-bold text-primary truncate">{profile.nama_lengkap || 'User'}</p>
                <p className="text-xs text-on-surface-variant truncate">{profile.email || '-'}</p>
              </div>
            </div>
            <div className="border-t border-outline-variant pt-sm">
              <button
                onClick={handleLogout}
                className="w-full px-md py-sm bg-error text-on-error rounded-lg font-label-md font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-xs"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
                Keluar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-sm">
            <button
              onClick={handleLogout}
              className="w-full px-md py-sm bg-error text-on-error rounded-lg font-label-md font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-xs"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Keluar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

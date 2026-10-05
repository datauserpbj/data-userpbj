import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function ProfilVerifikator() {
  const [profile, setProfile] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
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

        if (error) {
          console.error('Error fetching profile:', error)
          setProfile({
            nama_lengkap: user.user_metadata?.nama_lengkap || user.email?.split('@')[0] || 'User',
            email: user.email || '-',
            role: user.user_metadata?.role || 'verifikator',
          })
        } else if (data) {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
        setProfile({
          nama_lengkap: user.user_metadata?.nama_lengkap || user.email?.split('@')[0] || 'User',
          email: user.email || '-',
          role: user.user_metadata?.role || 'verifikator',
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleLogout = async () => {
    const { error } = await signOut()
    if (!error) {
      navigate('/loginverifikator')
    } else {
      alert('Gagal keluar. Silakan coba lagi.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Profil Saya</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Informasi akun dan pengaturan profil verifikator.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm mb-lg">
          <div className="flex items-center gap-md mb-lg">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
            </div>
            <div>
              <h3 className="text-headline-sm font-headline-sm text-primary">{profile?.nama_lengkap || 'User'}</h3>
              <p className="text-body-sm text-on-surface-variant">{profile?.email || '-'}</p>
              <span className="inline-block mt-xs px-sm py-1 rounded-full text-xs font-semibold bg-secondary-container/10 text-on-secondary-container border border-secondary-container/30">
                {profile?.role === 'admin' ? 'Administrator' : 'Verifikator'}
              </span>
            </div>
          </div>

          <div className="space-y-md border-t border-outline-variant pt-md">
            <div className="space-y-xs">
              <label className="text-label-sm text-on-surface-variant">Nama Lengkap</label>
              <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                {profile?.nama_lengkap || '-'}
              </div>
            </div>
            <div className="space-y-xs">
              <label className="text-label-sm text-on-surface-variant">Email</label>
              <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                {profile?.email || '-'}
              </div>
            </div>
            <div className="space-y-xs">
              <label className="text-label-sm text-on-surface-variant">Peran</label>
              <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                {profile?.role === 'admin' ? 'Administrator' : profile?.role === 'verifikator' ? 'Verifikator' : profile?.role || '-'}
              </div>
            </div>
            {profile?.id && (
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">ID Pengguna</label>
                <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                  {profile.id}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm">
          <h4 className="text-headline-sm font-headline-sm text-primary mb-md">Aksi</h4>
          <div className="space-y-sm">
            <button
              onClick={handleLogout}
              className="w-full px-md py-sm bg-error text-on-error rounded-lg font-label-md font-semibold hover:opacity-90 transition-colors flex items-center justify-center gap-xs"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              Keluar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

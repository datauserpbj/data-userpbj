import React from 'react'
import { useAuth } from '../hooks/useAuth'
import ProfilPopup from '../components/ProfilPopup'

export default function TopNavBar({ onToggleSidebar, sidebarOpen }) {
  const [profileOpen, setProfileOpen] = React.useState(false)
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-md py-xs bg-surface dark:bg-surface border-b border-outline-variant dark:border-outline">
      <div className="flex items-center gap-md">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-full hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-primary dark:text-primary-fixed">menu</span>
        </button>
        <h1 className="text-headline-sm font-headline-sm font-bold text-primary dark:text-primary-fixed">LPSE DocVerify</h1>
      </div>

      <div className="hidden md:flex items-center gap-sm">
        <button
          onClick={() => setProfileOpen((prev) => !prev)}
          className="flex items-center gap-sm p-1 rounded-full hover:bg-surface-container-low transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
          </div>
          <span className="text-label-sm font-semibold text-primary">
            {user?.user_metadata?.nama_lengkap || user?.email?.split('@')[0] || 'Admin'}
          </span>
        </button>
      </div>

      <ProfilPopup open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  )
}

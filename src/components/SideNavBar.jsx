import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function SideNavBar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [riwayatOpen, setRiwayatOpen] = React.useState(false)

  const isActive = (path) => location.pathname === path

  const menuItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      path: '/verifikator',
      activeStyle: 'bg-secondary-container text-on-secondary-container font-semibold',
      inactiveStyle: 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest',
    },
    {
      label: 'Pengajuan Masuk',
      icon: 'inbox',
      path: '/pengajuan-masuk',
      activeStyle: 'bg-secondary-container text-on-secondary-container font-semibold',
      inactiveStyle: 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest',
    },
    {
      label: 'Laporan',
      icon: 'assessment',
      path: '/laporanverifikator',
      activeStyle: 'bg-secondary-container text-on-secondary-container font-semibold',
      inactiveStyle: 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest',
    },
  ]

  const riwayatSubmenu = [
    {
      label: 'Data PPK',
      icon: 'badge',
      path: '/datappk',
      activeStyle: 'bg-secondary-container text-on-secondary-container font-semibold',
      inactiveStyle: 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest',
    },
    {
      label: 'Data PP',
      icon: 'workspaces',
      path: '/datapp',
      activeStyle: 'bg-secondary-container text-on-secondary-container font-semibold',
      inactiveStyle: 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest',
    },
  ]

  const systemItems = []

  const handleNavigate = (path) => {
    if (path !== '#') {
      navigate(path)
    }
    onClose?.()
  }

  const riwayatActive = riwayatSubmenu.some(item => isActive(item.path))

  return (
    <>
      <aside
        className={`
          fixed top-16 bottom-0 left-0 w-72 flex flex-col pb-md z-40
          bg-surface-container-low dark:bg-surface-container-lowest border-r border-outline-variant dark:border-outline
          transform transition-transform duration-300 ease-in-out
          md:fixed md:top-16 md:bottom-0 md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="px-md pt-sm mb-lg">
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-sm">shield</span>
            </div>
            <div>
              <p className="text-label-md font-black text-primary leading-tight">Administrator</p>
              <p className="text-xs text-on-surface-variant font-medium">Official Portal</p>
            </div>
          </div>
          </div>

        <nav className="flex-1 px-sm space-y-xs overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const active = isActive(item.path)
            return (
              <a
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`flex items-center gap-sm px-md py-sm cursor-pointer transition-all rounded-lg font-label-md text-label-md ${active ? item.activeStyle : item.inactiveStyle}`}
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </a>
            )
          })}

          <div className="space-y-xs">
            <a
              onClick={() => setRiwayatOpen((prev) => !prev)}
              className={`flex items-center gap-sm px-md py-sm cursor-pointer transition-all rounded-lg font-label-md text-label-md ${riwayatActive ? 'bg-secondary-container text-on-secondary-container font-semibold' : 'text-on-surface-variant hover:bg-surface-variant dark:hover:bg-surface-container-highest'}`}
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
              <span className="whitespace-nowrap flex-1">Riwayat PPK & PP</span>
              <span className={`material-symbols-outlined text-sm transition-transform ${riwayatOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </a>
            {riwayatOpen && (
              <div className="ml-4 pl-md border-l border-outline-variant space-y-xs">
                {riwayatSubmenu.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <a
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={`flex items-center gap-sm px-md py-sm cursor-pointer transition-all rounded-lg font-label-md text-label-md ${active ? item.activeStyle : item.inactiveStyle}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {systemItems.map((item) => (
            <a
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className="flex items-center gap-sm px-md py-sm cursor-pointer transition-all text-on-surface-variant hover:bg-surface-variant font-label-md text-label-md"
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
      </aside>
    </>
  )
}
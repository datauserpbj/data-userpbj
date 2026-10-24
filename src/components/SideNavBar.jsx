import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function SideNavBar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path
  const [openGroup, setOpenGroup] = React.useState('kelola')

  const menuGroups = [
    {
      label: 'Utama',
      collapsible: false,
      items: [
        { label: 'Dashboard', icon: 'dashboard', path: '/verifikator' },
        { label: 'Laporan PPK & PP', icon: 'assessment', path: '/laporanverifikator' },
      ],
    },
    {
      label: 'Kelola Data',
      icon: 'folder',
      collapsible: true,
      items: [
        { label: 'Data PPK', icon: 'badge', path: '/datappk' },
        { label: 'Data PP', icon: 'workspaces', path: '/datapp' },
        { label: 'Data Satker', icon: 'account_tree', path: '/datasatker' },
        { label: 'Data Bidang/Bagian', icon: 'category', path: '/databidang' },
      ],
    },
    {
      label: 'Akun',
      collapsible: false,
      items: [
        { label: 'Profil', icon: 'person', path: '/profil' },
      ],
    },
  ]

  const toggleGroup = (key) => {
    setOpenGroup((prev) => (prev === key ? null : key))
  }

  const handleNavigate = (path) => {
    if (path !== '#') navigate(path)
    onClose?.()
  }

  const isGroupActive = (group) => group.items.some((item) => isActive(item.path))

  return (
    <>
      <aside
        className={`
          fixed top-16 bottom-0 left-0 w-72 flex flex-col z-40
          bg-white dark:bg-surface-container-lowest border-r border-outline-variant/60
          transform transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="px-md pt-8 pb-sm">
          <div className="flex items-center gap-sm">
            <div className="leading-none">
              <p className="text-headline-sm font-headline-sm font-bold text-primary">Administrator</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">Official Panel</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-md mb-sm h-px bg-outline-variant/40" />

        {/* Navigation */}
        <nav className="flex-1 px-sm space-y-0.5 overflow-y-auto custom-scrollbar">
          {menuGroups.map((group) => {
            const groupActive = isGroupActive(group)
            const groupOpen = openGroup === group.label || (!group.collapsible && groupActive)

            if (!group.collapsible) {
              return (
                <div key={group.label} className="mb-1">
                  {group.items.map((item) => {
                    const active = isActive(item.path)
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => handleNavigate(item.path)}
                        className={`
                          group w-full flex items-center gap-sm px-md py-sm rounded-lg
                          text-left transition-all duration-150
                          ${active
                            ? 'bg-primary/8 text-primary font-semibold shadow-sm ring-1 ring-primary/10'
                            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'}
                        `}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] transition-colors ${active ? 'text-primary' : 'text-outline group-hover:text-primary'}`}
                          style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {item.icon}
                        </span>
                        <span className="text-label-md font-medium whitespace-nowrap">{item.label}</span>
                        {active && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            }

            return (
              <div key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center gap-sm px-md py-sm rounded-lg text-left transition-colors hover:bg-surface-container-low"
                >
                  <span
                    className={`material-symbols-outlined text-[20px] text-outline group-hover:text-primary transition-transform duration-200 ${groupOpen ? 'rotate-90' : ''}`}
                    style={groupOpen ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {group.icon}
                  </span>
                  <span className="text-label-md font-medium whitespace-nowrap text-on-surface-variant">{group.label}</span>
                  <span className="ml-auto material-symbols-outlined text-outline text-sm">
                    {groupOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {groupOpen && (
                  <div className="ml-4 space-y-0.5 border-l-2 border-outline-variant/30 pl-3">
                    {group.items.map((item) => {
                      const active = isActive(item.path)
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => { handleNavigate(item.path); setOpenGroup(group.label) }}
                          className={`
                            w-full flex items-center gap-sm px-md py-sm rounded-lg text-left
                            transition-all duration-150 text-sm
                            ${active
                              ? 'bg-primary/8 text-primary font-medium shadow-sm ring-1 ring-primary/10'
                              : 'text-on-surface-variant/80 hover:bg-surface-container-low hover:text-primary'}
                          `}
                        >
                          <span className="w-5 material-symbols-outlined text-outline group-hover:text-primary">
                            {item.icon}
                          </span>
                          <span className="text-label-sm font-medium whitespace-nowrap">{item.label}</span>
                          {active && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-md py-sm border-t border-outline-variant/40">
          <p className="text-[10px] text-on-surface-variant/70 text-center">LPSE Kab. Bungo · Verifikator</p>
        </div>
      </aside>
    </>
  )
}

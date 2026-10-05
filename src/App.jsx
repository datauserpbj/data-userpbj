import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopNavBar from './components/TopNavBar'
import SideNavBar from './components/SideNavBar'
import PengajuanForm from './pages/PengajuanForm'
import EditPengajuan from './pages/EditPengajuan'
import CekStatus from './pages/CekStatus'
import KolomCekStatus from './pages/KolomCekStatus'
import LoginVerifikator from './pages/LoginVerifikator'
import DashboardVerifikator from './pages/DashboardVerifikator'
import PengajuanMasuk from './pages/PengajuanMasuk'
import DetailPengajuan from './pages/DetailPengajuan'
import LaporanVerifikator from './pages/LaporanVerifikator'
import DataPPK from './pages/DataPPK'
import DataPP from './pages/DataPP'
import ProfilVerifikator from './pages/ProfilVerifikator'

function ProtectedRoute({ children }) {
  return children
}

function PublicRoute({ children }) {
  return children
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopNavBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="flex min-h-screen pt-16">
        <SideNavBar open={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 bg-background px-4 md:px-6 md:ml-72">
          {children}
        </main>
      </div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/loginverifikator" element={
          <PublicRoute>
            <LoginVerifikator />
          </PublicRoute>
        } />

        {/* Protected Routes */}
        <Route path="/verifikator" element={
          <ProtectedRoute>
            <AppLayout>
              <DashboardVerifikator />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/pengajuan-masuk" element={
          <ProtectedRoute>
            <AppLayout>
              <PengajuanMasuk />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/pengajuan-masuk/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <DetailPengajuan />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/laporanverifikator" element={
          <ProtectedRoute>
            <AppLayout>
              <LaporanVerifikator />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/datappk" element={
          <ProtectedRoute>
            <AppLayout>
              <DataPPK />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/datapp" element={
          <ProtectedRoute>
            <AppLayout>
              <DataPP />
            </AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/profil" element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilVerifikator />
            </AppLayout>
          </ProtectedRoute>
        } />

        {/* Default Route */}
        <Route path="/" element={
          <PublicRoute>
            <PengajuanForm />
          </PublicRoute>
        } />
        <Route path="/edit-pengajuan/:id" element={
          <PublicRoute>
            <EditPengajuan />
          </PublicRoute>
        } />

        {/* Cek Status Route */}
        <Route path="/cek-status" element={
          <PublicRoute>
            <CekStatus />
          </PublicRoute>
        } />

        {/* Kolom Cek Status Route */}
        <Route path="/kolom-cek-status" element={
          <PublicRoute>
            <KolomCekStatus />
          </PublicRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

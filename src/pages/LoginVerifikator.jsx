import React from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginVerifikator() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  if (user) {
    return <Navigate to="/verifikator" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedPassword = password.trim()

    const { data, error: err } = await signIn(trimmedEmail, trimmedPassword, 'admin_verifikator')

    if (err) {
      setError(err.message)
      return
    }

    if (data) {
      navigate('/verifikator')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 bg-surface rounded-xl shadow-lg border border-outline-variant">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Login Verifikator</h1>
          <p className="text-on-surface-variant mt-2">Masuk sebagai admin verifikator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="nama@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-outline-variant rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors"
          >
            Masuk
          </button>
        </form>
      </div>
    </div>
  )
}

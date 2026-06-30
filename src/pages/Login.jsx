import { useState } from 'react'
import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import logoAlcaldia from '../assets/logo-alcaldia.png'
import { authService } from '../services/authService'

export default function Login({ onLogin = () => {} }) {
  const [formData, setFormData] = useState({ usuario: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { usuario, password } = formData

    if (!usuario.trim() || !password.trim()) {
      setError('Por favor, ingrese usuario y contraseña.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await authService.login(usuario.trim(), password)
      onLogin(result.roleString)
    } catch (err) {
      console.error('Error al iniciar sesión:', err)
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message)
      } else {
        setError('No se pudo conectar con el servidor. Verifique su conexión.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white shadow-xl rounded-3xl p-8">
        <div className="flex flex-col items-center mb-8">
          <img
            src={logoAlcaldia}
            alt="Logo Alcaldía"
            className="w-24 h-24 rounded-full object-cover mb-4"
          />
          <h1 className="text-2xl font-semibold text-gray-900 text-center">Sistema de Recaudación Municipal</h1>
          <p className="mt-2 text-sm text-gray-500 text-center">Accede con tu usuario y contraseña institucional</p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="mb-2 bg-red-50 text-red-600 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Usuario</span>
              <div className="mt-1 relative rounded-2xl border border-gray-200 focus-within:border-green-800 focus-within:ring-2 focus-within:ring-green-800/20 transition">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                  <User className="w-5 h-5" />
                </span>
                <input
                  name="usuario"
                  type="text"
                  value={formData.usuario}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Ingrese su usuario"
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-none outline-none text-gray-900"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Contraseña</span>
              <div className="mt-1 relative rounded-2xl border border-gray-200 focus-within:border-green-800 focus-within:ring-2 focus-within:ring-green-800/20 transition">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  placeholder="Ingrese su contraseña"
                  className="w-full pl-12 pr-12 py-3 bg-white rounded-2xl border-none outline-none text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-green-800 text-white font-semibold hover:bg-green-700 transition disabled:bg-green-800/50 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div className="mt-4">
            <div className="text-right mb-6">
              <a
                href="#"
                className="text-sm text-gray-600 hover:text-green-800 transition"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <a href="#" className="font-bold text-green-800 hover:underline">
                  Solicitar acceso
                </a>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

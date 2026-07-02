import { useState } from 'react'
import { User, Lock, Eye, EyeOff, AlertCircle, X, Mail } from 'lucide-react'
import logoAlcaldia from '../assets/logo-alcaldia.png'
import { authService } from '../services/authService'

export default function Login({ onLogin = () => {} }) {
  const [formData, setFormData] = useState({ usuario: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [registerData, setRegisterData] = useState({ usuari_nm: '', usuari_ap: '', usuari_cd: '', usuari_em: '', usuari_co: '' })
  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState('')

  const handleRegisterChange = (e) => {
    const { name, value } = e.target
    setRegisterData((prev) => ({ ...prev, [name]: value }))
  }

  // Reglas de validación de contraseña
  const passwordRules = [
    { id: 'length',   label: 'Mínimo 8 caracteres',       test: (p) => p.length >= 8 },
    { id: 'upper',    label: 'Al menos una mayúscula',     test: (p) => /[A-Z]/.test(p) },
    { id: 'number',   label: 'Al menos un número',         test: (p) => /[0-9]/.test(p) },
    { id: 'special',  label: 'Al menos un carácter especial (@#!$%...)', test: (p) => /[^A-Za-z0-9]/.test(p) },
  ]

  const getPasswordStrength = (p) => {
    const passed = passwordRules.filter(r => r.test(p)).length
    if (passed <= 1) return { label: 'Muy débil', color: 'bg-red-500', width: 'w-1/4' }
    if (passed === 2) return { label: 'Débil',    color: 'bg-orange-400', width: 'w-2/4' }
    if (passed === 3) return { label: 'Buena',    color: 'bg-yellow-400', width: 'w-3/4' }
    return { label: 'Fuerte', color: 'bg-green-500', width: 'w-full' }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    setRegisterError('')
    setRegisterSuccess('')

    const { usuari_nm, usuari_ap, usuari_cd, usuari_co, usuari_em } = registerData
    if (!usuari_nm || !usuari_ap || !usuari_cd || !usuari_co || !usuari_em) {
      setRegisterError('Todos los campos son obligatorios.')
      return
    }

    // Validar que la contraseña cumple todas las reglas
    const failedRules = passwordRules.filter(r => !r.test(usuari_co))
    if (failedRules.length > 0) {
      setRegisterError(`La contraseña no cumple: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`)
      return
    }

    setRegisterLoading(true)
    try {
      await authService.solicitarAcceso(registerData)
      setRegisterSuccess('Solicitud enviada correctamente. Un administrador evaluará tu acceso.')
      setRegisterData({ usuari_nm: '', usuari_ap: '', usuari_cd: '', usuari_em: '', usuari_co: '' })
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setRegisterError(err.response.data.message)
      } else {
        setRegisterError('Error al enviar la solicitud.')
      }
    } finally {
      setRegisterLoading(false)
    }
  }

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
                <button 
                  type="button" 
                  onClick={() => setShowRegisterModal(true)} 
                  className="font-bold text-green-800 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Solicitar acceso
                </button>
              </p>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Solicitud de Acceso */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => {
                setShowRegisterModal(false)
                setRegisterSuccess('')
                setRegisterError('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Solicitar Acceso</h2>
            <p className="text-sm text-gray-500 mb-6">Completa el formulario para solicitar una cuenta. Deberá ser aprobada por el administrador.</p>
            
            {registerSuccess ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 text-center">
                <p className="font-semibold">{registerSuccess}</p>
                <button 
                  onClick={() => setShowRegisterModal(false)}
                  className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {registerError && (
                  <div className="bg-red-50 text-red-600 rounded-lg p-3 flex items-center gap-2 text-sm">
                    <AlertCircle className="w-5 h-5" />
                    <span>{registerError}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-700">Nombre</span>
                    <input name="usuari_nm" value={registerData.usuari_nm} onChange={handleRegisterChange} type="text" placeholder="Ej: Juan" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 focus:border-green-800 outline-none" required />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-700">Apellido</span>
                    <input name="usuari_ap" value={registerData.usuari_ap} onChange={handleRegisterChange} type="text" placeholder="Ej: Pérez" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 focus:border-green-800 outline-none" required />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Cédula (Usuario)</span>
                  <input name="usuari_cd" value={registerData.usuari_cd} onChange={handleRegisterChange} type="text" placeholder="Ej: V-12345678" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 focus:border-green-800 outline-none" required />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Correo Electrónico</span>
                  <input name="usuari_em" value={registerData.usuari_em} onChange={handleRegisterChange} type="email" placeholder="Ej: juan.perez@correo.com" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 focus:border-green-800 outline-none" required />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Contraseña Sugerida</span>
                  <input name="usuari_co" value={registerData.usuari_co} onChange={handleRegisterChange} type="password" placeholder="Ej: MiClave@2024" autoComplete="new-password" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 focus:border-green-800 outline-none" required />
                  <p className="mt-1 text-xs text-gray-400">Debe tener mayúscula, número y carácter especial (@#!$...)</p>
                </label>
                <button disabled={registerLoading} type="submit" className="w-full py-2.5 mt-2 bg-green-800 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition">
                  {registerLoading ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

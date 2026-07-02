import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, PauseCircle, Shield, User, AlertCircle } from 'lucide-react'
import { usuarioService } from '../services/usuarioService'
import { authService } from '../services/authService'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedbackMsg, setFeedbackMsg] = useState(null) // { message, type: 'success'|'error' }
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // Para el modal
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    usuari_nm: '',
    usuari_ap: '',
    usuari_cd: '',
    usuari_em: '',
    usuari_co: '',
    rolusr_id: 2
  })

  // Para el modal de confirmación de borrado
  const [deleteModal, setDeleteModal] = useState({ open: false, userId: null, password: '', error: '', loading: false })

  // Reglas de validación de contraseña (compartidas)
  const passwordRules = [
    { id: 'length',  label: 'Mínimo 8 caracteres',                        test: (p) => p.length >= 8 },
    { id: 'upper',   label: 'Al menos una mayúscula',                      test: (p) => /[A-Z]/.test(p) },
    { id: 'number',  label: 'Al menos un número',                          test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'Al menos un carácter especial (@#!$%...)',    test: (p) => /[^A-Za-z0-9]/.test(p) },
  ]

  const getPasswordStrength = (p) => {
    const passed = passwordRules.filter(r => r.test(p)).length
    if (passed <= 1) return { label: 'Muy débil',  color: 'bg-red-500',    width: 'w-1/4' }
    if (passed === 2) return { label: 'Débil',     color: 'bg-orange-400', width: 'w-2/4' }
    if (passed === 3) return { label: 'Buena',     color: 'bg-yellow-400', width: 'w-3/4' }
    return                    { label: 'Fuerte',    color: 'bg-green-500',  width: 'w-full' }
  }
  
  const loadUsuarios = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await usuarioService.getAll()
      setUsuarios(data)
    } catch (err) {
      console.error('Error al cargar usuarios:', err)
      setError('No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsuarios()
  }, [])

  const showToast = (message, type = 'success') => {
    setFeedbackMsg({ message, type })
  }

  const handleStatusChange = async (id, currentStatus, newStatus) => {
    try {
      await usuarioService.update(id, { usuari_es: newStatus })
      showToast(`Usuario marcado como ${newStatus}`)
      loadUsuarios()
    } catch (err) {
      console.error('Error al cambiar estado:', err)
      showToast('Error al cambiar el estado', 'error')
    }
  }

  const handleDelete = (id) => {
    setDeleteModal({ open: true, userId: id, password: '', error: '', loading: false })
  }

  const confirmDelete = async (e) => {
    e.preventDefault()
    setDeleteModal(prev => ({ ...prev, loading: true, error: '' }))
    
    try {
      const currentUserStr = localStorage.getItem('sermab_user');
      let adminId = 2; // Fallback
      if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        adminId = user.usuari_id;
      }
      
      // 1. Verificar contraseña del administrador
      await authService.verifyAdminPassword(adminId, deleteModal.password)
      
      // 2. Si la contraseña es correcta, proceder a eliminar
      await usuarioService.delete(deleteModal.userId)
      showToast('Usuario eliminado correctamente')
      setDeleteModal({ open: false, userId: null, password: '', error: '', loading: false })
      loadUsuarios()
    } catch (err) {
      console.error('Error al eliminar usuario:', err)
      const msg = err.response?.data?.message || 'Error al eliminar usuario'
      setDeleteModal(prev => ({ ...prev, loading: false, error: msg }))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Validar contraseña si fue ingresada
    if (formData.usuari_co) {
      const failedRules = passwordRules.filter(r => !r.test(formData.usuari_co))
      if (failedRules.length > 0) {
        showToast(`Contraseña no válida: ${failedRules.map(r => r.label.toLowerCase()).join(', ')}.`, 'error')
        return
      }
    }

    try {
      await usuarioService.create({
        ...formData,
        usuari_co: formData.usuari_co || '123456', // default pass if empty
        usuari_es: 'Activo'
      })
      showToast('Usuario creado correctamente')
      setShowModal(false)
      loadUsuarios()
    } catch (err) {
      console.error('Error al guardar:', err)
      showToast(err.response?.data?.message || 'Error al guardar el usuario', 'error')
    }
  }

  const filteredUsuarios = usuarios.filter(u => 
    u.usuari_nm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.usuari_ap?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.usuari_cd?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pendientes = filteredUsuarios.filter(u => u.usuari_es === 'Pendiente')
  const activos = filteredUsuarios.filter(u => u.usuari_es !== 'Pendiente')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
          <p className="text-gray-500 text-sm">Administra los accesos y roles del sistema SERMAB</p>
        </div>
        
        <button 
          onClick={() => {
            setFormData({ usuari_nm: '', usuari_ap: '', usuari_cd: '', usuari_em: '', usuari_co: '', rolusr_id: 2 })
            setShowModal(true)
          }}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar por nombre, apellido o código..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-sm text-gray-700 bg-transparent"
        />
      </div>

      {loading && <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>}
      {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {!loading && !error && (
        <div className="space-y-8">
          
          {/* SECCIÓN PENDIENTES */}
          {pendientes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-600 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                Solicitudes de Acceso Pendientes ({pendientes.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendientes.map(u => (
                  <div key={u.usuari_id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-bl-lg">
                      NUEVO
                    </div>
                    <div className="flex items-start gap-3 mt-2">
                      <div className="bg-white p-2 rounded-full border border-yellow-200 text-yellow-600">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{u.usuari_nm} {u.usuari_ap}</h4>
                        <div className="text-sm text-gray-600 mt-1"><strong>Cédula:</strong> {u.usuari_cd}</div>
                        <div className="text-sm text-gray-600"><strong>Correo:</strong> {u.usuari_em || 'N/A'}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button 
                        onClick={() => handleStatusChange(u.usuari_id, 'Pendiente', 'Activo')}
                        className="flex-1 bg-green-600 text-white text-sm font-medium py-2 rounded hover:bg-green-700 transition"
                      >
                        Aprobar
                      </button>
                      <button 
                        onClick={() => handleDelete(u.usuari_id)}
                        className="flex-1 bg-white border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded hover:bg-gray-50 transition"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECCIÓN ACTIVOS / INACTIVOS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Usuario</th>
                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Contacto</th>
                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Rol</th>
                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Estado</th>
                    <th className="py-3 px-4 text-sm font-semibold text-gray-600 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activos.map(u => (
                    <tr key={u.usuari_id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{u.usuari_nm} {u.usuari_ap}</div>
                        <div className="text-sm text-gray-500">C.I: {u.usuari_cd}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-700">{u.usuari_em || 'Sin correo'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${u.rolusr_id === 1 ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                          {u.rolusr_id === 1 ? 'Administrador' : 'Cajera'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${u.usuari_es === 'Activo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {u.usuari_es}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {u.usuari_es === 'Activo' ? (
                            <button 
                              onClick={() => handleStatusChange(u.usuari_id, 'Activo', 'Inactivo')}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition" title="Suspender"
                            >
                              <PauseCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChange(u.usuari_id, 'Inactivo', 'Activo')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition" title="Activar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDelete(u.usuari_id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition" title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activos.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No hay usuarios activos registrados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo Usuario Directo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Nuevo Usuario Activo</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Nombre</span>
                  <input value={formData.usuari_nm} onChange={e => setFormData({...formData, usuari_nm: e.target.value})} type="text" placeholder="Ej: Juan" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none" required />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-700">Apellido</span>
                  <input value={formData.usuari_ap} onChange={e => setFormData({...formData, usuari_ap: e.target.value})} type="text" placeholder="Ej: Pérez" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none" required />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Cédula (Usuario)</span>
                <input value={formData.usuari_cd} onChange={e => setFormData({...formData, usuari_cd: e.target.value})} type="text" placeholder="Ej: V-12345678" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none" required />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Correo</span>
                <input value={formData.usuari_em} onChange={e => setFormData({...formData, usuari_em: e.target.value})} type="email" placeholder="Ej: juan.perez@correo.com" autoComplete="off" className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none" />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Contraseña</span>
                <input
                  value={formData.usuari_co}
                  onChange={e => setFormData({...formData, usuari_co: e.target.value})}
                  type="password"
                  placeholder="Ej: MiClave@2024"
                  autoComplete="new-password"
                  className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none"
                />
                <p className="mt-1 text-xs text-gray-400">Debe tener mayúscula, número y carácter especial (@#!$...). Deja en blanco para usar 123456.</p>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Rol</span>
                <select value={formData.rolusr_id} onChange={e => setFormData({...formData, rolusr_id: parseInt(e.target.value)})} className="mt-1 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-800/20 outline-none">
                  <option value={2}>Cajera</option>
                  <option value={1}>Administrador</option>
                </select>
              </label>
              
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 bg-[#0a5c36] text-white font-medium rounded-lg hover:bg-[#084226] transition">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación Borrado Seguro */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            {/* Glow decorativo */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>

            {/* Ícono */}
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5 ring-8 ring-red-500/10">
              <Trash2 className="h-10 w-10 text-red-600" />
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Eliminar Usuario</h3>
            <p className="text-gray-500 text-sm leading-relaxed px-2 mb-6">
              Ingresa tu contraseña de administrador para confirmar la eliminación permanente.
            </p>

            <form onSubmit={confirmDelete} className="w-full space-y-4 text-left">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contraseña de Administrador</span>
                <input
                  value={deleteModal.password}
                  onChange={e => setDeleteModal({...deleteModal, password: e.target.value})}
                  type="password"
                  className="mt-1 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/30 outline-none text-gray-800 bg-gray-50"
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </label>

              {deleteModal.error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {deleteModal.error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ open: false, userId: null, password: '', error: '', loading: false })}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-2xl hover:bg-gray-50 transition cursor-pointer bg-white"
                  disabled={deleteModal.loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-2xl shadow-lg shadow-red-600/25 transition-all duration-200 cursor-pointer border-0 outline-none focus:ring-4 focus:ring-red-100"
                  disabled={deleteModal.loading}
                >
                  {deleteModal.loading ? 'Verificando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Feedback (Éxito / Error) */}
      {feedbackMsg && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-sans">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden">
            {/* Glow decorativo */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none ${feedbackMsg.type === 'error' ? 'bg-red-500/10' : 'bg-green-500/10'}`}></div>
            <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none ${feedbackMsg.type === 'error' ? 'bg-red-500/5' : 'bg-green-500/5'}`}></div>

            {/* Ícono */}
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8 ${feedbackMsg.type === 'error' ? 'bg-red-50 ring-red-500/10' : 'bg-green-50 ring-green-500/10'}`}>
              {feedbackMsg.type === 'error'
                ? <AlertCircle className="h-10 w-10 text-red-600" />
                : <CheckCircle className="h-10 w-10 text-green-600" />
              }
            </div>

            <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">
              {feedbackMsg.type === 'error' ? 'Ha Ocurrido un Error' : '¡Operación Exitosa!'}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed px-2 font-medium">
              {feedbackMsg.message}
            </p>

            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className={`mt-8 w-full py-4 px-6 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl transition-all duration-200 cursor-pointer border-0 outline-none ${
                feedbackMsg.type === 'error'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25 hover:shadow-red-700/40 focus:ring-4 focus:ring-red-100'
                  : 'bg-green-600 hover:bg-green-700 shadow-green-600/25 hover:shadow-green-700/40 focus:ring-4 focus:ring-green-100'
              }`}
            >
              {feedbackMsg.type === 'error' ? 'Cerrar' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

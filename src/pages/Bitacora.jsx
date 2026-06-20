import React, { useState, useMemo } from 'react'
import {
  Search,
  Clock,
  Filter,
  AlertCircle
} from 'lucide-react'

export default function Bitacora({ historial = [] }) {
  // Estado local para capturar los parámetros de entrada del formulario de filtros
  const [filterInput, setFilterInput] = useState({
    usuario: '',
    tipoAccion: '',
    fecha: ''
  })

  // Estado que determina los filtros aplicados actualmente para la consulta de salida
  const [appliedFilters, setAppliedFilters] = useState({
    usuario: '',
    tipoAccion: '',
    fecha: ''
  })

  // Historial de auditoría conectado
  const historialInmutable = historial;

  // Manejador del cambio en los inputs del formulario
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFilterInput(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejador para aplicar los filtros al estado de consulta activa
  const handleApplyFilters = (e) => {
    e.preventDefault()
    setAppliedFilters({ ...filterInput })
  }

  // Lógica de salida: Filtrado del historial inmutable basándose en los filtros aplicados
  const filteredHistorial = useMemo(() => {
    return historialInmutable.filter(item => {
      // Filtrar por Usuario/Rol
      if (appliedFilters.usuario) {
        const matchUser = appliedFilters.usuario === 'Administrador' 
          ? item.usuario.includes('Administrador') 
          : item.usuario.includes('Cajera María')
        if (!matchUser) return false
      }
      
      // Filtrar por Tipo de Acción
      if (appliedFilters.tipoAccion && appliedFilters.tipoAccion !== 'Todas') {
        const itemAccionLower = item.accion.toLowerCase()
        const targetAccion = appliedFilters.tipoAccion.toLowerCase()
        
        if (targetAccion === 'insercion' && !itemAccionLower.includes('inserción') && !itemAccionLower.includes('nuevo')) return false
        if (targetAccion === 'eliminacion' && !itemAccionLower.includes('eliminación')) return false
        if (targetAccion === 'cobro' && !itemAccionLower.includes('cobro') && !itemAccionLower.includes('procesó')) return false
        if (targetAccion === 'inicio_sesion' && !itemAccionLower.includes('inicio de sesión')) return false
      }

      // Filtrar por Fecha específica (YYYY-MM-DD)
      if (appliedFilters.fecha) {
        if (!item.fechaHora.startsWith(appliedFilters.fecha)) return false
      }

      return true
    })
  }, [appliedFilters, historialInmutable])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Cabecera / Banner Bienvenido con el diseño del sistema */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center justify-between border border-gray-100">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Bitácora de <span className="text-green-700">Seguridad y Auditoría</span>
            </h1>
            <p className="text-sm text-gray-500">Historial de trazabilidad operativa y seguridad municipal</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-700">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Sección de Entrada: Filtros */}
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm mb-6">
          <form onSubmit={handleApplyFilters} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-700">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filtros de Auditoría</h3>
                <p className="text-xs text-gray-400">Establezca los parámetros de búsqueda en la bitácora</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-inner">
                <label htmlFor="usuario" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Usuario / Rol</label>
                <select
                  id="usuario"
                  name="usuario"
                  value={filterInput.usuario}
                  onChange={handleInputChange}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none border-0 focus:ring-0"
                >
                  <option value="">Todos los usuarios</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Cajera María">Cajera María</option>
                </select>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-inner">
                <label htmlFor="tipoAccion" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo de Acción</label>
                <select
                  id="tipoAccion"
                  name="tipoAccion"
                  value={filterInput.tipoAccion}
                  onChange={handleInputChange}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none border-0 focus:ring-0"
                >
                  <option value="Todas">Todas las acciones</option>
                  <option value="Insercion">Inserción</option>
                  <option value="Eliminacion">Eliminación</option>
                  <option value="Cobro">Cobro</option>
                  <option value="Inicio_Sesion">Inicio de Sesión</option>
                </select>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 shadow-inner">
                <label htmlFor="fecha" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fecha Específica</label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  value={filterInput.fecha}
                  onChange={handleInputChange}
                  className="w-full bg-transparent text-sm text-gray-900 outline-none border-0 focus:ring-0"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-green-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 cursor-pointer border-0"
              >
                <Search className="w-4 h-4 mr-2" /> Aplicar Filtros
              </button>
            </div>
          </form>
        </div>

        {/* Sección de Salida: Tabla de Trazabilidad */}
        <div className="rounded-[28px] border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tabla de Trazabilidad</h3>
              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                {filteredHistorial.length} registros
              </span>
            </div>
            <p className="text-sm text-gray-500">Registros históricos de eventos del sistema coincidentes con los filtros activos</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">ID Registro</th>
                  <th className="px-6 py-4 font-semibold">Fecha/Hora</th>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Módulo</th>
                  <th className="px-6 py-4 font-semibold">Acción Realizada</th>
                  <th className="px-6 py-4 font-semibold">Dirección IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredHistorial.length > 0 ? (
                  filteredHistorial.map((item) => (
                    <tr key={item.id} className="hover:bg-green-50/10 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">{item.id}</td>
                      <td className="px-6 py-4 text-gray-500">{item.fechaHora}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{item.usuario}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                          {item.modulo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{item.accion}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.ip}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-gray-300" />
                        <span className="font-medium text-sm">No se encontraron registros de auditoría</span>
                        <span className="text-xs text-gray-400">Pruebe limpiando o cambiando los criterios de los filtros</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

import React, { useState, useMemo, useEffect } from 'react'
import {
  Search,
  Clock,
  Filter,
  AlertCircle,
  ShieldAlert
} from 'lucide-react'

export default function Bitacora({ historial = [], loadBitacora = () => {} }) {
  // Estado para alternar entre ver solo hoy o ver todo (Superusuario)
  const [showAllLogs, setShowAllLogs] = useState(false)

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

  // Sincronizar carga de datos del backend al alternar "ver todo"
  useEffect(() => {
    loadBitacora(showAllLogs)
  }, [showAllLogs])

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

  // Lógica de salida: Filtrado del historial
  const filteredHistorial = useMemo(() => {
    return historial.filter(item => {
      // Filtrar por Usuario/Rol
      if (appliedFilters.usuario) {
        const matchUser = appliedFilters.usuario === 'Administrador' 
          ? item.usuario.toLowerCase().includes('admin') 
          : item.usuario.toLowerCase().includes('caje')
        if (!matchUser) return false
      }
      
      // Filtrar por Tipo de Acción
      if (appliedFilters.tipoAccion && appliedFilters.tipoAccion !== 'Todas') {
        const itemAccionLower = item.accion.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        const targetAccion = appliedFilters.tipoAccion
        
        if (targetAccion === 'Insercion' && !itemAccionLower.includes('insercion') && !itemAccionLower.includes('nuevo') && !itemAccionLower.includes('creo') && !itemAccionLower.includes('registro') && !itemAccionLower.includes('asigno') && !itemAccionLower.includes('asocio')) return false
        if (targetAccion === 'Actualizacion' && !itemAccionLower.includes('actualizo') && !itemAccionLower.includes('edito') && !itemAccionLower.includes('cambio')) return false
        if (targetAccion === 'Eliminacion' && !itemAccionLower.includes('eliminacion') && !itemAccionLower.includes('elimino') && !itemAccionLower.includes('anulacion') && !itemAccionLower.includes('anulo') && !itemAccionLower.includes('cancelo')) return false
        if (targetAccion === 'Cobro' && !itemAccionLower.includes('cobro') && !itemAccionLower.includes('proceso') && !itemAccionLower.includes('arqueo')) return false
        if (targetAccion === 'Inicio_Sesion' && !itemAccionLower.includes('inicio de sesion') && !itemAccionLower.includes('login') && !itemAccionLower.includes('sesion') && !itemAccionLower.includes('inicio turno') && !itemAccionLower.includes('cerro turno')) return false
      }

      // Filtrar por Fecha específica (YYYY-MM-DD o formato local)
      if (appliedFilters.fecha) {
        const [y, m, d] = appliedFilters.fecha.split('-')
        const formattedDatePart = `${parseInt(d)}/${parseInt(m)}/${y}`
        const formattedDatePartAlt = `${d}/${m}/${y}`
        
        const matchesDate = item.fechaHora.includes(formattedDatePart) || 
                            item.fechaHora.includes(formattedDatePartAlt) ||
                            item.fechaHora.startsWith(appliedFilters.fecha);
        if (!matchesDate) return false
      }

      return true
    })
  }, [appliedFilters, historial])

  // Paginación del lado del cliente
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [appliedFilters, showAllLogs])

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredHistorial.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredHistorial, currentPage])

  const totalPages = Math.ceil(filteredHistorial.length / itemsPerPage)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Cabecera / Banner Bienvenido con el diseño del sistema */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-gray-100">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              Bitácora de <span className="text-green-700">Seguridad y Auditoría</span>
            </h1>
            <p className="text-sm text-gray-500">Historial de trazabilidad operativa y seguridad municipal</p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Toggle de Superusuario */}
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className={`w-4 h-4 ${showAllLogs ? 'text-green-700' : 'text-gray-400'}`} />
                <span className="text-xs font-bold text-gray-600">Ver Historial Completo</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowAllLogs(prev => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showAllLogs ? 'bg-green-800' : 'bg-gray-300'
                }`}
              >
                <span 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showAllLogs ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3 bg-green-50 rounded-xl text-green-700 hidden sm:block">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Sección de Filtros */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
          <form onSubmit={handleApplyFilters} className="space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
              <div className="p-2 rounded-lg bg-green-50 text-green-700">
                <Filter className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filtros de Auditoría</h3>
                <p className="text-xs text-gray-400">Filtre y busque en tiempo real dentro del historial</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="usuario" className="block text-sm font-semibold text-gray-700 mb-2">Usuario / Rol</label>
                <select
                  id="usuario"
                  name="usuario"
                  value={filterInput.usuario}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium cursor-pointer"
                >
                  <option value="">Todos los usuarios</option>
                  <option value="Administrador">Administrador</option>
                  <option value="Cajera">Cajeros / Taquilla</option>
                </select>
              </div>

              <div>
                <label htmlFor="tipoAccion" className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Acción</label>
                <select
                  id="tipoAccion"
                  name="tipoAccion"
                  value={filterInput.tipoAccion}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium cursor-pointer"
                >
                  <option value="Todas">Todas las acciones</option>
                  <option value="Insercion">Creación / Inserción</option>
                  <option value="Actualizacion">Actualización / Edición</option>
                  <option value="Eliminacion">Eliminación / Anulación</option>
                  <option value="Cobro">Cobros y Arqueos</option>
                  <option value="Inicio_Sesion">Sesión y Accesos</option>
                </select>
              </div>

              <div>
                <label htmlFor="fecha" className="block text-sm font-semibold text-gray-700 mb-2">Fecha Específica</label>
                <input
                  id="fecha"
                  name="fecha"
                  type="date"
                  value={filterInput.fecha}
                  onChange={handleInputChange}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-green-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer border-0"
              >
                <Search className="w-4 h-4 mr-2" /> Aplicar Filtros
              </button>
            </div>
          </form>
        </div>

        {/* Sección de Salida: Tabla de Trazabilidad */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-col gap-1 border-b border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Tabla de Trazabilidad</h3>
              <span className="rounded-full bg-green-50 text-green-800 px-3 py-1 text-xs font-semibold border border-green-200">
                {filteredHistorial.length} registros {showAllLogs ? 'totales' : 'de hoy'}
              </span>
            </div>
            <p className="text-sm text-gray-500">Registros históricos de eventos del sistema almacenados físicamente</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">N°</th>
                  <th className="px-6 py-4 font-semibold">Fecha/Hora</th>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Módulo</th>
                  <th className="px-6 py-4 font-semibold">Acción Realizada</th>
                  <th className="px-6 py-4 font-semibold">Dirección IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        {filteredHistorial.length - ((currentPage - 1) * itemsPerPage + index)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.fechaHora}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{item.usuario}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          {item.modulo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700 font-medium">{item.accion}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{item.ip}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-gray-300 animate-pulse" />
                        <span className="font-semibold text-sm">No se encontraron registros de auditoría</span>
                        <span className="text-xs text-gray-400">No se registran operaciones que coincidan con los filtros</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 border-t border-gray-100 p-6 text-sm text-gray-600 bg-gray-50/50">
              <div>
                Mostrando {Math.min(filteredHistorial.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredHistorial.length, currentPage * itemsPerPage)} de {filteredHistorial.length} registros
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={`px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium transition cursor-pointer text-xs ${
                    currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                >
                  Anterior
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNumber => (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-0 ${
                      currentPage === pageNumber
                        ? 'bg-green-800 text-white shadow-sm'
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 cursor-pointer'
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={`px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium transition cursor-pointer text-xs ${
                    currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                  }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

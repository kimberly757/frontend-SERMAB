import React, { useState, useMemo } from 'react'

export default function Servicios({
  deudas = [],
  setDeudas = () => {},
  contribuyentes = [],
  registrarLog = () => {},
  cajeraMode = false
}) {
  // Estados para gestionar servicios disponibles
  const [servicios, setServicios] = useState(() => {
    const saved = localStorage.getItem('sermab_servicios')
    return saved ? JSON.parse(saved) : [
      { id: 1, nombre: 'Aseo Urbano', descripcion: 'Recolección de desechos y limpieza urbana', montoBase: 120.00, frecuencia: 'Mensual', activo: true },
      { id: 2, nombre: 'Patente de Industria y Comercio', descripcion: 'Licencia comercial e industrial', montoBase: 240.00, frecuencia: 'Anual', activo: true },
      { id: 3, nombre: 'Inmueble Urbano', descripcion: 'Impuesto sobre bienes inmuebles urbanos', montoBase: 95.00, frecuencia: 'Anual', activo: true },
      { id: 4, nombre: 'Permiso de Construcción', descripcion: 'Permisos y licencias de construcción', montoBase: 45.00, frecuencia: 'Único', activo: true },
    ]
  })

  // Estados para formulario de nuevo servicio
  const [mostrarFormularioServicio, setMostrarFormularioServicio] = useState(false)
  const [servicioEditando, setServicioEditando] = useState(null)
  const [nuevoServicio, setNuevoServicio] = useState({
    nombre: '',
    descripcion: '',
    montoBase: '',
    frecuencia: 'Mensual'
  })

  // Estados para asignación de servicios
  const [cedula, setCedula] = useState('')
  const [servicio, setServicio] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [monto, setMonto] = useState('0.00')
  const [search, setSearch] = useState('')
  const [searchServicios, setSearchServicios] = useState('')

  const formatBs = (value) => {
    return Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Guardar servicios en localStorage
  React.useEffect(() => {
    localStorage.setItem('sermab_servicios', JSON.stringify(servicios))
  }, [servicios])

  const handleGuardarServicio = (e) => {
    e.preventDefault()

    if (!nuevoServicio.nombre.trim()) {
      alert('El nombre del servicio es obligatorio.')
      return
    }
    if (!nuevoServicio.descripcion.trim()) {
      alert('La descripción del servicio es obligatoria.')
      return
    }
    if (!nuevoServicio.montoBase || parseFloat(nuevoServicio.montoBase) <= 0) {
      alert('Debe ingresar un monto base válido mayor a 0.')
      return
    }

    if (servicioEditando) {
      setServicios(servicios.map(s => s.id === servicioEditando.id ? { 
        ...s, 
        nombre: nuevoServicio.nombre.trim(),
        descripcion: nuevoServicio.descripcion.trim(),
        montoBase: parseFloat(nuevoServicio.montoBase),
        frecuencia: nuevoServicio.frecuencia
      } : s))
      registrarLog('Servicios', `Editó tipo de servicio: ${nuevoServicio.nombre.trim()}`)
      alert('¡Servicio actualizado exitosamente!')
    } else {
      const nuevoId = Math.max(...servicios.map(s => s.id), 0) + 1
      const servicioNuevo = {
        id: nuevoId,
        nombre: nuevoServicio.nombre.trim(),
        descripcion: nuevoServicio.descripcion.trim(),
        montoBase: parseFloat(nuevoServicio.montoBase),
        frecuencia: nuevoServicio.frecuencia,
        activo: true
      }

      setServicios([...servicios, servicioNuevo])
      registrarLog('Servicios', `Creó nuevo tipo de servicio: ${servicioNuevo.nombre} (${servicioNuevo.frecuencia}) con monto base Bs. ${servicioNuevo.montoBase.toFixed(2)}`)
      alert('¡Servicio creado exitosamente!')
    }
    
    // Limpiar formulario
    setNuevoServicio({ nombre: '', descripcion: '', montoBase: '', frecuencia: 'Mensual' })
    setServicioEditando(null)
    setMostrarFormularioServicio(false)
  }

  const handleEditarServicio = (svc) => {
    setServicioEditando(svc)
    setNuevoServicio({
      nombre: svc.nombre,
      descripcion: svc.descripcion,
      montoBase: svc.montoBase,
      frecuencia: svc.frecuencia
    })
    setMostrarFormularioServicio(true)
  }

  const handleCancelarFormulario = () => {
    setMostrarFormularioServicio(false)
    setServicioEditando(null)
    setNuevoServicio({ nombre: '', descripcion: '', montoBase: '', frecuencia: 'Mensual' })
  }

  const handleEliminarServicio = (id) => {
    const servicioEliminar = servicios.find(s => s.id === id)
    if (!servicioEliminar) return

    if (window.confirm(`¿Está seguro de que desea eliminar el servicio "${servicioEliminar.nombre}"?`)) {
      setServicios(servicios.filter(s => s.id !== id))
      registrarLog('Servicios', `Eliminó tipo de servicio: ${servicioEliminar.nombre}`)
    }
  }

  const serviciosFiltrados = useMemo(() => {
    const q = searchServicios.trim().toLowerCase()
    if (!q) return servicios
    return servicios.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.descripcion.toLowerCase().includes(q) ||
      s.frecuencia.toLowerCase().includes(q)
    )
  }, [searchServicios, servicios])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deudas
    return deudas.filter(d =>
      d.ci.toLowerCase().includes(q) ||
      d.servicio.toLowerCase().includes(q) ||
      d.periodo.toLowerCase().includes(q) ||
      d.estado.toLowerCase().includes(q)
    )
  }, [search, deudas])

  const handleGenerate = (e) => {
    e.preventDefault()

    if (!cedula) {
      alert('Debe seleccionar un contribuyente de la lista.')
      return
    }
    if (!servicio) {
      alert('Debe seleccionar un tipo de servicio.')
      return
    }
    if (!periodo) {
      alert('Debe seleccionar un periodo a facturar.')
      return
    }

    const cleanMonto = String(monto).replace(',', '.')
    const parsedMonto = parseFloat(cleanMonto)
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      alert('Debe ingresar un monto numérico válido mayor a 0.')
      return
    }

    const nextId = `D-${(deudas.length + 1).toString().padStart(3, '0')}`
    const newDebt = {
      id: nextId,
      ci: cedula, // Formato "Tipo-Documento" (ej. V-15.482.901)
      servicio: servicio,
      periodo: periodo,
      monto: parsedMonto,
      estado: 'Pendiente',
    }

    setDeudas([newDebt, ...deudas])
    
    // Registrar log
    registrarLog('Servicios', `Asignó deuda ID ${newDebt.id} por ${servicio} (${periodo}) a contribuyente ${cedula} por Bs. ${parsedMonto.toFixed(2)}`)

    // Limpiar campos
    setCedula('')
    setServicio('')
    setPeriodo('')
    setMonto('0.00')
    alert('¡Deuda asignada con éxito!')
  }

  const handleDelete = (id) => {
    const target = deudas.find(d => d.id === id)
    if (!target) return

    if (window.confirm('¿Está seguro de que desea eliminar esta deuda?')) {
      setDeudas(deudas.filter(d => d.id !== id))
      registrarLog('Servicios', `Eliminó deuda ID ${target.id} (${target.servicio} - ${target.periodo}) de contribuyente ${target.ci} por Bs. ${target.monto.toFixed(2)}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* ========== GESTIÓN DE SERVICIOS ========== */}
        {!cajeraMode && (
          <>
            {/* Botón para crear nuevo servicio */}
            {!mostrarFormularioServicio && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setServicioEditando(null)
                    setNuevoServicio({ nombre: '', descripcion: '', montoBase: '', frecuencia: 'Mensual' })
                    setMostrarFormularioServicio(true)
                  }}
                  className="bg-green-800 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 cursor-pointer transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Crear Nuevo Tipo de Servicio
                </button>
              </div>
            )}

        {/* Formulario para crear nuevo servicio */}
        {mostrarFormularioServicio && (
          <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border-l-4 border-green-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">{servicioEditando ? 'Editar Servicio' : 'Crear Nuevo Tipo de Servicio'}</h2>
              <button
                onClick={handleCancelarFormulario}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleGuardarServicio} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Servicio *</label>
                  <input
                    type="text"
                    value={nuevoServicio.nombre}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                    placeholder="Ej. Aseo Urbano"
                    className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto Base (Bs.) *</label>
                  <input
                    type="text"
                    value={nuevoServicio.montoBase}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, montoBase: e.target.value })}
                    placeholder="Ej. 120.00"
                    className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción *</label>
                <textarea
                  value={nuevoServicio.descripcion}
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                  placeholder="Descripción detallada del servicio..."
                  className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200 resize-none h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia de Cobro</label>
                <select
                  value={nuevoServicio.frecuencia}
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, frecuencia: e.target.value })}
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="Mensual">Mensual</option>
                  <option value="Bimensual">Bimensual</option>
                  <option value="Trimestral">Trimestral</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                  <option value="Único">Único</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-800 hover:bg-green-700 text-white font-medium py-3 rounded-lg cursor-pointer transition"
                >
                  {servicioEditando ? 'Actualizar Servicio' : 'Guardar Servicio'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarFormulario}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 rounded-lg cursor-pointer transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de Servicios Disponibles */}
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Servicios Disponibles</h3>
              <p className="text-sm text-gray-500">{serviciosFiltrados.length} tipo(s) de servicio(s) activos</p>
            </div>

            <div className="w-full md:w-80">
              <input
                value={searchServicios}
                onChange={(e) => setSearchServicios(e.target.value)}
                placeholder="Buscar por nombre, descripción o frecuencia..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviciosFiltrados.length > 0 ? (
              serviciosFiltrados.map(svc => (
                <div key={svc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{svc.nombre}</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditarServicio(svc)}
                        className="p-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer"
                        title="Editar servicio"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEliminarServicio(svc.id)}
                        className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition cursor-pointer"
                        title="Eliminar servicio"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{svc.descripcion}</p>
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Monto Base:</span>
                      <span className="font-semibold text-green-600">Bs. {formatBs(svc.montoBase)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Frecuencia:</span>
                      <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">{svc.frecuencia}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-400">
                No se encontraron servicios que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>
        </>
        )}

        {/* ========== ASIGNACIÓN DE SERVICIOS ========== */}
        {/* Asignar Nuevo Servicio a Contribuyente */}
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Asignar Servicio a Contribuyente</h2>
            <p className="text-sm text-gray-500">Asocie un servicio a un contribuyente registrado</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contribuyente Destinatario</label>
              <select
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full bg-gray-100 border border-transparent rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="">Seleccione un contribuyente registrado...</option>
                {contribuyentes.filter(c => c.estado !== 'Inactivo').map(c => (
                  <option key={c.id} value={`${c.tipo}-${c.documento}`}>
                    {c.tipo}-{c.documento} — {c.nombre} {c.apellidos || ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
                <select value={servicio} onChange={(e) => setServicio(e.target.value)} className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200">
                  <option value="">Seleccione un servicio...</option>
                  {servicios.filter(s => s.activo).map(svc => (
                    <option key={svc.id} value={svc.nombre}>
                      {svc.nombre} - Bs. {formatBs(svc.montoBase)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Periodo a Facturar</label>
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200">
                  <option value="">Seleccione un periodo...</option>
                  <option value="Enero 2025">Enero 2025</option>
                  <option value="Febrero 2025">Febrero 2025</option>
                  <option value="Marzo 2025">Marzo 2025</option>
                  <option value="Abril 2025">Abril 2025</option>
                  <option value="Mayo 2025">Mayo 2025</option>
                  <option value="Junio 2025">Junio 2025</option>
                  <option value="Julio 2025">Julio 2025</option>
                  <option value="Agosto 2025">Agosto 2025</option>
                  <option value="Septiembre 2025">Septiembre 2025</option>
                  <option value="Octubre 2025">Octubre 2025</option>
                  <option value="Noviembre 2025">Noviembre 2025</option>
                  <option value="Diciembre 2025">Diciembre 2025</option>
                  <option value="3er Trimestre 2025">3er Trimestre 2025</option>
                  <option value="4to Trimestre 2025">4to Trimestre 2025</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monto (Bs.)</label>
                <input
                  type="text"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="Ej. 120.00"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-green-800 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Generar Deuda / Asignar Servicio
              </button>
            </div>
          </form>
        </div>

        {/* Registro de Deudas Pendientes */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">Historial y Registro de Deudas</h3>
              <p className="text-sm text-gray-500">{deudas.length} deudas registradas en el sistema</p>
            </div>

            <div className="w-full md:w-80">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por Cédula, Servicio, Periodo o Estado..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="py-3 pr-6 font-semibold">ID DEUDA</th>
                  <th className="py-3 pr-6 font-semibold">CÉDULA / RIF</th>
                  <th className="py-3 pr-6 font-semibold">SERVICIO</th>
                  <th className="py-3 pr-6 font-semibold">PERIODO</th>
                  <th className="py-3 pr-6 font-semibold text-right">MONTO (Bs.)</th>
                  <th className="py-3 pr-6 font-semibold text-center">ESTADO</th>
                  <th className="py-3 pr-6 font-semibold text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map(d => (
                    <tr key={d.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                      <td className="py-4 font-medium text-gray-800">{d.id}</td>
                      <td className="py-4 text-gray-700">{d.ci}</td>
                      <td className="py-4 text-gray-800 font-medium">{d.servicio}</td>
                      <td className="py-4 text-gray-500">{d.periodo}</td>
                      <td className="py-4 font-semibold text-right text-gray-900">Bs. {formatBs(d.monto)}</td>
                      <td className="py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          d.estado === 'Pagado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {d.estado}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          {d.estado !== 'Pagado' && (
                            <button
                              title="Eliminar"
                              onClick={() => handleDelete(d.id)}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition border-0 cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-400">
                      No se encontraron deudas que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
            <div>Mostrando {filtered.length} de {deudas.length} registros</div>
          </div>
        </div>
      </div>
    </div>
  )
}

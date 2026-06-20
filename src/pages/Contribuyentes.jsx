import React, { useState, useMemo } from 'react'
import { AlertCircle, Search, Trash2 } from 'lucide-react'

export default function Contribuyentes({
  contribuyentes = [],
  setContribuyentes = () => {},
  registrarLog = () => {},
  deudas = []
}) {
  const [form, setForm] = useState({
    tipo: 'V',
    documento: '',
    nombre: '',
    apellidos: '',
    telefono: '',
    correo: '',
  })
  const [direccionesForm, setDireccionesForm] = useState([])
  const [nuevaDireccion, setNuevaDireccion] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [cuentaActiva, setCuentaActiva] = useState(null)

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleSave(e) {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Validaciones básicas
    if (!form.documento.trim()) {
      setErrorMsg('El documento de identidad es obligatorio.')
      return
    }
    if (!form.nombre.trim()) {
      setErrorMsg('El nombre o razón social es obligatorio.')
      return
    }

    const cleanDocument = form.documento.replace(/[^0-9]/g, '')
    if (!cleanDocument) {
      setErrorMsg('El documento debe contener dígitos numéricos.')
      return
    }

    // Validar si ya existe
    const exists = contribuyentes.some(c => {
      const cDoc = String(c.documento).replace(/[^0-9]/g, '')
      return cDoc === cleanDocument
    })
    if (exists) {
      setErrorMsg(`El documento ${form.tipo}-${form.documento} ya se encuentra registrado.`)
      return
    }

    // Validar correo si se ingresó
    if (form.correo.trim() && !/\S+@\S+\.\S+/.test(form.correo)) {
      setErrorMsg('El correo electrónico ingresado no es válido.')
      return
    }

    // Formatear el documento (ej. 15482901 -> 15.482.901)
    let formattedDoc = cleanDocument
    if (cleanDocument.length > 3) {
      const num = Number(cleanDocument)
      formattedDoc = num.toLocaleString('es-VE')
    }

    const nuevo = {
      id: Date.now(),
      tipo: form.tipo,
      documento: formattedDoc,
      nombre: form.nombre.trim(),
      apellidos: form.apellidos.trim(),
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
      direcciones: direccionesForm.length > 0 ? [...direccionesForm] : [],
      estado: 'Activo'
    }

    setContribuyentes(prev => [nuevo, ...prev])
    setSuccessMsg('¡Contribuyente registrado con éxito!')
    
    // Registrar log dinámico
    registrarLog('Contribuyentes', `Registró al contribuyente ${nuevo.tipo}-${nuevo.documento} (${nuevo.nombre} ${nuevo.apellidos || ''})`)

    // Limpiar formulario
    setForm({ tipo: 'V', documento: '', nombre: '', apellidos: '', telefono: '', correo: '' })
    setDireccionesForm([])
    setNuevaDireccion('')
  }

  function handleClear() {
    setForm({ tipo: 'V', documento: '', nombre: '', apellidos: '', telefono: '', correo: '' })
    setDireccionesForm([])
    setNuevaDireccion('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  function handleDelete(id) {
    const target = contribuyentes.find(c => c.id === id)
    if (!target) return

    if (window.confirm('¿Está seguro de que desea eliminar este contribuyente? Sus deudas y transacciones podrían verse afectadas.')) {
      setContribuyentes(prev => prev.filter(c => c.id !== id))
      setSuccessMsg('Contribuyente eliminado.')
      registrarLog('Contribuyentes', `Eliminó al contribuyente ${target.tipo}-${target.documento} (${target.nombre} ${target.apellidos || ''})`)
    }
  }

  function handleToggleEstado(id) {
    setContribuyentes(prev => prev.map(c => {
      if (c.id === id) {
        const estadoActual = c.estado || 'Activo';
        const nuevoEstado = estadoActual === 'Inactivo' ? 'Activo' : 'Inactivo';
        registrarLog('Contribuyentes', `Cambió estado de ${c.tipo}-${c.documento} a ${nuevoEstado}`);
        return { ...c, estado: nuevoEstado };
      }
      return c;
    }))
    setSuccessMsg('Estado del contribuyente actualizado.')
  }

  // Filtrar contribuyentes por buscador
  const filteredContribuyentes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return contribuyentes
    return contribuyentes.filter(c => {
      const nombreCompleto = `${c.nombre} ${c.apellidos || ''}`.toLowerCase()
      const docCompleto = `${c.tipo}${c.documento}`.toLowerCase().replace(/[^0-9a-z]/g, '')
      const cleanQ = q.replace(/[^0-9a-z]/g, '')
      return (
        nombreCompleto.includes(q) ||
        c.documento.includes(q) ||
        docCompleto.includes(cleanQ) ||
        (c.telefono && c.telefono.includes(q))
      )
    })
  }, [searchTerm, contribuyentes])

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Mensajes de feedback */}
        {errorMsg && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 text-green-700 rounded-xl p-4 flex items-center gap-2 border border-green-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        {/* Formulario de registro */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 rounded-lg bg-green-50 text-green-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9a3 3 0 11-6 0 3 3 0 016 0zM3 21v-2a4 4 0 014-4h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Gestión de Contribuyentes</h2>
              <p className="text-sm text-gray-500">Complete los datos para registrar un nuevo contribuyente en el sistema</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4">
                <label className="block text-sm font-medium text-gray-600 mb-2">Documento de Identidad</label>
                <div className="flex gap-3">
                  <select name="tipo" value={form.tipo} onChange={handleChange} className="w-24 px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100">
                    <option>V</option>
                    <option>E</option>
                    <option>J</option>
                    <option>P</option>
                  </select>
                  <input name="documento" value={form.documento} onChange={handleChange} placeholder="Ej. 15482901" className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
                </div>
              </div>

              <div className="md:col-span-8">
                <label className="block text-sm font-medium text-gray-600 mb-2">Nombres / Razón Social</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Ej. Juan o Comercial XYZ C.A." className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Apellidos (Opcional para personas jurídicas)</label>
                <input name="apellidos" value={form.apellidos} onChange={handleChange} placeholder="Ej. Pérez Rodríguez" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-600 mb-2">Teléfono Principal</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej. 0414-5552143" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-600 mb-2">Correo Electrónico</label>
                <input name="correo" value={form.correo} onChange={handleChange} placeholder="contribuyente@correo.com" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-gray-600 mb-2">Direcciones / Propiedades Registradas</label>
                <div className="flex gap-2 mb-2">
                  <input 
                    value={nuevaDireccion} 
                    onChange={(e) => setNuevaDireccion(e.target.value)} 
                    placeholder="Sector, calle, número de casa o local..." 
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (nuevaDireccion.trim()) {
                          setDireccionesForm([...direccionesForm, nuevaDireccion.trim()]);
                          setNuevaDireccion('');
                        }
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={() => {
                      if (nuevaDireccion.trim()) {
                        setDireccionesForm([...direccionesForm, nuevaDireccion.trim()]);
                        setNuevaDireccion('');
                      }
                    }}
                    className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-200 transition"
                  >
                    Agregar
                  </button>
                </div>
                {direccionesForm.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2">
                    {direccionesForm.map((dir, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm">
                        <span className="text-gray-700">{dir}</span>
                        <button type="button" onClick={() => setDireccionesForm(direccionesForm.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 font-bold px-2">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button type="button" onClick={handleClear} className="text-sm text-gray-600 hover:underline">Cancelar</button>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleClear} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 cursor-pointer">Limpiar Campos</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm flex items-center gap-2 cursor-pointer">Guardar Registro</button>
              </div>
            </div>
          </form>
        </div>

        {/* Tabla de registrados */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium text-gray-800">Contribuyentes Registrados</h3>
            <div className="relative w-full md:w-72">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, documento..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-600 border-b text-sm">
                  <th className="py-3 px-4 font-semibold">Documento</th>
                  <th className="py-3 px-4 font-semibold">Nombre Completo / Razón Social</th>
                  <th className="py-3 px-4 font-semibold text-center">Estado</th>
                  <th className="py-3 px-4 font-semibold text-center">Propiedades</th>
                  <th className="py-3 px-4 font-semibold">Teléfono</th>
                  <th className="py-3 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredContribuyentes.length > 0 ? (
                  filteredContribuyentes.map(c => (
                    <tr key={c.id} className="bg-white hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-700 font-medium">{c.tipo}-{c.documento}</td>
                      <td className="py-3 px-4 text-gray-800 font-medium">
                        {`${c.nombre} ${c.apellidos || ''}`.trim()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.estado === 'Inactivo' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {c.estado === 'Inactivo' ? 'Inactivo' : 'Activo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                          {c.direcciones?.length || (c.direccion ? 1 : 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{c.telefono || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const cleanDocActive = String(c.documento).replace(/[^0-9]/g, '')
                              const contribDeudas = deudas.filter(d => {
                                const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
                                return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
                              })
                              setCuentaActiva({ contribuyente: c, deudas: contribDeudas })
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition border-0 cursor-pointer text-xs font-semibold px-3"
                          >
                            Ver Detalles
                          </button>
                          <button
                            onClick={() => handleToggleEstado(c.id)}
                            className={`p-1.5 rounded-lg transition border-0 cursor-pointer text-xs font-semibold px-3 ${c.estado === 'Inactivo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                            title={c.estado === 'Inactivo' ? "Activar" : "Inactivar"}
                          >
                            {c.estado === 'Inactivo' ? 'Activar' : 'Inactivar'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition border-0 cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-400">
                      No se encontraron contribuyentes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL PERFIL DEL CONTRIBUYENTE */}
      {cuentaActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Perfil del Contribuyente</h3>
              <button onClick={() => setCuentaActiva(null)} className="text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer font-bold text-2xl leading-none">&times;</button>
            </div>
            
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Datos Personales</p>
                <p className="font-bold text-gray-800 text-lg">{cuentaActiva.contribuyente.nombre} {cuentaActiva.contribuyente.apellidos || ''}</p>
                <p className="text-sm text-gray-600 font-medium mb-2">{cuentaActiva.contribuyente.tipo}-{cuentaActiva.contribuyente.documento}</p>
                <span className={`inline-block text-xs font-bold px-2 py-1 rounded-full ${cuentaActiva.contribuyente.estado === 'Inactivo' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  Estado: {cuentaActiva.contribuyente.estado === 'Inactivo' ? 'Inactivo' : 'Activo'}
                </span>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Contacto</p>
                <p className="text-sm text-gray-700 mb-1"><span className="font-medium text-gray-500">Teléfono:</span> {cuentaActiva.contribuyente.telefono || 'No registrado'}</p>
                <p className="text-sm text-gray-700"><span className="font-medium text-gray-500">Correo:</span> {cuentaActiva.contribuyente.correo || 'No registrado'}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Propiedades / Direcciones Registradas</p>
              {cuentaActiva.contribuyente.direcciones?.length > 0 ? (
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 bg-white p-3 rounded-lg border border-gray-200">
                  {cuentaActiva.contribuyente.direcciones.map((dir, i) => (
                    <li key={i} className="py-1">{dir}</li>
                  ))}
                </ul>
              ) : cuentaActiva.contribuyente.direccion ? (
                <div className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                  {cuentaActiva.contribuyente.direccion}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No tiene propiedades registradas.</p>
              )}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Estado de Cuenta (Deudas Pendientes)</p>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Servicio / Deuda</th>
                    <th className="px-4 py-3 font-semibold text-right">Monto (Bs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cuentaActiva.deudas.length > 0 ? (
                    cuentaActiva.deudas.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-3">{d.servicio}</td>
                        <td className="px-4 py-3 text-right font-semibold">Bs. {d.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="2" className="px-4 py-6 text-center text-gray-500">
                        El contribuyente está Solvente. No presenta deudas pendientes.
                      </td>
                    </tr>
                  )}
                </tbody>
                {cuentaActiva.deudas.length > 0 && (
                  <tfoot className="bg-green-50/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-800 uppercase text-xs">Deuda Total Pendiente</td>
                      <td className="px-4 py-3 text-right font-bold text-green-800 text-lg">
                        Bs. {cuentaActiva.deudas.reduce((acc, d) => acc + d.monto, 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button onClick={() => setCuentaActiva(null)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg border-0 cursor-pointer">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

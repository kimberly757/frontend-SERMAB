import React, { useState, useMemo, useEffect } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { contribuyenteService } from '../services/contribuyenteService'

const mapTipoToId = (tipo) => {
  switch (tipo) {
    case 'V': return 1;
    case 'J': return 2;
    case 'G': return 3;
    case 'E': return 4;
    case 'P': return 4;
    default: return 1;
  }
};

export default function Contribuyentes({
  contribuyentes = [],
  setContribuyentes = () => {},
  registrarLog = () => {},
  deudas = [],
  isAdmin = false
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
  const [selectedSectorId, setSelectedSectorId] = useState('')
  const [detalleDireccion, setDetalleDireccion] = useState('')
  const [sectores, setSectores] = useState([])

  const [searchTerm, setSearchTerm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [cuentaActiva, setCuentaActiva] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editNewSectorId, setEditNewSectorId] = useState('')
  const [editNewDetalle, setEditNewDetalle] = useState('')
  const [loading, setLoading] = useState(false)

  const [esPropietarioInput, setEsPropietarioInput] = useState(false)
  const [editNewEsPropietario, setEditNewEsPropietario] = useState(false)
  const [inmuebles, setInmuebles] = useState([])

  const loadInmueblesList = async () => {
    try {
      const data = await contribuyenteService.getInmuebles();
      setInmuebles(data || []);
    } catch (err) {
      console.error('Error al cargar inmuebles:', err);
    }
  };

  useEffect(() => {
    loadInmueblesList();
  }, [contribuyentes]);

  // Auto-desvanecer notificaciones a los 4 segundos
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMsg])

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg])

  const handleStartEdit = (c) => {
    setEditForm({
      id: c.id,
      tipo: c.tipo,
      documento: c.documento.replace(/[^0-9]/g, ''),
      nombre: c.nombre,
      telefono: c.telefono || '',
      correo: c.correo || '',
      direccionesRaw: c.direccionesRaw || []
    })
    if (sectores && sectores.length > 0) {
      setEditNewSectorId(String(sectores[0].sector_id))
    }
    setEditNewDetalle('')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!editForm.nombre.trim()) {
      setErrorMsg('El nombre o razón social es obligatorio.')
      return
    }

    setLoading(true)
    try {
      await contribuyenteService.update(editForm.id, {
        tipcon_id: mapTipoToId(editForm.tipo),
        contri_ri: editForm.documento.replace(/[^0-9]/g, ''),
        contri_nr: editForm.nombre.trim(),
        contri_em: editForm.correo.trim() || 'sin@correo.com',
        contri_tl: editForm.telefono.trim() || null
      })

      setSuccessMsg('¡Contribuyente actualizado con éxito!')
      registrarLog('Contribuyentes', `Actualizó datos del contribuyente ${editForm.tipo}-${editForm.documento}`)
      setEditForm(null)
      setContribuyentes()
    } catch (err) {
      console.error('Error al actualizar contribuyente:', err)
      setErrorMsg('Error al guardar cambios en el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDireccion = async (direccId) => {
    if (window.confirm('¿Está seguro de eliminar esta dirección? El contribuyente dejará de tenerla registrada.')) {
      try {
        await contribuyenteService.deleteDireccion(direccId)
        setEditForm(prev => ({
          ...prev,
          direccionesRaw: prev.direccionesRaw.filter(d => d.id !== direccId)
        }))
        setSuccessMsg('¡Dirección eliminada correctamente!')
        registrarLog('Contribuyentes', `Eliminó una dirección del contribuyente ${editForm.tipo}-${editForm.documento}`)
        setContribuyentes()
      } catch (err) {
        console.error('Error al eliminar dirección:', err)
        setErrorMsg('Error al eliminar la dirección del servidor.')
      }
    }
  }

  const handleAddNewDireccionToEditing = async () => {
    if (!editNewSectorId) {
      setErrorMsg('Por favor seleccione un sector.')
      return
    }
    if (!editNewDetalle.trim()) {
      setErrorMsg('Por favor ingrese el detalle de la dirección.')
      return
    }

    try {
      const isFirst = !editForm.direccionesRaw || editForm.direccionesRaw.length === 0
      const newDir = await contribuyenteService.createDireccion({
        contri_id: editForm.id,
        sector_id: Number(editNewSectorId),
        direcc_ds: editNewDetalle.trim(),
        direcc_tp: isFirst ? 'Principal' : 'Secundaria'
      })

      // Si es propietario, registrar inmueble y facturar
      if (editNewEsPropietario) {
        await contribuyenteService.createInmueble({
          contri_id: editForm.id,
          inmueb_ct: `CAT-${Math.floor(10000 + Math.random() * 90000)}`,
          inmueb_dr: editNewDetalle.trim(),
          inmueb_tp: 'Residencial'
        });
        await contribuyenteService.triggerAseoBilling();
        loadInmueblesList();
      }

      const sector = sectores.find(s => s.sector_id === Number(editNewSectorId))
      const sectorNm = sector ? sector.sector_nm : 'Sin Sector'

      setEditForm(prev => ({
        ...prev,
        direccionesRaw: [
          ...prev.direccionesRaw,
          {
            id: newDir.direcc_id,
            sector_id: Number(editNewSectorId),
            sector_nm: sectorNm,
            detalle: editNewDetalle.trim()
          }
        ]
      }))

      setEditNewDetalle('')
      setEditNewEsPropietario(false)
      setSuccessMsg('¡Dirección agregada y asociada con éxito!')
      registrarLog('Contribuyentes', `Asoció nueva dirección al contribuyente ${editForm.tipo}-${editForm.documento}`)
      setContribuyentes()
    } catch (err) {
      console.error('Error al agregar dirección en edición:', err)
      setErrorMsg('Error al agregar dirección en el servidor.')
    }
  }

  // Cargar sectores al montar el componente
  useEffect(() => {
    const fetchSectores = async () => {
      try {
        const data = await contribuyenteService.getSectores();
        setSectores(data || []);
        if (data && data.length > 0) {
          setSelectedSectorId(String(data[0].sector_id));
        }
      } catch (err) {
        console.error('Error al cargar sectores:', err);
        setErrorMsg('Error al cargar sectores desde el servidor.');
      }
    };
    fetchSectores();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddDireccion = () => {
    if (!selectedSectorId) {
      setErrorMsg('Por favor seleccione un sector.')
      return
    }
    if (!detalleDireccion.trim()) {
      setErrorMsg('Por favor ingrese el detalle de la dirección (calle, número de casa, etc.).')
      return
    }
    const sector = sectores.find(s => s.sector_id === Number(selectedSectorId))
    const sectorNm = sector ? sector.sector_nm : ''

    setDireccionesForm(prev => [
      ...prev,
      {
        sector_id: Number(selectedSectorId),
        sector_nm: sectorNm,
        direcc_ds: detalleDireccion.trim(),
        esPropietario: esPropietarioInput
      }
    ])
    setDetalleDireccion('')
    setEsPropietarioInput(false)
    setErrorMsg('')
  }

  async function handleSave(e) {
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

    setLoading(true)

    try {
      // 1. Crear contribuyente en la base de datos
      const nomCompleto = (form.nombre.trim() + ' ' + form.apellidos.trim()).trim();
      const newContri = await contribuyenteService.create({
        tipcon_id: mapTipoToId(form.tipo),
        contri_ri: cleanDocument,
        contri_nr: nomCompleto,
        contri_em: form.correo.trim() || 'sin@correo.com',
        contri_es: 'Activo',
        contri_tl: form.telefono.trim() || null
      });

      // 2. Crear las direcciones si existen
      if (direccionesForm.length > 0) {
        let createdAnyProperty = false;
        for (let i = 0; i < direccionesForm.length; i++) {
          const dir = direccionesForm[i];
          await contribuyenteService.createDireccion({
            contri_id: newContri.contri_id,
            sector_id: dir.sector_id,
            direcc_ds: dir.direcc_ds,
            direcc_tp: i === 0 ? 'Principal' : 'Secundaria'
          });

          // Si es propietario, crear el inmueble correspondiente
          if (dir.esPropietario) {
            await contribuyenteService.createInmueble({
              contri_id: newContri.contri_id,
              inmueb_ct: `CAT-${Math.floor(10000 + Math.random() * 90000)}`,
              inmueb_dr: dir.direcc_ds,
              inmueb_tp: 'Residencial'
            });
            createdAnyProperty = true;
          }
        }

        // Si se creó alguna propiedad, facturar de inmediato
        if (createdAnyProperty) {
          await contribuyenteService.triggerAseoBilling();
          loadInmueblesList();
        }
      }

      setSuccessMsg('¡Contribuyente registrado con éxito!')
      
      // Registrar log dinámico
      registrarLog('Contribuyentes', `Registró al contribuyente ${form.tipo}-${form.documento} (${nomCompleto})`)

      // Limpiar formulario y direcciones temporales
      setForm({ tipo: 'V', documento: '', nombre: '', apellidos: '', telefono: '', correo: '' })
      setDireccionesForm([])
      setDetalleDireccion('')
      
      // Forzar recarga en el Dashboard
      setContribuyentes()
    } catch (err) {
      console.error('Error al guardar contribuyente:', err)
      if (err.response && err.response.data && err.response.data.error) {
        setErrorMsg(err.response.data.error)
      } else {
        setErrorMsg('Error al guardar en el servidor. Intente de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setForm({ tipo: 'V', documento: '', nombre: '', apellidos: '', telefono: '', correo: '' })
    setDireccionesForm([])
    setDetalleDireccion('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  async function handleToggleEstado(contribuyente) {
    try {
      setErrorMsg('')
      setSuccessMsg('')
      const nuevoEstado = contribuyente.estado === 'Inactivo' ? 'Activo' : 'Inactivo'

      await contribuyenteService.update(contribuyente.id, {
        contri_es: nuevoEstado
      })

      registrarLog('Contribuyentes', `Cambió estado de ${contribuyente.tipo}-${contribuyente.documento} a ${nuevoEstado}`)
      setSuccessMsg('Estado del contribuyente actualizado.')
      
      // Forzar recarga en el Dashboard
      setContribuyentes()
    } catch (err) {
      console.error('Error al actualizar estado:', err)
      setErrorMsg('Error al actualizar el estado del contribuyente en el servidor.')
    }
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
        {/* Mensajes de feedback flotantes (Toasts rediseñados como modal) */}
        {(errorMsg || successMsg) && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in font-sans">
            {errorMsg && (
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden animate-scale-up">
                {/* Glow decorativo de fondo */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                {/* Icono con aro de pulso suave */}
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-5 ring-8 ring-red-500/10 relative">
                  <AlertCircle className="h-10 w-10 text-red-600" />
                </div>

                {/* Título de error */}
                <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">Ha Ocurrido un Error</h3>
                
                {/* Texto del mensaje */}
                <p className="text-gray-600 text-base leading-relaxed px-2 font-medium">
                  {errorMsg}
                </p>

                {/* Botón de acción */}
                <button 
                  type="button" 
                  onClick={() => setErrorMsg('')} 
                  className="mt-8 w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl shadow-red-600/25 hover:shadow-red-700/40 transition-all duration-200 cursor-pointer border-0 outline-none focus:ring-4 focus:ring-red-100"
                >
                  Cerrar
                </button>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center relative overflow-hidden animate-scale-up">
                {/* Glow decorativo de fondo */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                {/* Icono con aro de pulso suave */}
                <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-5 ring-8 ring-green-500/10 relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                {/* Título de éxito */}
                <h3 className="text-2xl font-extrabold text-gray-900 mb-3 tracking-tight">¡Operación Exitosa!</h3>
                
                {/* Texto del mensaje */}
                <p className="text-gray-600 text-base leading-relaxed px-2 font-medium">
                  {successMsg}
                </p>

                {/* Botón de acción */}
                <button 
                  type="button" 
                  onClick={() => setSuccessMsg('')} 
                  className="mt-8 w-full py-4 px-6 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-600/25 hover:shadow-green-700/40 transition-all duration-200 cursor-pointer border-0 outline-none focus:ring-4 focus:ring-green-100"
                >
                  Entendido
                </button>
              </div>
            )}
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
                  <select name="tipo" value={form.tipo} onChange={handleChange} disabled={loading} className="w-24 px-3 py-3 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100">
                    <option>V</option>
                    <option>E</option>
                    <option>J</option>
                    <option>P</option>
                  </select>
                  <input name="documento" value={form.documento} onChange={handleChange} disabled={loading} placeholder="Ej. 15482901" className="flex-1 px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
                </div>
              </div>

              <div className="md:col-span-8">
                <label className="block text-sm font-medium text-gray-600 mb-2">Nombres / Razón Social</label>
                <input name="nombre" value={form.nombre} onChange={handleChange} disabled={loading} placeholder="Ej. Juan o Comercial XYZ C.A." className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">Apellidos (Opcional para personas jurídicas)</label>
                <input name="apellidos" value={form.apellidos} onChange={handleChange} disabled={loading} placeholder="Ej. Pérez Rodríguez" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-600 mb-2">Teléfono Principal</label>
                <input name="telefono" value={form.telefono} onChange={handleChange} disabled={loading} placeholder="Ej. 0414-5552143" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-600 mb-2">Correo Electrónico</label>
                <input name="correo" value={form.correo} onChange={handleChange} disabled={loading} placeholder="contribuyente@correo.com" className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-green-100" />
              </div>

              <div className="md:col-span-12">
                <label className="block text-sm font-medium text-gray-600 mb-2">Direcciones / Propiedades Registradas</label>
                <div className="flex flex-col md:flex-row gap-3 mb-2">
                  <select 
                    value={selectedSectorId} 
                    onChange={(e) => setSelectedSectorId(e.target.value)} 
                    disabled={loading}
                    className="w-full md:w-64 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100 text-sm"
                  >
                    {sectores.map(sec => (
                      <option key={sec.sector_id} value={sec.sector_id}>{sec.sector_nm}</option>
                    ))}
                  </select>
                  <input 
                    value={detalleDireccion} 
                    onChange={(e) => setDetalleDireccion(e.target.value)} 
                    disabled={loading}
                    placeholder="Calle, número de casa, local, apartamento..." 
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100 text-sm" 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDireccion();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddDireccion}
                    disabled={loading}
                    className="bg-green-100 text-green-700 px-5 py-2 rounded-lg font-medium hover:bg-green-200 transition disabled:bg-green-50 disabled:text-green-300"
                  >
                    Agregar
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mt-2 px-1 text-left">
                  <input 
                    type="checkbox" 
                    id="esPropietarioInput" 
                    checked={esPropietarioInput}
                    onChange={(e) => setEsPropietarioInput(e.target.checked)}
                    className="w-4 h-4 text-green-700 focus:ring-green-100 border-gray-300 rounded cursor-pointer"
                  />
                  <label htmlFor="esPropietarioInput" className="text-xs font-semibold text-gray-600 cursor-pointer select-none">
                    El contribuyente es dueño/propietario de este inmueble (Aplica cargo de Aseo Urbano)
                  </label>
                </div>

                {direccionesForm.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 text-left">
                    {direccionesForm.map((dir, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm">
                        <span className="text-gray-700">
                          <strong>{dir.sector_nm}</strong> - {dir.direcc_ds}
                          {dir.esPropietario && (
                            <span className="ml-2 bg-green-50 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                              Propietario (Aseo)
                            </span>
                          )}
                        </span>
                        <button type="button" onClick={() => setDireccionesForm(direccionesForm.filter((_, i) => i !== idx))} disabled={loading} className="text-red-500 hover:text-red-700 font-bold px-2 border-0 bg-transparent cursor-pointer">&times;</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button type="button" onClick={handleClear} disabled={loading} className="text-sm text-gray-600 hover:underline border-0 bg-transparent cursor-pointer">Cancelar</button>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleClear} disabled={loading} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 cursor-pointer hover:bg-gray-50">Limpiar Campos</button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm flex items-center gap-2 cursor-pointer hover:bg-green-800 disabled:bg-green-700/50">
                  {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
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
                          {inmuebles.filter(inm => inm.contri_id === c.id).length}
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
                          {isAdmin && (
                            <button
                              onClick={() => handleStartEdit(c)}
                              className="p-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition border-0 cursor-pointer text-xs font-semibold px-3"
                            >
                              Editar
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleEstado(c)}
                            className={`p-1.5 rounded-lg transition border-0 cursor-pointer text-xs font-semibold px-3 ${c.estado === 'Inactivo' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                            title={c.estado === 'Inactivo' ? "Activar" : "Inactivar"}
                          >
                            {c.estado === 'Inactivo' ? 'Activar' : 'Inactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-400">
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

      {/* MODAL DE EDICIÓN (SOLO PARA ADMINISTRADORES) */}
      {editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900 font-sans">Editar Datos del Contribuyente</h3>
              <button onClick={() => setEditForm(null)} className="text-gray-400 hover:text-gray-700 bg-transparent border-0 cursor-pointer font-bold text-2xl leading-none">&times;</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4 font-sans text-left">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Documento de Identidad</label>
                  <div className="flex gap-2">
                    <select 
                      value={editForm.tipo} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                      disabled={true}
                      className="w-20 px-2 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed text-sm"
                    >
                      <option>V</option>
                      <option>E</option>
                      <option>J</option>
                      <option>P</option>
                    </select>
                    <input 
                      value={editForm.documento} 
                      onChange={(e) => setEditForm(prev => ({ ...prev, documento: e.target.value }))}
                      disabled={true}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nombre Completo / Razón Social</label>
                  <input 
                    value={editForm.nombre} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, nombre: e.target.value }))}
                    disabled={true}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Teléfono</label>
                  <input 
                    value={editForm.telefono} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, telefono: e.target.value }))}
                    placeholder="Ej. 0414-1234567"
                    disabled={loading}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Correo Electrónico</label>
                  <input 
                    value={editForm.correo} 
                    onChange={(e) => setEditForm(prev => ({ ...prev, correo: e.target.value }))}
                    disabled={loading}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-green-100 text-sm"
                  />
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Direcciones / Propiedades Registradas</label>
                  {editForm.direccionesRaw && editForm.direccionesRaw.length > 0 ? (
                    <div className="flex flex-col gap-2 mb-3">
                      {editForm.direccionesRaw.map((dir) => {
                        const esProp = inmuebles.some(inm => inm.contri_id === editForm.id && (inm.inmueb_dr === dir.detalle || inm.inmueb_dr === dir.direcc_ds));
                        return (
                          <div key={dir.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-xs text-left">
                            <span className="text-gray-700">
                              <strong>{dir.sector_nm}</strong> - {dir.detalle}
                              {esProp && (
                                <span className="ml-2 bg-green-50 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-green-200">
                                  Propietario (Aseo)
                                </span>
                              )}
                            </span>
                            <button 
                              type="button" 
                              onClick={() => handleDeleteDireccion(dir.id)} 
                              disabled={loading}
                              className="text-red-500 hover:text-red-700 font-bold px-2 border-0 bg-transparent cursor-pointer text-base leading-none"
                              title="Eliminar esta dirección"
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic mb-3">No tiene direcciones registradas.</p>
                  )}
                  
                  {/* Formulario para asociar dirección en caliente */}
                  <div className="bg-green-50/50 border border-green-100 rounded-xl p-3 space-y-2 mt-2">
                    <span className="text-xs font-bold text-green-800 uppercase tracking-wider block text-left">Asociar Nueva Dirección</span>
                    <div className="grid grid-cols-1 gap-2">
                      <select 
                        value={editNewSectorId} 
                        onChange={(e) => setEditNewSectorId(e.target.value)}
                        disabled={loading}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 focus:ring-2 focus:ring-green-100 text-xs"
                      >
                        {sectores.map(sec => (
                          <option key={sec.sector_id} value={sec.sector_id}>{sec.sector_nm}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input 
                          value={editNewDetalle} 
                          onChange={(e) => setEditNewDetalle(e.target.value)}
                          disabled={loading}
                          placeholder="Calle, casa, local..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 focus:ring-2 focus:ring-green-100 text-xs"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddNewDireccionToEditing}
                          disabled={loading}
                          className="bg-green-700 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-green-800 text-xs cursor-pointer border-0"
                        >
                          Asociar
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1 px-1 text-left">
                        <input 
                          type="checkbox" 
                          id="editNewEsPropietario" 
                          checked={editNewEsPropietario}
                          onChange={(e) => setEditNewEsPropietario(e.target.checked)}
                          className="w-3.5 h-3.5 text-green-700 focus:ring-green-100 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor="editNewEsPropietario" className="text-[10px] font-semibold text-gray-600 cursor-pointer select-none">
                          El contribuyente es dueño/propietario de este inmueble (Aplica cargo mensual de Aseo Urbano)
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setEditForm(null)} disabled={loading} className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg border-0 cursor-pointer text-sm disabled:bg-green-700/50">
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

import React, { useState, useMemo, useEffect } from 'react'
import { servicioService } from '../services/servicioService'
import { contribuyenteService } from '../services/contribuyenteService'

const mapPeriodToDate = (periodStr, freq) => {
  const currentYear = new Date().getFullYear();
  const matchYear = periodStr.match(/\d{4}/);
  const year = matchYear ? parseInt(matchYear[0]) : currentYear;
  
  if (freq === 'Mensual') {
    const months = {
      'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
      'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
    };
    const key = periodStr.split(' ')[0].toLowerCase();
    const month = months[key] || 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
  
  if (freq === 'Bimensual') {
    const bim = {
      'ene-feb': 1, 'mar-abr': 3, 'may-jun': 5, 'jul-ago': 7, 'sep-oct': 9, 'nov-dic': 11
    };
    const key = periodStr.split(' ')[0].toLowerCase();
    const month = bim[key] || 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
  
  if (freq === 'Trimestral') {
    const trim = {
      'trimestre 1': 1, 'trimestre 2': 4, 'trimestre 3': 7, 'trimestre 4': 10
    };
    const key = periodStr.toLowerCase().replace(/\s+\d{4}/, '');
    const month = trim[key] || 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
  
  if (freq === 'Semestral') {
    const sem = {
      '1er semestre': 1, '2do semestre': 7
    };
    const key = periodStr.toLowerCase().replace(/\s+\d{4}/, '');
    const month = sem[key] || 1;
    return `${year}-${String(month).padStart(2, '0')}-01`;
  }
  
  if (freq === 'Anual') {
    return `${year}-01-01`;
  }
  
  return `${currentYear}-01-01`;
};

export default function Servicios({
  deudas = [],
  setDeudas = () => {},
  loadDeudas = () => {},
  servicios = [],
  loadServicios = () => {},
  contribuyentes = [],
  registrarLog = () => {},
  cajeraMode = false
}) {
  // Estado local para categorías de base de datos
  const [categorias, setCategorias] = useState([])

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await servicioService.getCategorias();
        setCategorias(cats);
      } catch (err) {
        console.error('Error al cargar categorias:', err);
      }
    };
    fetchCats();
  }, []);

  // Configuración para modal flotante de alertas y confirmaciones
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  const [inmuebles, setInmuebles] = useState([])
  const [selectedInmuebId, setSelectedInmuebId] = useState('')

  const loadInmuebles = async () => {
    try {
      const data = await contribuyenteService.getInmuebles();
      setInmuebles(data || []);
    } catch (err) {
      console.error('Error al cargar inmuebles:', err);
    }
  };

  useEffect(() => {
    loadInmuebles();
  }, [contribuyentes]);

  const activeContriInmuebles = useMemo(() => {
    if (!cedula) return [];
    const selectedContri = contribuyentes.find(c => `${c.tipo}-${c.documento}` === cedula);
    if (!selectedContri) return [];
    return inmuebles.filter(inm => inm.contri_id === selectedContri.id);
  }, [cedula, contribuyentes, inmuebles]);

  const showAlert = (title, message, type = 'info') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: null
    });
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm
    });
  };

  // Estados para formulario de nuevo servicio
  const [mostrarFormularioServicio, setMostrarFormularioServicio] = useState(false)
  const [servicioEditando, setServicioEditando] = useState(null)
  const [nuevoServicio, setNuevoServicio] = useState({
    nombre: '',
    catego_id: '',
    descripcion: '',
    montoBase: '0,00',
    frecuencia: 'Mensual'
  })

  // Estados para asignación de servicios
  const [cedula, setCedula] = useState('')
  const [servicio, setServicio] = useState('')
  const [periodo, setPeriodo] = useState('')
  const [monto, setMonto] = useState('0,00')
  const [search, setSearch] = useState('')
  const [searchServicios, setSearchServicios] = useState('')
  const [buscarContribuyente, setBuscarContribuyente] = useState('')
  const [mostrarDropdownContribuyente, setMostrarDropdownContribuyente] = useState(false)
  const [activeGroupDetail, setActiveGroupDetail] = useState(null)

  const contribuyentesFiltradosBusqueda = useMemo(() => {
    const q = buscarContribuyente.trim().toLowerCase();
    const list = contribuyentes.filter(c => c.estado !== 'Inactivo');
    if (!q) return list;
    return list.filter(c => 
      `${c.tipo}-${c.documento}`.toLowerCase().includes(q) ||
      c.nombre.toLowerCase().includes(q) ||
      (c.apellidos && c.apellidos.toLowerCase().includes(q))
    );
  }, [buscarContribuyente, contribuyentes]);

  const selectedServiceObj = useMemo(() => {
    return servicios.find(s => String(s.id) === String(servicio));
  }, [servicio, servicios]);

  const periodosOptions = useMemo(() => {
    if (!selectedServiceObj) return [];
    
    const freq = selectedServiceObj.frecuencia; // 'Mensual', 'Bimensual', 'Trimestral', 'Semestral', 'Anual', 'Único'
    const currentYear = new Date().getFullYear();
    
    switch (freq) {
      case 'Mensual':
        return [
          `Enero ${currentYear}`, `Febrero ${currentYear}`, `Marzo ${currentYear}`,
          `Abril ${currentYear}`, `Mayo ${currentYear}`, `Junio ${currentYear}`,
          `Julio ${currentYear}`, `Agosto ${currentYear}`, `Septiembre ${currentYear}`,
          `Octubre ${currentYear}`, `Noviembre ${currentYear}`, `Diciembre ${currentYear}`
        ];
      case 'Bimensual':
        return [
          `Ene-Feb ${currentYear}`, `Mar-Abr ${currentYear}`, `May-Jun ${currentYear}`,
          `Jul-Ago ${currentYear}`, `Sep-Oct ${currentYear}`, `Nov-Dic ${currentYear}`
        ];
      case 'Trimestral':
        return [
          `Trimestre 1 ${currentYear}`, `Trimestre 2 ${currentYear}`,
          `Trimestre 3 ${currentYear}`, `Trimestre 4 ${currentYear}`
        ];
      case 'Semestral':
        return [
          `1er Semestre ${currentYear}`, `2do Semestre ${currentYear}`
        ];
      case 'Anual':
        return [
          `Año ${currentYear - 1}`, `Año ${currentYear}`, `Año ${currentYear + 1}`
        ];
      case 'Único':
      default:
        return ['No Aplica / Pago Único'];
    }
  }, [selectedServiceObj]);

  useEffect(() => {
    if (periodosOptions.length === 1) {
      setPeriodo(periodosOptions[0]);
    } else {
      setPeriodo('');
    }
  }, [periodosOptions]);

  const formatBs = (value) => {
    return Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Sincronización local de servicios desactivada ya que se utiliza base de datos remota

  // Parsear monto con formato venezolano a decimal/flotante
  const parseBsToFloat = (val) => {
    if (!val) return 0;
    const clean = String(val).replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  // Formatear la escritura en tiempo real de monto base
  const handleMontoBaseChange = (val) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setNuevoServicio(prev => ({ ...prev, montoBase: '0,00' }));
      return;
    }
    const parsed = parseFloat(clean) / 100;
    const formatted = parsed.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setNuevoServicio(prev => ({ ...prev, montoBase: formatted }));
  };

  // Formatear la escritura en tiempo real de monto de deuda
  const handleMontoDebtChange = (val) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      setMonto('0,00');
      return;
    }
    const parsed = parseFloat(clean) / 100;
    const formatted = parsed.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setMonto(formatted);
  };

  const handleGuardarServicio = async (e) => {
    e.preventDefault()

    if (!nuevoServicio.nombre.trim()) {
      showAlert('Campo Requerido', 'El nombre del servicio es obligatorio.', 'error')
      return
    }
    if (!nuevoServicio.catego_id) {
      showAlert('Campo Requerido', 'El tipo/categoría de servicio es obligatorio.', 'error')
      return
    }
    if (!nuevoServicio.descripcion.trim()) {
      showAlert('Campo Requerido', 'La descripción del servicio es obligatoria.', 'error')
      return
    }

    const basePrice = parseBsToFloat(nuevoServicio.montoBase);
    if (basePrice <= 0) {
      showAlert('Monto Inválido', 'Debe ingresar un monto base válido mayor a 0.', 'error')
      return
    }

    try {
      const payload = {
        catego_id: parseInt(nuevoServicio.catego_id),
        servic_nm: nuevoServicio.nombre.trim(),
        servic_ds: nuevoServicio.descripcion.trim(),
        servic_fr: nuevoServicio.frecuencia,
        montoBase: basePrice
      };

      if (servicioEditando) {
        await servicioService.update(servicioEditando.id, {
          ...payload,
          servic_es: servicioEditando.activo ? 'Activo' : 'Inactivo'
        });
        registrarLog('Servicios y Deudas', `Editó servicio: ${payload.servic_nm}`)
        showAlert('Éxito', '¡Servicio actualizado exitosamente!', 'success')
      } else {
        await servicioService.create(payload);
        registrarLog('Servicios y Deudas', `Creó nuevo servicio: ${payload.servic_nm} (${payload.servic_fr}) con monto base Bs. ${payload.montoBase.toFixed(2)}`)
        showAlert('Éxito', '¡Servicio creado exitosamente!', 'success')
      }
      
      // Limpiar formulario y recargar
      setNuevoServicio({ nombre: '', catego_id: '', descripcion: '', montoBase: '0,00', frecuencia: 'Mensual' })
      setServicioEditando(null)
      setMostrarFormularioServicio(false)
      loadServicios();
    } catch (err) {
      console.error('Error al guardar servicio:', err);
      showAlert('Error', 'Hubo un error al guardar el servicio en la base de datos.', 'error')
    }
  }

  const handleEditarServicio = (svc) => {
    setServicioEditando(svc)
    const formattedPrice = svc.montoBase.toLocaleString('es-VE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setNuevoServicio({
      nombre: svc.nombre,
      catego_id: svc.catego_id || '',
      descripcion: svc.descripcion,
      montoBase: formattedPrice,
      frecuencia: svc.frecuencia
    })
    setMostrarFormularioServicio(true)
  }

  const handleCancelarFormulario = () => {
    setMostrarFormularioServicio(false)
    setServicioEditando(null)
    setNuevoServicio({ nombre: '', catego_id: '', descripcion: '', montoBase: '0,00', frecuencia: 'Mensual' })
  }

  const handleEliminarServicio = async (id) => {
    const svc = servicios.find(s => s.id === id)
    if (!svc) return

    showConfirm('Confirmar Acción', `¿Está seguro de que desea eliminar el servicio "${svc.nombre}"?`, async () => {
      try {
        await servicioService.delete(id);
        registrarLog('Servicios y Deudas', `Eliminó servicio: ${svc.nombre}`)
        showAlert('Éxito', '¡Servicio eliminado correctamente!', 'success')
        loadServicios();
      } catch (err) {
        console.error('Error al eliminar servicio:', err);
        showAlert('Error', 'Error al intentar eliminar el servicio.', 'error')
      }
    });
  }

  const serviciosFiltrados = useMemo(() => {
    const activeSvcs = servicios.filter(s => s.activo)
    const q = searchServicios.trim().toLowerCase()
    if (!q) return activeSvcs
    return activeSvcs.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.descripcion.toLowerCase().includes(q) ||
      s.frecuencia.toLowerCase().includes(q)
    )
  }, [searchServicios, servicios])

  const deudasAgrupadas = useMemo(() => {
    const groups = {}
    deudas.forEach(d => {
      const key = `${d.ci}-${d.servic_id}-${d.inmueble_direccion || d.inmueb_id || 'general'}`
      if (!groups[key]) {
        groups[key] = {
          ci: d.ci,
          contri_id: d.contri_id,
          servic_id: d.servic_id,
          servicio: d.servicio,
          inmueble_direccion: d.inmueble_direccion,
          nombre: contribuyentes.find(c => `${c.tipo}-${c.documento}` === d.ci)?.nombre || 'Contribuyente',
          frecuencia: d.frecuencia || 'Mensual',
          detalles: [],
          montoTotalPendiente: 0,
          periodosPendientesCount: 0,
          periodosPendientesList: []
        }
      }
      
      groups[key].detalles.push(d)
      if (d.estado === 'Pendiente') {
        groups[key].montoTotalPendiente += d.monto
        groups[key].periodosPendientesCount += 1
        groups[key].periodosPendientesList.push(d.periodo)
      }
    })

    return Object.values(groups).map((group, index) => {
      group.detalles.sort((a, b) => b.id - a.id)
      
      let resumenPeriodos = 'Al día'
      let badgeColor = 'bg-green-100 text-green-800 border-green-200'
      let estatusTexto = 'Solvente'
      
      if (group.periodosPendientesCount > 0) {
        estatusTexto = 'No Solvente'
        badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200'
        
        const countText = group.periodosPendientesCount === 1 ? '1 período' : `${group.periodosPendientesCount} períodos`
        const sortedPeriodos = [...group.periodosPendientesList].reverse()
        const rangeText = sortedPeriodos.length > 1 
          ? `${sortedPeriodos[0]} - ${sortedPeriodos[sortedPeriodos.length - 1]}`
          : sortedPeriodos[0]
          
        resumenPeriodos = `${countText} (${rangeText})`
      }
      
      return {
        ...group,
        num: index + 1,
        resumenPeriodos,
        estatusTexto,
        badgeColor
      }
    })
  }, [deudas, contribuyentes])

  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return deudasAgrupadas
    return deudasAgrupadas.filter(g =>
      g.ci.toLowerCase().includes(q) ||
      g.nombre.toLowerCase().includes(q) ||
      g.servicio.toLowerCase().includes(q) ||
      g.resumenPeriodos.toLowerCase().includes(q)
    )
  }, [search, deudasAgrupadas])

  const handleEliminarSuscripcion = async (group) => {
    if (!group) return
    const targetLabel = group.inmueble_direccion ? `${group.ci} (${group.inmueble_direccion})` : group.ci;
    showConfirm('Confirmar Acción', `¿Está seguro de que desea eliminar todas las deudas registradas de "${group.servicio}" para ${targetLabel}?`, async () => {
      try {
        await Promise.all(group.detalles.map(d => servicioService.deleteDeuda(d.id)))
        setActiveGroupDetail(null)
        showAlert('Éxito', 'Se eliminaron todas las deudas del servicio correctamente.', 'success')
        loadDeudas()
      } catch (err) {
        console.error('Error al eliminar deudas del grupo:', err)
        showAlert('Error', 'Hubo un error al eliminar las deudas de la base de datos.', 'error')
      }
    })
  }

  const handleGenerate = async (e) => {
    e.preventDefault()

    if (!cedula) {
      showAlert('Campo Requerido', 'Debe seleccionar un contribuyente de la lista.', 'error')
      return
    }
    if (!servicio) {
      showAlert('Campo Requerido', 'Debe seleccionar un tipo de servicio.', 'error')
      return
    }
    if (!periodo) {
      showAlert('Campo Requerido', 'Debe seleccionar un periodo a facturar.', 'error')
      return
    }

    const parsedMonto = parseBsToFloat(monto)
    if (parsedMonto <= 0) {
      showAlert('Monto Inválido', 'Debe ingresar un monto numérico válido mayor a 0.', 'error')
      return
    }

    const selectedContri = contribuyentes.find(c => `${c.tipo}-${c.documento}` === cedula);
    if (!selectedContri) {
      showAlert('Error', 'Contribuyente no válido.', 'error');
      return;
    }

    const selectedSvc = servicios.find(s => String(s.id) === String(servicio));
    if (!selectedSvc) {
      showAlert('Error', 'Servicio no válido.', 'error');
      return;
    }

    try {
      const debtDate = mapPeriodToDate(periodo, selectedSvc.frecuencia);

      const payload = {
        contri_id: selectedContri.id,
        servic_id: selectedSvc.id,
        tarifa_id: selectedSvc.tarifa_id,
        deudas_mt: parsedMonto,
        deudas_fe: debtDate,
        deudas_es: 'Pendiente',
        inmueb_id: selectedInmuebId ? parseInt(selectedInmuebId) : null
      };

      await servicioService.createDeuda(payload);

      registrarLog('Servicios y Deudas', `Asignó deuda por ${selectedSvc.nombre} (${periodo}) a contribuyente ${cedula} por Bs. ${parsedMonto.toFixed(2)}`)
      showAlert('Éxito', '¡Deuda asignada con éxito!', 'success')

      setCedula('')
      setBuscarContribuyente('')
      setServicio('')
      setPeriodo('')
      setSelectedInmuebId('')
      setMonto('0,00')
      loadDeudas();
    } catch (err) {
      console.error('Error al asignar deuda:', err);
      showAlert('Error', 'Hubo un error al guardar la deuda en la base de datos.', 'error')
    }
  }

  const handleDelete = async (id) => {
    const target = deudas.find(d => d.id === id)
    if (!target) return

    showConfirm('Confirmar Eliminación', '¿Está seguro de que desea eliminar esta deuda?', async () => {
      try {
        await servicioService.deleteDeuda(id);
        registrarLog('Servicios y Deudas', `Eliminó deuda ID ${target.id} (${target.servicio}) de contribuyente ${target.ci} por Bs. ${target.monto.toFixed(2)}`)
        showAlert('Éxito', 'Deuda eliminada correctamente.', 'success');
        loadDeudas();
      } catch (err) {
        console.error('Error al eliminar deuda:', err);
        showAlert('Error', 'Hubo un error al eliminar la deuda de la base de datos.', 'error')
      }
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* ========== GESTIÓN DE SERVICIOS ========== */}
        {!cajeraMode && (
          <>
            {/* Botón para crear nuevo servicio */}
            <div className="mb-6">
              <button
                onClick={() => {
                  setServicioEditando(null)
                  setNuevoServicio({ nombre: '', catego_id: '', descripcion: '', montoBase: '0,00', frecuencia: 'Mensual' })
                  setMostrarFormularioServicio(true)
                }}
                className="bg-green-800 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg flex items-center gap-2 cursor-pointer transition border-0 shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Nuevo Tipo de Servicio
              </button>
            </div>

        {/* Formulario Modal para crear/editar servicio */}
        {mostrarFormularioServicio && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform animate-scale-up max-h-[95vh] overflow-y-auto">
              {/* Green color stripe at top */}
              <div className="h-2 w-full bg-green-800" />
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-800">
                    {servicioEditando ? 'Editar Servicio' : 'Crear Nuevo Tipo de Servicio'}
                  </h2>
                  <button
                    onClick={handleCancelarFormulario}
                    className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 rounded-full hover:bg-gray-100 border-0 bg-transparent transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleGuardarServicio} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del Servicio *</label>
                      <input
                        type="text"
                        value={nuevoServicio.nombre}
                        onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                        placeholder="Ej. Aseo Urbano"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Servicio / Categoría *</label>
                      <select
                        value={nuevoServicio.catego_id}
                        onChange={(e) => setNuevoServicio({ ...nuevoServicio, catego_id: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:bg-white transition"
                      >
                        <option value="">Seleccione tipo...</option>
                        {categorias.map(cat => (
                          <option key={cat.catego_id} value={cat.catego_id}>
                            {cat.catego_nm}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Monto Base (Bs.) *</label>
                      <input
                        type="text"
                        value={nuevoServicio.montoBase}
                        onChange={(e) => handleMontoBaseChange(e.target.value)}
                        placeholder="Ej. 120,00"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción *</label>
                    <textarea
                      value={nuevoServicio.descripcion}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                      placeholder="Descripción detallada del servicio..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none h-24 focus:bg-white transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Frecuencia de Cobro</label>
                    <select
                      value={nuevoServicio.frecuencia}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, frecuencia: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:bg-white transition"
                    >
                      <option value="Mensual">Mensual</option>
                      <option value="Bimensual">Bimensual</option>
                      <option value="Trimestral">Trimestral</option>
                      <option value="Semestral">Semestral</option>
                      <option value="Anual">Anual</option>
                      <option value="Único">Único</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="submit"
                      className="flex-1 bg-green-800 hover:bg-green-700 text-white font-semibold py-3 rounded-xl cursor-pointer transition border-0 shadow-sm"
                    >
                      {servicioEditando ? 'Actualizar Servicio' : 'Guardar Servicio'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelarFormulario}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl cursor-pointer transition border-0"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
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
                      <span className="text-xs text-gray-500">Tipo de Servicio:</span>
                      <span className="text-xs font-semibold text-gray-700">{svc.categoria || 'Sin Categoría'}</span>
                    </div>
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
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">Contribuyente Destinatario *</label>
              <input
                type="text"
                placeholder="Buscar por cédula, RIF, nombre o apellido..."
                value={buscarContribuyente}
                onFocus={() => setMostrarDropdownContribuyente(true)}
                onChange={(e) => {
                  setBuscarContribuyente(e.target.value);
                  setCedula(''); // Reset selected taxpayer while typing
                  setMostrarDropdownContribuyente(true);
                }}
                className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 border-0"
              />
              
              {/* Reset/Clear selection button */}
              {cedula && (
                <button
                  type="button"
                  onClick={() => {
                    setCedula('');
                    setBuscarContribuyente('');
                  }}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600 bg-transparent border-0 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}

              {/* Dropdown list */}
              {mostrarDropdownContribuyente && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setMostrarDropdownContribuyente(false)} 
                  />
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-lg shadow-xl z-20 animate-fade-in">
                    {contribuyentesFiltradosBusqueda.length > 0 ? (
                      contribuyentesFiltradosBusqueda.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCedula(`${c.tipo}-${c.documento}`);
                            setBuscarContribuyente(`${c.tipo}-${c.documento} — ${c.nombre} ${c.apellidos || ''}`);
                            setMostrarDropdownContribuyente(false);
                          }}
                          className="px-4 py-3 hover:bg-green-50/50 cursor-pointer text-sm border-b last:border-b-0 border-gray-100 transition flex items-center justify-between"
                        >
                          <div className="text-left">
                            <span className="font-semibold text-gray-800">{c.tipo}-{c.documento}</span>
                            <span className="text-gray-500 ml-2">— {c.nombre} {c.apellidos || ''}</span>
                          </div>
                          {cedula === `${c.tipo}-${c.documento}` && (
                            <span className="text-green-600 font-bold">✓</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-400 text-center">
                        No se encontraron contribuyentes
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Servicio</label>
                <select 
                  value={servicio} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setServicio(val);
                    const found = servicios.find(s => String(s.id) === String(val));
                    if (found) {
                      const formatted = found.montoBase.toLocaleString('es-VE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      });
                      setMonto(formatted);
                    } else {
                      setMonto('0,00');
                    }
                  }} 
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200"
                >
                  <option value="">Seleccione un servicio...</option>
                  {servicios.filter(s => s.activo).map(svc => (
                    <option key={svc.id} value={svc.id}>
                      [{svc.categoria}] {svc.nombre} - Bs. {formatBs(svc.montoBase)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Periodo a Facturar</label>
                <select 
                  value={periodo} 
                  onChange={(e) => setPeriodo(e.target.value)} 
                  disabled={!servicio || periodosOptions.length === 1}
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-200 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {!servicio ? (
                    <option value="">Seleccione primero un servicio...</option>
                  ) : periodosOptions.length === 1 ? (
                    <option value={periodosOptions[0]}>{periodosOptions[0]}</option>
                  ) : (
                    <>
                      <option value="">Seleccione un periodo...</option>
                      {periodosOptions.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">Monto (Bs.)</label>
                 <input
                  type="text"
                  value={monto}
                  disabled
                  readOnly
                  placeholder="Ej. 120,00"
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 opacity-80 cursor-not-allowed border-0 font-medium"
                />
              </div>
            </div>

            {activeContriInmuebles.length > 0 && (
              <div className="mt-2 text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2 font-semibold">Asociar a Inmueble / Propiedad</label>
                <select
                  value={selectedInmuebId}
                  onChange={(e) => setSelectedInmuebId(e.target.value)}
                  className="w-full bg-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 border-0"
                >
                  <option value="">-- Seleccionar Propiedad (Opcional) --</option>
                  {activeContriInmuebles.map(inm => (
                    <option key={inm.inmueb_id} value={inm.inmueb_id}>
                      {inmuebles.filter(x => x.contri_id === inm.contri_id).indexOf(inm) + 1}° Inmueble - {inm.inmueb_dr} (Catastro: {inm.inmueb_ct})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="pt-2">
              <button type="submit" className="w-full bg-green-800 hover:bg-green-700 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition border-0">
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
              <p className="text-sm text-gray-500">{deudasAgrupadas.length} servicios de contribuyentes registrados</p>
            </div>

            <div className="w-full md:w-80">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por Cédula, Nombre o Servicio..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-100"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="py-3 pr-6 font-semibold">N°</th>
                  <th className="py-3 pr-6 font-semibold">CÉDULA / RIF</th>
                  <th className="py-3 pr-6 font-semibold">CONTRIBUYENTE</th>
                  <th className="py-3 pr-6 font-semibold">SERVICIO</th>
                  <th className="py-3 pr-6 font-semibold">PERÍODOS PENDIENTES</th>
                  <th className="py-3 pr-6 font-semibold text-right">MONTO PENDIENTE</th>
                  <th className="py-3 pr-6 font-semibold text-center">ESTADO</th>
                  <th className="py-3 pr-6 font-semibold text-center">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrouped.length > 0 ? (
                  filteredGrouped.map(g => (
                    <tr key={`${g.ci}-${g.servic_id}-${g.inmueble_direccion || g.inmueb_id || 'general'}`} className="border-b last:border-b-0 hover:bg-gray-50/50">
                      <td className="py-4 font-medium text-gray-800">{g.num}</td>
                      <td className="py-4 text-gray-700">{g.ci}</td>
                      <td className="py-4 text-gray-800 font-medium">{g.nombre}</td>
                      <td className="py-4 text-gray-800 font-medium text-left">
                        <div>{g.servicio}</div>
                        {g.inmueble_direccion && (
                          <div className="text-xs text-gray-400 font-normal mt-0.5">
                            Dirección: {g.inmueble_direccion}
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-gray-500">{g.resumenPeriodos}</td>
                      <td className="py-4 font-semibold text-right text-gray-900">Bs. {formatBs(g.montoTotalPendiente)}</td>
                      <td className="py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${g.badgeColor}`}>
                          {g.estatusTexto}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            title="Abrir Carpeta de Deuda"
                            onClick={() => setActiveGroupDetail(g)}
                            className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition border-0 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-gray-400">
                      No se encontraron servicios de contribuyentes que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
            <div>Mostrando {filteredGrouped.length} de {deudasAgrupadas.length} registros agrupados</div>
          </div>
        </div>
      </div>

       {/* Custom Alert/Confirm Modal */}
       {modalConfig.isOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
           <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform animate-scale-up">
             {/* Color stripe or top icon */}
             <div className={`h-2 w-full ${
               modalConfig.type === 'success' ? 'bg-green-600' :
               modalConfig.type === 'error' ? 'bg-red-600' :
               modalConfig.type === 'confirm' ? 'bg-amber-500' : 'bg-blue-600'
             }`} />
             
             <div className="p-6">
               <div className="flex justify-center mb-4">
                 {modalConfig.type === 'success' ? (
                   <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                     </svg>
                   </div>
                 ) : modalConfig.type === 'error' ? (
                   <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                 ) : (
                   <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                 )}
               </div>

               <h3 className="text-lg font-bold text-center text-gray-800 mb-2">{modalConfig.title}</h3>
               <p className="text-sm text-center text-gray-600 mb-6 leading-relaxed">{modalConfig.message}</p>

               <div className="flex gap-3">
                 {modalConfig.type === 'confirm' ? (
                   <>
                     <button
                       onClick={() => {
                         setModalConfig(prev => ({ ...prev, isOpen: false }));
                         if (modalConfig.onConfirm) modalConfig.onConfirm();
                       }}
                       className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-semibold rounded-xl transition duration-150 cursor-pointer shadow-sm shadow-amber-500/10 border-0"
                     >
                       Confirmar
                     </button>
                     <button
                       onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                       className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition duration-150 cursor-pointer border-0"
                     >
                       Cancelar
                     </button>
                   </>
                 ) : (
                   <button
                     onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                     className={`w-full py-2.5 text-white text-sm font-semibold rounded-xl transition duration-150 cursor-pointer border-0 ${
                       modalConfig.type === 'success' ? 'bg-green-700 hover:bg-green-800 shadow-sm shadow-green-700/10' :
                       modalConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                     }`}
                   >
                     Aceptar
                   </button>
                 )}
               </div>
             </div>
           </div>
         </div>
       )}

        {/* Modal: Carpeta de Deuda (Detalle Agrupado) */}
        {activeGroupDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-up border border-gray-100 transform">
              {/* Cabecera */}
              <div className="bg-green-800 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-lg">Carpeta de Deuda</h3>
                    <p className="text-xs text-green-100">{activeGroupDetail.servicio} — {activeGroupDetail.nombre}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveGroupDetail(null)}
                  className="text-white hover:text-green-200 bg-transparent border-0 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6">
                {/* Información general del grupo */}
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">Contribuyente</span>
                    <span className="font-medium text-gray-800">{activeGroupDetail.nombre}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{activeGroupDetail.ci}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">Servicio Contratado</span>
                    <span className="font-medium text-gray-800">{activeGroupDetail.servicio} ({activeGroupDetail.frecuencia})</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">Total Pendiente</span>
                    <span className="font-semibold text-green-700 text-lg">Bs. {formatBs(activeGroupDetail.montoTotalPendiente)}</span>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-gray-400 font-semibold">Estado de Cuenta</span>
                    <span className={`inline-block px-2.5 py-0.5 mt-1 rounded-full text-xs font-semibold border ${activeGroupDetail.badgeColor}`}>
                      {activeGroupDetail.estatusTexto}
                    </span>
                  </div>
                </div>

                {/* Tabla de desglose de periodos */}
                <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left table-auto text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 border-b">
                        <th className="py-2.5 px-4 font-semibold">ID</th>
                        <th className="py-2.5 px-4 font-semibold">Período</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Monto</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Estado</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroupDetail.detalles.map(d => (
                        <tr key={d.id} className="border-b last:border-b-0 hover:bg-gray-50/50">
                          <td className="py-2.5 px-4 text-gray-400 font-mono text-xs">{d.id}</td>
                          <td className="py-2.5 px-4 font-medium text-gray-700">{d.periodo}</td>
                          <td className="py-2.5 px-4 font-semibold text-right text-gray-900">Bs. {formatBs(d.monto)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              d.estado === 'Pagada' || d.estado === 'Pagado'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {d.estado}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex gap-2 justify-center">
                              {(d.estado !== 'Pagada' && d.estado !== 'Pagado') && (
                                <button
                                  title="Eliminar este período"
                                  onClick={async () => {
                                    showConfirm('Confirmar Eliminación', `¿Está seguro de que desea eliminar el período "${d.periodo}" de esta deuda?`, async () => {
                                      try {
                                        await servicioService.deleteDeuda(d.id);
                                        showAlert('Éxito', 'Período eliminado correctamente.', 'success');
                                        loadDeudas();
                                        setActiveGroupDetail(null);
                                      } catch (err) {
                                        console.error(err);
                                        showAlert('Error', 'No se pudo eliminar el período.', 'error');
                                      }
                                    });
                                  }}
                                  className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 transition border-0 cursor-pointer"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Botones de pie */}
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    onClick={() => handleEliminarSuscripcion(activeGroupDetail)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition border-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                    </svg>
                    Eliminar Historial Completo
                  </button>
                  
                  <button
                    onClick={() => setActiveGroupDetail(null)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-6 rounded-lg cursor-pointer transition border-0"
                  >
                    Cerrar Carpeta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
     </div>
   )
 }

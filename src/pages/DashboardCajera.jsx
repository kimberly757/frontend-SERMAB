import React, { useState, useEffect, useMemo } from 'react'
import {
  Printer,
  User,
  CreditCard,
  Layers,
  Users,
  LogOut,
  Menu,
  CheckCircle,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react'
import logoAlcaldia from '../assets/logo-alcaldia.png'

import Caja from './Caja'
import Contribuyentes from './Contribuyentes'
import Servicios from './Servicios'
import { contribuyenteService } from '../services/contribuyenteService'
import { servicioService } from '../services/servicioService'

export default function DashboardCajera({ onLogout = () => {} }) {
  const [page, setPage] = useState('resumen')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Datos de la sesión de la cajera
  const sesionCajera = {
    nombre: 'María González',
    rol: 'Cajera',
    cajaNumero: '03',
    turno: 'Mañana'
  }

  // Estados cargados desde la base de datos
  const [contribuyentes, setContribuyentes] = useState([])

  const loadContribuyentes = async () => {
    try {
      const [contriList, direccList, sectorList] = await Promise.all([
        contribuyenteService.getAll(),
        contribuyenteService.getDirecciones(),
        contribuyenteService.getSectores()
      ]);
      
      const mapped = contriList.map(c => {
        let tipo = 'V';
        if (c.tipcon_id === 2) tipo = 'J';
        else if (c.tipcon_id === 3) tipo = 'G';
        else if (c.tipcon_id === 4) tipo = 'E';
        
        const associatedDirs = direccList.filter(d => d.contri_id === c.contri_id);
        const direcciones = associatedDirs.map(d => {
          const sector = sectorList.find(s => s.sector_id === d.sector_id);
          const sectorNm = sector ? sector.sector_nm : 'Sin Sector';
          return `${sectorNm} - ${d.direcc_ds}`;
        });
        
        const direccionesRaw = associatedDirs.map(d => {
          const sector = sectorList.find(s => s.sector_id === d.sector_id);
          const sectorNm = sector ? sector.sector_nm : 'Sin Sector';
          return {
            id: d.direcc_id,
            sector_id: d.sector_id,
            sector_nm: sectorNm,
            detalle: d.direcc_ds
          };
        });

        let doc = c.contri_ri || '';
        const cleanDoc = doc.replace(/[^0-9]/g, '');
        if (cleanDoc && cleanDoc.length > 3) {
          doc = Number(cleanDoc).toLocaleString('es-VE');
        }

        return {
          id: c.contri_id,
          tipo,
          documento: doc,
          nombre: c.contri_nr || '',
          apellidos: '',
          telefono: c.contri_tl || '',
          correo: c.contri_em || '',
          estado: c.contri_es || 'Activo',
          direcciones,
          direccionesRaw
        };
      });
      
      setContribuyentes(mapped);
    } catch (err) {
      console.error('Error al cargar contribuyentes:', err);
    }
  };

  useEffect(() => {
    loadContribuyentes();
    loadDeudas();
    loadServicios();
  }, []);

  const [deudas, setDeudasState] = useState([])
  const [servicios, setServicios] = useState([])

  const loadDeudas = async () => {
    try {
      const data = await servicioService.getDeudas();
      const mapped = data.map(d => {
        let tipo = 'V';
        if (d.tipcon_id === 2) tipo = 'J';
        else if (d.tipcon_id === 3) tipo = 'G';
        else if (d.tipcon_id === 4) tipo = 'E';
        
        let doc = d.contri_ri || '';
        const cleanDoc = doc.replace(/[^0-9]/g, '');
        if (cleanDoc && cleanDoc.length > 3) {
          doc = Number(cleanDoc).toLocaleString('es-VE');
        }
        
        return {
          id: d.deudas_id,
          contri_id: d.contri_id,
          servic_id: d.servic_id,
          tarifa_id: d.tarifa_id,
          ci: `${tipo}-${doc}`,
          servicio: d.servic_nm,
          periodo: d.deudas_fe ? new Date(d.deudas_fe).toLocaleDateString('es-VE') : '',
          monto: parseFloat(d.deudas_mt) || 0,
          estado: d.deudas_es
        };
      });
      setDeudasState(mapped);
    } catch (err) {
      console.error('Error al cargar deudas:', err);
    }
  };

  const loadServicios = async () => {
    try {
      const data = await servicioService.getAll();
      const mapped = data.map(s => ({
        id: s.servic_id,
        catego_id: s.catego_id,
        categoria: s.catego_nm,
        nombre: s.servic_nm,
        descripcion: s.servic_ds,
        montoBase: parseFloat(s.montoBase) || 0,
        frecuencia: s.servic_fr || 'Mensual',
        activo: s.servic_es === 'Activo',
        tarifa_id: s.tarifa_id
      }));
      setServicios(mapped);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    }
  };

  const setDeudas = async (value) => {
    let newDeudas;
    if (typeof value === 'function') {
      newDeudas = value(deudas);
    } else {
      newDeudas = value;
    }
    
    for (const newD of newDeudas) {
      const oldD = deudas.find(d => d.id === newD.id);
      if (oldD && oldD.estado !== newD.estado) {
        try {
          await servicioService.updateDeuda(newD.id, { deudas_es: newD.estado });
        } catch (e) {
          console.error(`Error al actualizar estado de la deuda ${newD.id}:`, e);
        }
      }
    }
    setDeudasState(newDeudas);
  };

  const [operaciones, setOperaciones] = useState(() => {
    const saved = localStorage.getItem('sermab_operaciones')
    return saved ? JSON.parse(saved) : []
  })

  const [logsBitacora, setLogsBitacora] = useState(() => {
    const saved = localStorage.getItem('sermab_bitacora')
    return saved ? JSON.parse(saved) : []
  })

  const [tasaBcv, setTasaBcv] = useState(() => {
    const saved = localStorage.getItem('sermab_tasa_bcv')
    return saved ? parseFloat(saved) : 36.45
  })

  const [fondoCaja, setFondoCaja] = useState(() => {
    const saved = localStorage.getItem('sermab_fondo_caja')
    return saved ? parseFloat(saved) : null
  })
  const [fondoInput, setFondoInput] = useState('')
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false)

  // Sincronización automática de cambios
  useEffect(() => {
    localStorage.setItem('sermab_contribuyentes', JSON.stringify(contribuyentes))
  }, [contribuyentes])

  useEffect(() => {
    localStorage.setItem('sermab_deudas', JSON.stringify(deudas))
  }, [deudas])

  useEffect(() => {
    localStorage.setItem('sermab_operaciones', JSON.stringify(operaciones))
  }, [operaciones])

  useEffect(() => {
    localStorage.setItem('sermab_bitacora', JSON.stringify(logsBitacora))
  }, [logsBitacora])

  const registrarLog = (modulo, accion) => {
    const today = new Date()
    const fechaHora = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`
    const nuevoLog = {
      id: `BIT-${String(logsBitacora.length + 1).padStart(3, '0')}`,
      fechaHora,
      usuario: `${sesionCajera.rol} (${sesionCajera.nombre})`,
      modulo,
      accion,
      ip: '192.168.1.105'
    }
    setLogsBitacora(prev => [nuevoLog, ...prev])
  }

  // Filtrar operaciones de hoy de esta cajera
  const todayStr = useMemo(() => {
    const today = new Date()
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
  }, [])

  const operationsToday = useMemo(() => {
    return operaciones.filter(op => op.fecha.includes(todayStr) && op.cajero.includes('María'))
  }, [operaciones, todayStr])

  const activeOperations = useMemo(() => operationsToday.filter(op => op.estado !== 'Anulado'), [operationsToday])

  const resumenCaja = useMemo(() => {
    const total = activeOperations.reduce((sum, op) => sum + op.monto, 0)
    const efectivo = activeOperations.filter(op => op.metodo === 'efectivo').reduce((sum, op) => sum + op.monto, 0)
    const transferencia = activeOperations.filter(op => op.metodo === 'transferencia').reduce((sum, op) => sum + op.monto, 0)
    const pagoMovil = activeOperations.filter(op => op.metodo === 'pago-movil').reduce((sum, op) => sum + op.monto, 0)
    return { total, efectivo, transferencia, pagoMovil }
  }, [activeOperations])

  const handlePrintReceipt = (reciboId) => {
    alert(`Imprimiendo copia de recibo: ${reciboId}`)
    registrarLog('Caja', `Re-imprimió soporte de recibo: ${reciboId}`)
  }

  const handleAnularRecibo = (recibo) => {
    const password = prompt('Ingrese la contraseña del Supervisor de Caja para autorizar la anulación:')
    if (password === 'admin123') {
      // Revertir deuda
      setDeudas(prev => prev.map(d => {
        const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
        const cleanReciboCi = String(recibo.ci).replace(/[^0-9]/g, '')
        if (recibo.servicio.includes(d.servicio) && cleanDebtCi === cleanReciboCi) {
          return { ...d, estado: 'Pendiente' }
        }
        return d
      }))
      // Marcar operación como anulada
      setOperaciones(prev => prev.map(op => op.recibo === recibo.recibo ? { ...op, estado: 'Anulado' } : op))
      registrarLog('Caja', `Supervisor autorizó anulación del recibo: ${recibo.recibo} por Bs. ${recibo.monto}`)
      alert('Recibo anulado correctamente.')
    } else if (password !== null) {
      alert('Contraseña incorrecta. Anulación denegada.')
    }
  }

  const handleEstablecerFondo = (e) => {
    e.preventDefault()
    const monto = parseFloat(fondoInput)
    if (!isNaN(monto) && monto >= 0) {
      setFondoCaja(monto)
      localStorage.setItem('sermab_fondo_caja', monto.toString())
      registrarLog('Caja', `Inició turno con un fondo de sencillo de: Bs. ${monto.toFixed(2)}`)
    }
  }

  const handleCerrarCaja = () => {
    registrarLog('Caja', `Cerró turno. Efectivo: ${resumenCaja.efectivo}, Transf: ${resumenCaja.transferencia}, PM: ${resumenCaja.pagoMovil}. Total Recaudado: ${resumenCaja.total}`)
    alert(`Cierre de caja generado con éxito.\nTotal del día: Bs. ${resumenCaja.total.toFixed(2)}\nSaliendo del sistema...`)
    setIsCierreModalOpen(false)
    setFondoCaja(null)
    localStorage.removeItem('sermab_fondo_caja')
    onLogout()
  }

  const itemClass = (active) =>
    `flex items-center gap-4 p-3 rounded-lg text-white no-underline w-full border-0 text-left bg-transparent cursor-pointer transition ${
      active ? 'bg-[#0f4f2f] shadow-sm' : 'hover:bg-white/5'
    }`

  const handleNav = (e, targetPage) => {
    e.preventDefault()
    setPage(targetPage)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      
      {/* Background Overlay on Mobile */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Menú Lateral de Navegación Restringido (Diseño IDÉNTICO al de Administrador) */}
      <aside className={`fixed left-0 top-0 h-screen w-72 bg-[#06381f] text-white flex flex-col p-6 shadow-lg z-50 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Cintillo de identificación de la Alcaldía */}
        <div className="flex items-center gap-3 mb-8">
          <img src={logoAlcaldia} alt="Logo Alcaldía Andrés Bello" className="w-12 h-12 rounded-full object-cover bg-white" />
          <div>
            <div className="font-semibold text-lg">Alcaldía</div>
            <div className="text-sm text-green-100">Andrés Bello</div>
          </div>
        </div>

        {/* Ficha rápida de sesión del cajero */}
        <div className="bg-[#0f4f2f] rounded-xl p-4 mb-6 border border-white/10">
          <div className="text-xs text-green-100 uppercase font-semibold">Cajero Activo</div>
          <div className="font-semibold text-base mt-1 text-white">{sesionCajera.nombre}</div>
          <div className="text-xs text-yellow-300 font-bold mt-1">Rol: {sesionCajera.rol}</div>
          <div className="text-[10px] text-green-200 mt-2">Caja #{sesionCajera.cajaNumero} · Turno {sesionCajera.turno}</div>
        </div>

        {/* Enlaces de Navegación Limitados (Exclusivos del cajero) */}
        <nav className="flex-1">
          <ul className="space-y-2 list-none p-0 m-0">
            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'resumen')}
                className={itemClass(page === 'resumen')}
              >
                <span className={`p-2 rounded-full ${page === 'resumen' ? 'bg-yellow-400 text-[#083018]' : 'bg-transparent text-yellow-300'}`}>
                  <Layers className="w-4 h-4" />
                </span>
                <span className="font-medium">Resumen de Caja</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'caja')}
                className={itemClass(page === 'caja')}
              >
                <span className={`p-2 rounded-full ${page === 'caja' ? 'bg-yellow-400 text-[#083018]' : 'bg-transparent text-yellow-300'}`}>
                  <CreditCard className="w-4 h-4" />
                </span>
                <span>Procesar Cobros</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'contribuyentes')}
                className={itemClass(page === 'contribuyentes')}
              >
                <span className={`p-2 rounded-full ${page === 'contribuyentes' ? 'bg-yellow-400 text-[#083018]' : 'bg-transparent text-yellow-300'}`}>
                  <Users className="w-4 h-4" />
                </span>
                <span>Ver Contribuyentes</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'servicios')}
                className={itemClass(page === 'servicios')}
              >
                <span className={`p-2 rounded-full ${page === 'servicios' ? 'bg-yellow-400 text-[#083018]' : 'bg-transparent text-yellow-300'}`}>
                  <FileText className="w-4 h-4" />
                </span>
                <span>Asignar Deuda</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Cerrar Sesión Seguro */}
        <div className="mt-auto">
          <button onClick={onLogout} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 bg-transparent border-0 cursor-pointer text-left text-white text-base">
            <LogOut className="w-4 h-4 text-yellow-300" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 ml-0 md:ml-72 p-6 transition-all duration-300 overflow-y-auto">
        
        {/* Header móvil */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 mb-6 md:hidden border border-gray-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 cursor-pointer border-0"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-800">Caja #{sesionCajera.cajaNumero}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center font-bold text-xs">
            MC
          </div>
        </div>

        {page === 'caja' ? (
          <Caja 
            contribuyentes={contribuyentes}
            deudas={deudas}
            setDeudas={setDeudas}
            setOperaciones={setOperaciones}
            userData={sesionCajera}
            registrarLog={registrarLog}
            tasaBcv={tasaBcv}
            onLogout={onLogout}
          />
        ) : page === 'contribuyentes' ? (
          <Contribuyentes 
            contribuyentes={contribuyentes}
            setContribuyentes={loadContribuyentes}
            registrarLog={registrarLog}
            deudas={deudas}
            isAdmin={false}
          />
        ) : page === 'servicios' ? (
          <Servicios 
            contribuyentes={contribuyentes}
            deudas={deudas}
            setDeudas={setDeudas}
            loadDeudas={loadDeudas}
            servicios={servicios}
            loadServicios={loadServicios}
            registrarLog={registrarLog}
            cajeraMode={true}
          />
        ) : (
          <>
            {/* Cabecera / Banner Bienvenido */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center justify-between border border-gray-100">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Bienvenido(a), <span className="text-green-700">{sesionCajera.nombre}</span>
                </h1>
                <p className="text-sm text-gray-500">Caja #{sesionCajera.cajaNumero} · Turno {sesionCajera.turno} — Municipio Andrés Bello</p>
              </div>
              <div className="text-sm font-semibold border border-yellow-200 bg-yellow-50 text-yellow-800 px-4 py-2 rounded-full">
                Turno: Activo
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">Resumen de Caja</h2>
            <p className="text-sm text-gray-500 mb-6">Métricas individuales y listado histórico de operaciones del turno</p>

            {/* Tarjetas de Métricas Personales */}
            <section className="grid gap-4 grid-cols-1 md:grid-cols-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-5 relative border border-green-100 bg-green-50/20">
                <div className="text-sm text-gray-500">Total Recaudado</div>
                <div className="text-2xl font-bold text-green-800 mt-2">Bs. {resumenCaja.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Equivalente: $ {(resumenCaja.total / tasaBcv).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 relative border border-gray-100">
                <div className="text-sm text-gray-500">Efectivo (Caja)</div>
                <div className="text-2xl font-bold text-gray-800 mt-2">Bs. {resumenCaja.efectivo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-green-600 mt-1 font-medium">Fondo Sencillo: Bs. {fondoCaja?.toFixed(2) || '0.00'}</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 relative border border-gray-100">
                <div className="text-sm text-gray-500">Punto / Transf. / PM</div>
                <div className="text-2xl font-bold text-gray-800 mt-2">Bs. {(resumenCaja.transferencia + resumenCaja.pagoMovil).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-400 mt-1">Pagos electrónicos</div>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-5 relative border border-gray-100 flex flex-col justify-center items-center text-center">
                <div className="text-3xl font-bold text-gray-800">{activeOperations.length}</div>
                <div className="text-sm text-gray-500">Recibos Procesados</div>
                <button onClick={() => setIsCierreModalOpen(true)} className="mt-3 w-full bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-bold py-2 rounded-lg cursor-pointer border-0 shadow-sm transition">
                  Corte de Caja (Z)
                </button>
              </div>
            </section>

            {/* Tabla de Operaciones del Turno (Inmutable - Excluye Edición/Anulación) */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800 text-lg">Operaciones del Turno</h3>
                  <p className="text-sm text-gray-500">Historial del día de recibos emitidos en esta taquilla de cobro</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                  {operationsToday.length} recibos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                  <thead>
                    <tr className="text-sm text-gray-500 border-b bg-gray-50 uppercase tracking-wider text-xs">
                      <th className="px-6 py-4 font-semibold">N° Recibo</th>
                      <th className="px-6 py-4 font-semibold">Cédula Contribuyente</th>
                      <th className="px-6 py-4 font-semibold">Tipo de Servicio</th>
                      <th className="px-6 py-4 font-semibold text-right">Monto Cobrado (Bs.)</th>
                      <th className="px-6 py-4 font-semibold">Hora de Transacción</th>
                      <th className="px-6 py-4 font-semibold text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {operationsToday.length > 0 ? (
                      operationsToday.map((op) => (
                        <tr key={op.recibo} className="hover:bg-green-50/10 transition">
                          <td className="px-6 py-4 font-semibold text-gray-800">{op.recibo}</td>
                          <td className="px-6 py-4 text-gray-700 font-medium">{op.ci}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                              {op.servicio}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">Bs. {op.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-gray-500">{op.fecha.split(' ')[1] || 'Hoy'}</td>
                          <td className="px-6 py-4 text-center">
                            {op.estado === 'Anulado' ? (
                              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">Anulado</span>
                            ) : (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handlePrintReceipt(op.recibo)}
                                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition border-0 cursor-pointer"
                                  title="Imprimir Recibo"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleAnularRecibo(op)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition border-0 cursor-pointer"
                                  title="Solicitar Anulación"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <CheckCircle className="w-8 h-8 text-gray-300" />
                            <span className="font-medium text-sm">Sin cobros registrados hoy en esta caja</span>
                            <span className="text-xs text-gray-400">Diríjase a la sección "Procesar Cobros" para comenzar a recibir pagos.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* MODAL DE FONDO DE SENCILLO */}
      {fondoCaja === null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Apertura de Caja</h3>
            <p className="text-sm text-gray-500 mb-5">Ingrese el monto de dinero "sencillo" en efectivo con el que está abriendo su turno.</p>
            <form onSubmit={handleEstablecerFondo}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto en Bolívares (Bs.)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={fondoInput}
                  onChange={(e) => setFondoInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-600 outline-none text-lg"
                  placeholder="Ej: 500.00"
                />
              </div>
              <button type="submit" className="w-full bg-green-800 text-white font-bold py-3 rounded-xl hover:bg-green-900 transition border-0 cursor-pointer shadow-sm">
                Establecer y Abrir Turno
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CIERRE DE CAJA */}
      {isCierreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4 border-b pb-3">Corte de Caja (Reporte Z)</h3>
            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <div className="flex justify-between"><span>Efectivo cobrado:</span> <strong>Bs. {resumenCaja.efectivo.toFixed(2)}</strong></div>
              <div className="flex justify-between"><span>Fondo Sencillo inicial:</span> <strong>Bs. {fondoCaja?.toFixed(2) || '0.00'}</strong></div>
              <div className="flex justify-between pt-2 border-t text-gray-900 font-semibold"><span>Efectivo esperado en gaveta:</span> <span>Bs. {(resumenCaja.efectivo + (fondoCaja || 0)).toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500 mt-4"><span>Punto / Transferencia / PM:</span> <span>Bs. {(resumenCaja.transferencia + resumenCaja.pagoMovil).toFixed(2)}</span></div>
              <div className="flex justify-between text-lg text-green-800 font-bold mt-4 pt-4 border-t"><span>Total Recaudado en Turno:</span> <span>Bs. {resumenCaja.total.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsCierreModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold border-0 cursor-pointer hover:bg-gray-200 transition">Cancelar</button>
              <button onClick={handleCerrarCaja} className="flex-1 px-4 py-2 bg-yellow-400 text-yellow-900 rounded-xl font-bold border-0 cursor-pointer hover:bg-yellow-500 shadow-sm transition">Confirmar Cierre</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

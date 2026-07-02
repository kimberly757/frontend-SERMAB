import { useEffect, useMemo, useState } from 'react'
import { servicioService } from '../services/servicioService'
import {
  Search,
  CheckCircle,
  ShieldCheck,
  ArrowRightLeft,
  Smartphone,
  CreditCard,
  Printer,
  X,
  AlertCircle,
  TrendingUp,
  FileText
} from 'lucide-react'

export default function Caja({
  contribuyentes = [],
  deudas = [],
  loadDeudas = () => {},
  loadOperaciones = () => {},
  userData = {},
  registrarLog = () => {},
  tasaBcv = 36.45,
  onLogout = () => {}
}) {
  const [searchValue, setSearchValue] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  const [contribuyenteActivo, setContribuyenteActivo] = useState(null)

  // Cargar deudas pendientes del contribuyente activo
  const userDeudas = useMemo(() => {
    if (!contribuyenteActivo) return []
    const cleanDocActive = String(contribuyenteActivo.documento).replace(/[^0-9]/g, '')
    return deudas.filter(d => {
      const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
      return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
    })
  }, [contribuyenteActivo, deudas])

  const [selectedServices, setSelectedServices] = useState([])

  const [paymentMethod, setPaymentMethod] = useState('1') // ID 1 = Efectivo
  const [reference, setReference] = useState('')
  const [bank, setBank] = useState('')

  const [bancosList, setBancosList] = useState([])
  const [metodosList, setMetodosList] = useState([])

  // Configuración para modal flotante de alertas y confirmaciones
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null
  });

  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
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

  useEffect(() => {
    const loadCajaData = async () => {
      try {
        const [bancosData, metodosData] = await Promise.all([
          servicioService.getBancos(),
          servicioService.getMetodosPago()
        ]);
        setBancosList(bancosData.sort((a, b) => a.bancos_nm.localeCompare(b.bancos_nm)));
        setMetodosList(metodosData);
      } catch (err) {
        console.error('Error al cargar datos de Caja:', err);
      }
    };
    loadCajaData();
  }, []);

  // Historial de pagos procesados en la sesión activa del cajero
  const [sessionPayments, setSessionPayments] = useState([])
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false)
  const [abonos, setAbonos] = useState({})

  const totalAmount = useMemo(() => {
    return selectedServices.reduce((sum, id) => sum + (abonos[id] || 0), 0)
  }, [selectedServices, abonos])

  const handleToggleService = (id, monto) => {
    setSelectedServices((current) => {
      if (current.includes(id)) {
        setAbonos(prev => {
          const newAb = {...prev}
          delete newAb[id]
          return newAb
        })
        return current.filter((serviceId) => serviceId !== id)
      } else {
        setAbonos(prev => ({...prev, [id]: monto}))
        return [...current, id]
      }
    })
  }

  const handleAbonoChange = (id, value, maxMonto) => {
    let val = parseFloat(value);
    if (isNaN(val) || val < 0) val = 0;
    if (val > maxMonto) val = maxMonto;
    setAbonos(prev => ({...prev, [id]: val}));
  }

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    setErrorMsg('')
    
    if (!searchValue.trim()) {
      setErrorMsg('Ingrese una cédula o RIF para buscar')
      return
    }

    const cleanSearch = searchValue.replace(/[^0-9a-zA-Z]/g, '').toLowerCase()
    
    const found = contribuyentes.find(c => {
      const cleanDoc = String(c.documento).replace(/[^0-9a-zA-Z]/g, '').toLowerCase()
      const cleanFull = (c.tipo + c.documento).replace(/[^0-9a-zA-Z]/g, '').toLowerCase()
      return cleanDoc === cleanSearch || cleanFull === cleanSearch
    })

    if (found) {
      setContribuyenteActivo(found)
      
      let activeDeudas = deudas;
      if (typeof loadDeudas === 'function') {
        activeDeudas = await loadDeudas(found.id);
      }

      // Seleccionar automáticamente todas sus deudas
      const cleanDocActive = String(found.documento).replace(/[^0-9]/g, '')
      const pending = activeDeudas.filter(d => {
        const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
        return (d.estado === 'Pendiente' || d.estado === 'Abonado') && cleanDebtCi === cleanDocActive
      })
      
      const initialAbonos = {};
      pending.forEach(d => { initialAbonos[d.id] = (d.monto - (d.abono_mt || 0)) });
      setAbonos(initialAbonos);
      setSelectedServices(pending.map(d => d.id))
      setErrorMsg('')
      registrarLog('Caja', `Buscó contribuyente: ${found.tipo}-${found.documento} (${found.nombre})`)
    } else {
      setContribuyenteActivo(null)
      setSelectedServices([])
      setErrorMsg('Contribuyente no encontrado en el registro')
      registrarLog('Caja', `Intento fallido de buscar contribuyente: ${searchValue}`)
    }
  }

  const handleCancel = () => {
    if (contribuyenteActivo) {
      registrarLog('Caja', `Canceló operación activa para contribuyente: ${contribuyenteActivo.tipo}-${contribuyenteActivo.documento}`)
    }
    setSearchValue('')
    setErrorMsg('')
    setSelectedServices([])
    setReference('')
    setBank('')
    setContribuyenteActivo(null)
  }

  const handleProcessPayment = async () => {
    if (!contribuyenteActivo) {
      showAlert('Atención', 'Debe buscar y seleccionar un contribuyente antes de cobrar.', 'error')
      return
    }

    if (selectedServices.length === 0) {
      showAlert('Atención', 'Debe seleccionar al menos una deuda o servicio para pagar.', 'error')
      return
    }

    // Check if reference is provided when method is not cash
    const methodObj = metodosList.find(m => String(m.metodo_id) === String(paymentMethod));
    const isEfectivo = methodObj ? methodObj.metodo_nm.toLowerCase().includes('efectivo') : false;
    
    if (!isEfectivo && !reference.trim()) {
      showAlert('Atención', 'Debe ingresar el número de referencia del pago.', 'error')
      return
    }
    if (!isEfectivo && ['4', '5'].includes(String(paymentMethod)) && !bank) {
      showAlert('Atención', 'Debe seleccionar el banco destinatario.', 'error')
      return
    }

    const today = new Date()
    const debtsToPay = userDeudas.filter(d => selectedServices.includes(d.id))
    
    // Receipt serial
    const serial = String(Date.now()).slice(-4)
    const receiptNum = `R-${today.getFullYear()}-${serial}`

    const payload = {
      contri_id: contribuyenteActivo.id,
      usuari_id: userData.id || 3,
      metodo_id: parseInt(paymentMethod),
      bancos_id: !isEfectivo && ['4', '5'].includes(String(paymentMethod)) && bank ? parseInt(bank) : null,
      cobros_mt: totalAmount * (tasaBcv || 1),
      cobros_rb: receiptNum,
      cobros_rf: isEfectivo ? null : reference.trim() || null,
      cobros_es: 'Procesado',
      tasa_bcv_aplicada: tasaBcv || 1,
      detalles: debtsToPay.map(d => ({
        deudas_id: d.id,
        detall_mt: (abonos[d.id] || d.monto) * (tasaBcv || 1)
      }))
    };

    try {
      await servicioService.createCobro(payload);

      // Add to session payments for the daily Z closure
      const processedPayment = {
        monto: totalAmount * (tasaBcv || 1),
        metodo: methodObj ? methodObj.metodo_nm : 'Otro',
        contribuyente: `${contribuyenteActivo.tipo}-${contribuyenteActivo.documento}`,
        servicios: debtsToPay.map(d => d.servicio).join(', ')
      };
      setSessionPayments(prev => [...prev, processedPayment]);

      // Dynamic log registration
      const serviceCounts = debtsToPay.reduce((acc, d) => {
        acc[d.servicio] = (acc[d.servicio] || 0) + 1;
        return acc;
      }, {});
      const serviceNames = Object.entries(serviceCounts)
        .map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
        .join(', ');
      
      registrarLog('Caja', `Cobró Bs. ${(totalAmount * (tasaBcv || 1)).toFixed(2)} por: ${serviceNames} a contribuyente ${contribuyenteActivo.tipo}-${contribuyenteActivo.documento} (${methodObj ? methodObj.metodo_nm : 'OTRO'})`);

      showAlert('Éxito', `¡Cobro procesado con éxito!\nSe registró el recibo de pago ${receiptNum}.`, 'success')

      // Reload lists from backend
      if (typeof loadDeudas === 'function') await loadDeudas();
      if (typeof loadOperaciones === 'function') await loadOperaciones();

      // Clear fields
      setSelectedServices([])
      setReference('')
      setBank('')
      setSearchValue('')
      setContribuyenteActivo(null)
    } catch (err) {
      console.error('Error al procesar cobro:', err);
      showAlert('Error', 'Hubo un error al guardar el cobro en el sistema: ' + (err.response?.data?.error || err.message), 'error')
    }
  }

  // Cálculos para el Arqueo de Caja (Se obtiene desde Backend)

  const handleConfirmCierre = async () => {
    try {
      const cierreDB = await servicioService.getCierreDiario();
      
      registrarLog('Caja', `Realizó Arqueo y Cierre de Caja. Monto total recaudado en el turno: Bs. ${cierreDB.total.toFixed(2)}. Turno cerrado.`)
      setIsCierreModalOpen(false)
      showAlert(
        'Cierre de Caja Exitoso',
        `Arqueo diario finalizado.\nTotal Recaudado: Bs. ${cierreDB.total.toFixed(2)}\n\nEl turno se cerrará y saldrá del sistema.`,
        'success',
        onLogout
      )
    } catch (err) {
      console.error(err);
      showAlert('Error', 'No se pudo obtener el arqueo de caja desde el servidor.', 'error');
    }
  }

  const getIconForMethod = (name) => {
    const n = name.toLowerCase();
    if (n.includes('efectivo')) return CreditCard;
    if (n.includes('punto')) return CreditCard;
    if (n.includes('transferencia')) return ArrowRightLeft;
    if (n.includes('móvil') || n.includes('movil')) return Smartphone;
    return CreditCard;
  };

  const isSolvente = userDeudas.length === 0

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {errorMsg && (
          <div className="mb-4 bg-red-50 text-red-600 rounded-2xl p-4 flex items-center gap-2 border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          {/* Módulo de Búsqueda */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-6 h-6 text-green-700" />
              <h1 className="text-[19px] font-bold text-gray-900">Buscar Contribuyente</h1>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="12345678"
                className="w-full sm:flex-1 rounded-xl border-2 border-green-600 bg-white px-4 py-3.5 text-base text-gray-900 outline-none focus:ring-4 focus:ring-green-500/20 transition-all font-medium"
              />
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#1b5e20] px-6 py-3.5 text-[15px] font-bold text-white shadow-sm transition hover:bg-green-900 cursor-pointer whitespace-nowrap h-full"
              >
                Consultar Deudas
              </button>
            </form>
          </div>

          {/* Información del Contribuyente o Tasa BCV */}
          {contribuyenteActivo ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-gray-500">Datos del contribuyente</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isSolvente ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  {isSolvente ? 'Solvente' : 'No solvente'}
                </span>
              </div>

              <div className="mt-4 space-y-4 text-sm text-gray-600">
                <div>
                  <p className="text-xs uppercase text-gray-400">Nombre / Razón Social</p>
                  <p className="mt-1 text-base font-semibold text-gray-900">
                    {`${contribuyenteActivo.nombre} ${contribuyenteActivo.apellidos || ''}`.trim()}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-400">Documento</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {contribuyenteActivo.tipo}-{contribuyenteActivo.documento}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Teléfono</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">{contribuyenteActivo.telefono || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-t-4 border-t-yellow-400 border-x border-b border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center">
              <p className="text-[15px] font-medium text-gray-500 mb-3">Tasa Oficial BCV (Hoy)</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-5xl font-extrabold text-[#1b5e20]">{tasaBcv.toFixed(2)}</span>
                <span className="text-xl font-semibold text-gray-400">Bs/$</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Tabla de Deudas & Resumen (Stacked a todo ancho) ── */}
        <div className="mt-6 space-y-6">
          {/* Tabla de Deudas */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex flex-col gap-1 border-b border-gray-100 p-5 bg-white">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-[#1b5e20]" />
                <h2 className="text-xl font-bold text-gray-900">Seleccione los servicios a pagar</h2>
              </div>
              <p className="text-sm text-gray-500">El contribuyente puede elegir pagar deudas específicas.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                  <tr>
                    <th scope="col" className="px-6 py-4 w-16 text-center font-bold">Pagar</th>
                    <th scope="col" className="px-6 py-4 font-bold">Servicio</th>
                    <th scope="col" className="px-6 py-4 font-bold">Detalle / Propiedad</th>
                    <th scope="col" className="px-6 py-4 font-bold">Periodo</th>
                    <th scope="col" className="px-6 py-4 font-bold text-right">Monto ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {userDeudas.length > 0 ? (
                    userDeudas.map((service) => {
                      const isSelected = selectedServices.includes(service.id)
                      const montoDolares = service.monto
                      const montoBs = service.monto * (tasaBcv || 1)
                      
                      return (
                        <tr key={service.id} className={`transition cursor-pointer ${isSelected ? 'bg-green-50/40' : 'hover:bg-gray-50/40'}`} onClick={() => handleToggleService(service.id, (service.monto - (service.abono_mt || 0)))}>
                          <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleService(service.id, (service.monto - (service.abono_mt || 0)))}
                              className="w-[18px] h-[18px] rounded border-gray-300 text-[#1b5e20] focus:ring-[#1b5e20] cursor-pointer accent-[#1b5e20]"
                            />
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-gray-900">{service.servicio}</div>
                          </td>
                          <td className="px-6 py-5 text-gray-500">
                            {service.inmueble_direccion || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-5">
                            <span className="inline-flex items-center rounded-md bg-gray-200/80 px-2.5 py-1 text-xs font-medium text-gray-700">
                              {service.periodo}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {isSelected ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center justify-end gap-1 w-full">
                                  <span className="font-bold text-gray-900">$</span>
                                  <input 
                                    type="number" 
                                    step="0.01"
                                    value={abonos[service.id] !== undefined ? abonos[service.id] : ''}
                                    onChange={(e) => handleAbonoChange(service.id, e.target.value, (service.monto - (service.abono_mt || 0)))}
                                    className="w-24 text-right border-b-2 border-green-500 bg-transparent px-1 py-0.5 text-sm font-bold focus:outline-none focus:bg-white"
                                  />
                                </div>
                                <span className="text-xs text-gray-500 font-normal">Bs. {((abonos[service.id] || 0) * (tasaBcv || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-bold text-gray-900">${(service.monto - (service.abono_mt || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-xs text-gray-500 font-normal">Bs. {((service.monto - (service.abono_mt || 0)) * (tasaBcv || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                        {contribuyenteActivo ? 'Sin deudas o servicios pendientes de cobro.' : 'Realice una búsqueda para cargar el estado de cuenta.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Resumen de Facturación */}
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-[#1b5e20] px-6 py-4 flex items-center gap-2">
              <span className="text-yellow-400 text-xl">🧮</span>
              <h2 className="text-white font-bold text-lg">Resumen de Facturación</h2>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <p className="text-[15px] font-semibold text-gray-500 mb-2">Total a Pagar (Según selección)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold text-gray-900" translate="no">
                  {(totalAmount * (tasaBcv || 1)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-2xl font-bold text-gray-500">Bs.</span>
              </div>
              
              {tasaBcv > 0 && totalAmount > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 font-medium bg-gray-50 border border-gray-200 px-4 py-2 rounded-full inline-flex items-center gap-2">
                    Equivalente en Divisas: <span className="font-bold text-gray-800">${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ── Procesamiento de Pago ── */}
        <section className="mt-6 rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-lg font-semibold text-gray-900">Procesamiento de Pago</p>
            <p className="mt-2 text-sm text-gray-500">Seleccione el método y registre los datos del pago.</p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-5">
            {metodosList.map((method) => {
              const Icon = getIconForMethod(method.metodo_nm)
              const active = String(paymentMethod) === String(method.metodo_id)
              return (
                <button
                  key={method.metodo_id}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(String(method.metodo_id));
                    setReference('');
                    setBank('');
                  }}
                  className={`flex flex-col items-center justify-center gap-3 rounded-3xl border px-2 py-5 text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'border-green-800 bg-green-100 text-green-900 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-green-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-center">{method.metodo_nm}</span>
                </button>
              )
            })}
          </div>

          {!['1', '2'].includes(String(paymentMethod)) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-left">
                <span className="text-sm font-medium text-gray-700 font-semibold">N° de Referencia *</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Ej: 00123456789"
                  className="mt-3 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-green-800"
                />
              </label>
              
              {['4', '5'].includes(String(paymentMethod)) ? (
                <label className="block text-left">
                  <span className="text-sm font-medium text-gray-700 font-semibold">Banco Destinatario *</span>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="mt-3 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-green-800 cursor-pointer text-sm"
                  >
                    <option value="">Seleccione el banco...</option>
                    {bancosList.map(b => (
                      <option key={b.bancos_id} value={b.bancos_id}>
                        {b.bancos_nm}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div />
              )}
            </div>
          )}

          <div className="mt-5 rounded-3xl bg-gray-50 px-4 py-4 text-sm text-gray-600">
            Verifique que el monto recibido coincida con el total a pagar antes de procesar el cobro.
          </div>
        </section>

        {/* ── Acciones de Operación ── */}
        <div className="mt-6 flex flex-col gap-4 rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 cursor-pointer"
            >
              <X className="h-4 w-4" /> Cancelar Operación
            </button>

            {sessionPayments.length > 0 && (
              <button
                type="button"
                onClick={() => setIsCierreModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-3xl border border-yellow-300 bg-yellow-50 px-5 py-3 text-sm font-semibold text-yellow-800 transition hover:bg-yellow-100 cursor-pointer"
              >
                <FileText className="h-4 w-4" /> Arqueo y Cierre ({sessionPayments.length})
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm text-gray-500 sm:items-end">
            <span className="inline-flex items-center gap-2 text-gray-600">
              <ShieldCheck className="h-4 w-4 text-green-700" /> Operación segura · Caja #03 · {userData.nombre || 'Cajero activo'}
            </span>
            <button
              type="button"
              onClick={handleProcessPayment}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-green-800 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Procesar Cobro e Imprimir Soporte
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE ARQUEO Y CIERRE DE CAJA */}
      {isCierreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-[28px] border border-gray-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-2 text-green-800">
                <FileText className="w-6 h-6" />
                <h3 className="text-xl font-bold">Arqueo y Cierre de Caja</h3>
              </div>
              <button
                onClick={() => setIsCierreModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-sm">
                <p className="text-gray-500">Cajero activo: <strong className="text-gray-800">{userData.nombre || 'Ana Rodríguez'}</strong></p>
                <p className="text-gray-500 mt-1">Sesión iniciada: <strong className="text-gray-800">{userData.loginTime || '08:32'}</strong></p>
                <p className="text-gray-500 mt-1">Transacciones procesadas: <strong className="text-green-800">{totalCierre.cant} cobros</strong></p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Resumen de ingresos por método</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard className="w-4 h-4 text-green-700" /> Efectivo
                    </span>
                    <strong className="text-gray-800">Bs. {totalCierre.efectivo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <Smartphone className="w-4 h-4 text-green-700" /> Pago Móvil
                    </span>
                    <strong className="text-gray-800">Bs. {totalCierre.pagoMovil.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <ArrowRightLeft className="w-4 h-4 text-green-700" /> Transferencia Bancaria
                    </span>
                    <strong className="text-gray-800">Bs. {totalCierre.transferencia.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50/60 rounded-xl mt-4">
                    <span className="text-sm font-bold text-green-900 uppercase">Total Recaudado</span>
                    <strong className="text-lg font-bold text-green-800">Bs. {totalCierre.total.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-xl p-3 text-xs leading-relaxed">
                Al confirmar el cierre, los ingresos se guardarán formalmente en la bitácora de auditoría y se cerrará su sesión de caja de forma segura.
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 p-5 bg-gray-50">
              <button
                type="button"
                onClick={() => setIsCierreModalOpen(false)}
                className="px-4 py-2 border rounded-xl text-sm font-semibold bg-white text-gray-700 cursor-pointer"
              >
                Seguir Facturando
              </button>
              <button
                type="button"
                onClick={handleConfirmCierre}
                className="px-5 py-2.5 rounded-xl bg-green-800 hover:bg-green-900 text-white text-sm font-semibold cursor-pointer border-0 shadow-sm"
              >
                Confirmar y Cerrar Turno
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Alert/Confirm Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform animate-scale-up">
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
              <p className="text-sm text-center text-gray-600 mb-6 leading-relaxed whitespace-pre-line">{modalConfig.message}</p>

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
                    onClick={() => {
                      setModalConfig(prev => ({ ...prev, isOpen: false }));
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                    }}
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
    </div>
  )
}

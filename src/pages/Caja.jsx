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

  const [paymentMethod, setPaymentMethod] = useState('4') // ID 4 = Transferencia Bancaria
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

  const totalAmount = useMemo(() => {
    return userDeudas
      .filter((service) => selectedServices.includes(service.id))
      .reduce((sum, service) => sum + service.monto, 0)
  }, [selectedServices, userDeudas])

  const handleToggleService = (id) => {
    setSelectedServices((current) =>
      current.includes(id) ? current.filter((serviceId) => serviceId !== id) : [...current, id]
    )
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
        return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
      })
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
      usuari_id: userData.id || 3, // María López is 3
      metodo_id: parseInt(paymentMethod),
      bancos_id: !isEfectivo && ['4', '5'].includes(String(paymentMethod)) && bank ? parseInt(bank) : null,
      cobros_mt: totalAmount,
      cobros_rb: receiptNum,
      cobros_es: 'Procesado',
      detalles: debtsToPay.map(d => ({
        deudas_id: d.id,
        detall_mt: d.monto
      }))
    };

    try {
      await servicioService.createCobro(payload);

      // Add to session payments for the daily Z closure
      const processedPayment = {
        monto: totalAmount,
        metodo: methodObj ? methodObj.metodo_nm : 'Otro',
        contribuyente: `${contribuyenteActivo.tipo}-${contribuyenteActivo.documento}`,
        servicios: debtsToPay.map(d => d.servicio).join(', ')
      };
      setSessionPayments(prev => [...prev, processedPayment]);

      // Dynamic log registration
      const serviceNames = debtsToPay.map(d => d.servicio).join(', ');
      registrarLog('Caja', `Cobró Bs. ${totalAmount.toFixed(2)} por: ${serviceNames} a contribuyente ${contribuyenteActivo.tipo}-${contribuyenteActivo.documento} (${methodObj ? methodObj.metodo_nm : 'OTRO'})`);

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

  // Cálculos para el Arqueo de Caja
  const totalCierre = useMemo(() => {
    const total = sessionPayments.reduce((sum, p) => sum + p.monto, 0)
    const efectivo = sessionPayments.filter(p => p.metodo.toLowerCase().includes('efectivo')).reduce((sum, p) => sum + p.monto, 0)
    const transferencia = sessionPayments.filter(p => p.metodo.toLowerCase().includes('transferencia')).reduce((sum, p) => sum + p.monto, 0)
    const pagoMovil = sessionPayments.filter(p => p.metodo.toLowerCase().includes('pago')).reduce((sum, p) => sum + p.monto, 0)
    
    return { total, efectivo, transferencia, pagoMovil, cant: sessionPayments.length }
  }, [sessionPayments])

  const handleConfirmCierre = () => {
    registrarLog('Caja', `Realizó Arqueo y Cierre de Caja. Monto total recaudado en el turno: Bs. ${totalCierre.total.toFixed(2)}. Turno cerrado.`)
    setIsCierreModalOpen(false)
    showAlert(
      'Cierre de Caja Exitoso',
      `Arqueo diario finalizado.\nTotal Recaudado: Bs. ${totalCierre.total.toFixed(2)}\n\nEl turno se cerrará y saldrá del sistema.`,
      'success',
      onLogout
    )
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
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Módulo de Caja</h1>
                <p className="mt-2 text-sm text-gray-500">Busca al contribuyente por cédula o RIF antes de procesar el cobro.</p>
              </div>
            </div>

            <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-3xl border border-gray-200 bg-gray-50 px-4 py-4 shadow-inner">
                <label className="block text-sm font-medium text-gray-600">Cédula / RIF del Contribuyente</label>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Ej: V-15.482.901 o J-12.345.678"
                    className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-2xl bg-green-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 cursor-pointer"
                  >
                    <Search className="mr-2 h-4 w-4" /> Buscar
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Información del Contribuyente */}
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            {contribuyenteActivo ? (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.16em] text-gray-500">Datos del contribuyente</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isSolvente ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {isSolvente ? 'Solvente' : 'No solvente'}
                  </span>
                </div>

                <div className="mt-6 space-y-4 text-sm text-gray-600">
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
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <AlertCircle className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-gray-500 font-medium">Ningún contribuyente activo</p>
                <p className="text-xs text-gray-400 mt-1">Busque una cédula o RIF para ver sus datos</p>
              </div>
            )}
          </div>
        </div>

        {/* Estado de Cuenta / Tabla de Deudas */}
        <section className="mt-6 rounded-[28px] border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">Estado de Cuenta</p>
              <p className="mt-2 text-sm text-gray-500">Seleccione los servicios a cancelar en esta operación.</p>
            </div>
            <p className="text-sm font-medium text-gray-500"><span translate="no">{userDeudas.length}</span> servicios pendientes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">Servicio</th>
                  <th scope="col" className="px-6 py-4 font-medium">Periodo</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">Monto (Bs.)</th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {userDeudas.length > 0 ? (
                  userDeudas.map((service) => {
                    const isSelected = selectedServices.includes(service.id)
                    return (
                      <tr key={service.id} className={isSelected ? 'bg-green-50/40' : ''}>
                        <td className="px-6 py-5 font-medium text-gray-800">{service.servicio}</td>
                        <td className="px-6 py-5 text-gray-500">{service.periodo}</td>
                        <td className="px-6 py-5 text-right font-semibold text-gray-900" translate="no">
                          {service.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleService(service.id)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 transition hover:border-green-700 bg-white cursor-pointer"
                            aria-label={`Seleccionar ${service.servicio}`}
                          >
                            {isSelected ? <CheckCircle className="h-5 w-5 text-green-700" /> : <span className="h-3.5 w-3.5 rounded-full border border-gray-300 bg-white" />}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400">
                      {contribuyenteActivo ? 'Sin deudas o servicios pendientes de cobro' : 'Realice una búsqueda para cargar el estado de cuenta'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-gray-200 bg-green-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <ShieldCheck className="h-5 w-5 text-green-800" />
              <span>Resumen de la operación</span>
            </div>
            <div className="rounded-3xl bg-white px-6 py-5 text-right shadow-sm flex flex-col items-end justify-center">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Total a pagar</p>
              <p className="mt-1 text-3xl font-semibold text-green-800" translate="no">
                Bs. {totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {tasaBcv > 0 && totalAmount > 0 && (
                <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
                  Equivalente: <span translate="no">$ {(totalAmount / tasaBcv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span> · Tasa: <span translate="no">{tasaBcv.toFixed(2)} Bs</span>
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Procesamiento de Pago */}
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

        {/* Acciones de Operación */}
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

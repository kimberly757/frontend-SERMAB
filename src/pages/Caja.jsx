import { useMemo, useState } from 'react'
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
  setDeudas = () => {},
  setOperaciones = () => {},
  userData = {},
  registrarLog = () => {},
  tasaBcv = 36.45,
  onLogout = () => {}
}) {
  const [searchValue, setSearchValue] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  
  // Buscar a Juan Pérez (V-15.482.901) como contribuyente activo inicial
  const [contribuyenteActivo, setContribuyenteActivo] = useState(() => {
    return contribuyentes.find(c => String(c.documento).includes('15.482.901')) || contribuyentes[0] || null
  })

  // Cargar deudas pendientes del contribuyente activo
  const userDeudas = useMemo(() => {
    if (!contribuyenteActivo) return []
    const cleanDocActive = String(contribuyenteActivo.documento).replace(/[^0-9]/g, '')
    return deudas.filter(d => {
      const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
      return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
    })
  }, [contribuyenteActivo, deudas])

  // Inicializar deudas seleccionadas con las primeras disponibles para la demo
  const [selectedServices, setSelectedServices] = useState(() => {
    if (contribuyenteActivo) {
      const cleanDocActive = String(contribuyenteActivo.documento).replace(/[^0-9]/g, '')
      const initialPending = deudas.filter(d => {
        const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
        return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
      })
      return initialPending.slice(0, 2).map(d => d.id)
    }
    return []
  })

  const [paymentMethod, setPaymentMethod] = useState('transferencia')
  const [reference, setReference] = useState('00123456789')
  const [bank, setBank] = useState('Banco de Venezuela')

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

  const handleSearch = (e) => {
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
      // Seleccionar automáticamente todas sus deudas
      const pending = deudas.filter(d => {
        const cleanDebtCi = String(d.ci).replace(/[^0-9]/g, '')
        const cleanDocActive = String(found.documento).replace(/[^0-9]/g, '')
        return d.estado === 'Pendiente' && cleanDebtCi === cleanDocActive
      })
      setSelectedServices(pending.map(d => d.id))
      setErrorMsg('')
      registrarLog('Caja', `Buscó contribuyente: ${found.tipo}-${found.documento} (${found.nombre})`)
    } else {
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

  const handleProcessPayment = () => {
    if (!contribuyenteActivo) {
      alert('Debe buscar y seleccionar un contribuyente antes de cobrar.')
      return
    }

    if (selectedServices.length === 0) {
      alert('Debe seleccionar al menos una deuda o servicio para pagar.')
      return
    }

    const today = new Date()
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`
    
    // Filtrar las deudas que se están pagando
    const debtsToPay = userDeudas.filter(d => selectedServices.includes(d.id))

    // Crear un recibo por cada deuda pagada para la bitácora e informes
    const newReceipts = debtsToPay.map((debt, index) => {
      const serial = String(Date.now() + index).slice(-4)
      return {
        recibo: `R-${today.getFullYear()}-${serial}`,
        fecha: formattedDate,
        nombre: `${contribuyenteActivo.nombre} ${contribuyenteActivo.apellidos || ''}`.trim(),
        ci: `${contribuyenteActivo.tipo}-${contribuyenteActivo.documento}`,
        servicio: debt.servicio,
        monto: debt.monto,
        cajero: userData.nombre || 'Ana Rodríguez'
      }
    })

    // Actualizar deudas a estado "Pagado"
    setDeudas(prev =>
      prev.map(d => selectedServices.includes(d.id) ? { ...d, estado: 'Pagado' } : d)
    )

    // Agregar transacciones al registro
    setOperaciones(prev => [...newReceipts, ...prev])

    // Agregar a los pagos de la sesión para el arqueo de caja
    const processedPayment = {
      monto: totalAmount,
      metodo: paymentMethod,
      contribuyente: `${contribuyenteActivo.tipo}-${contribuyenteActivo.documento}`,
      servicios: debtsToPay.map(d => d.servicio).join(', ')
    }
    setSessionPayments(prev => [...prev, processedPayment])

    // Registrar log dinámico
    const serviceNames = debtsToPay.map(d => d.servicio).join(', ')
    registrarLog('Caja', `Cobró Bs. ${totalAmount.toFixed(2)} por: ${serviceNames} a contribuyente ${contribuyenteActivo.tipo}-${contribuyenteActivo.documento} (${paymentMethod.toUpperCase()})`)

    alert(`¡Cobro procesado con éxito!\nSe generaron ${newReceipts.length} recibos de pago.`)

    // Limpiar campos
    setSelectedServices([])
    setReference('')
    setBank('')
    setSearchValue('')
  }

  // Cálculos para el Arqueo de Caja
  const totalCierre = useMemo(() => {
    const total = sessionPayments.reduce((sum, p) => sum + p.monto, 0)
    const efectivo = sessionPayments.filter(p => p.metodo === 'efectivo').reduce((sum, p) => sum + p.monto, 0)
    const transferencia = sessionPayments.filter(p => p.metodo === 'transferencia').reduce((sum, p) => sum + p.monto, 0)
    const pagoMovil = sessionPayments.filter(p => p.metodo === 'pago-movil').reduce((sum, p) => sum + p.monto, 0)
    
    return { total, efectivo, transferencia, pagoMovil, cant: sessionPayments.length }
  }, [sessionPayments])

  const handleConfirmCierre = () => {
    registrarLog('Caja', `Realizó Arqueo y Cierre de Caja. Monto total recaudado en el turno: Bs. ${totalCierre.total.toFixed(2)}. Turno cerrado.`)
    alert(`Arqueo diario finalizado.\nTotal Recaudado: Bs. ${totalCierre.total.toFixed(2)}\n\nEl turno se cerrará y saldrá del sistema.`)
    setIsCierreModalOpen(false)
    onLogout()
  }

  const methodOptions = [
    { id: 'efectivo', label: 'Efectivo', icon: CreditCard },
    { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
    { id: 'pago-movil', label: 'Pago Móvil', icon: Smartphone },
  ]

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
            <p className="text-sm font-medium text-gray-500">{userDeudas.length} servicios pendientes</p>
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
                        <td className="px-6 py-5 text-right font-semibold text-gray-900">
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
              <p className="mt-1 text-3xl font-semibold text-green-800">
                Bs. {totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {tasaBcv > 0 && totalAmount > 0 && (
                <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">
                  Equivalente: $ {(totalAmount / tasaBcv).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD · Tasa: {tasaBcv.toFixed(2)} Bs
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

          <div className="grid gap-4 sm:grid-cols-3">
            {methodOptions.map((option) => {
              const Icon = option.icon
              const active = paymentMethod === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={`flex flex-col items-center justify-center gap-3 rounded-3xl border px-4 py-5 text-sm font-semibold transition cursor-pointer ${
                    active
                      ? 'border-green-800 bg-green-100 text-green-900 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm text-green-800">
                    <Icon className="h-5 w-5" />
                  </div>
                  {option.label}
                </button>
              )
            })}
          </div>

          {paymentMethod !== 'efectivo' && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">N° de Referencia</span>
                <input
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="Ej: 00123456789"
                  className="mt-3 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-green-800"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Banco</span>
                <input
                  value={bank}
                  onChange={(event) => setBank(event.target.value)}
                  placeholder="Ej: Banco de Venezuela"
                  className="mt-3 w-full rounded-3xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-green-800"
                />
              </label>
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
    </div>
  )
}

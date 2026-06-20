import React, { useState, useMemo } from 'react'
import { Calendar, FileText, DollarSign, CheckCircle, Printer } from 'lucide-react'

export default function Informes({ operaciones = [] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [servicio, setServicio] = useState('Todas')

  const resumen = useMemo(() => {
    const lista = operaciones.filter(op => servicio === 'Todas' ? true : op.servicio === servicio)
    const total = lista.reduce((s, c) => s + c.monto, 0)
    const trans = lista.length
    const servicioMasPagado = lista.reduce((acc, cur) => {
      acc[cur.servicio] = (acc[cur.servicio] || 0) + cur.monto
      return acc
    }, {})
    const top = Object.entries(servicioMasPagado).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { total, trans, top }
  }, [operaciones, servicio])

  const handleExport = () => {
    // Placeholder: en producción se conectaría a backend o se generaría PDF
    alert('Exportar a PDF (simulado)')
  }

  const filtered = useMemo(() => {
    return operaciones.filter(op => servicio === 'Todas' ? true : op.servicio === servicio)
  }, [operaciones, servicio])

  const formatBs = (v) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Zona de Entrada: filtros */}
        <div className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-3"><span className="text-green-700">Informes</span> y Recaudación</h2>
              <p className="text-sm text-gray-500">Genera reportes detallados de recaudación municipal por período y servicio.</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-sm text-gray-600">Versión 1.0.0</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Desde</label>
                <div className="relative">
                  <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full bg-white rounded-md px-3 py-2 border" />
                  <Calendar className="absolute right-3 top-2.5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Hasta</label>
                <div className="relative">
                  <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full bg-white rounded-md px-3 py-2 border" />
                  <Calendar className="absolute right-3 top-2.5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo de Servicio</label>
                <select value={servicio} onChange={(e) => setServicio(e.target.value)} className="w-full bg-white rounded-md px-3 py-2 border">
                  <option>Todas</option>
                  <option>Aseo Urbano</option>
                  <option>Patente de Industria</option>
                  <option>Impuesto Inmueble</option>
                </select>
              </div>

              <div className="flex items-center">
                <button onClick={() => {}} className="ml-auto bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Salida: métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Recaudado</div>
              <div className="text-2xl font-bold text-gray-800">Bs. {formatBs(resumen.total)}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-md">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Transacciones Procesadas</div>
              <div className="text-2xl font-bold text-gray-800">{resumen.trans}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-md">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Servicio más pagado</div>
              <div className="text-2xl font-bold text-gray-800">{resumen.top}</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-md">
              <DollarSign className="w-6 h-6 text-yellow-700" />
            </div>
          </div>
        </div>

        {/* Detalle de Operaciones */}
        <div className="bg-white shadow-sm rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Detalle de Operaciones</h3>
              <p className="text-sm text-gray-500">Listado de transacciones procesadas en el período seleccionado</p>
            </div>

            <div>
              <button onClick={handleExport} className="flex items-center gap-2 bg-white border px-3 py-2 rounded-md hover:bg-gray-50">
                <Printer className="w-4 h-4 text-gray-700" />
                Exportar a PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="py-3 pr-6">N° RECIBO</th>
                  <th className="py-3 pr-6">FECHA</th>
                  <th className="py-3 pr-6">CONTRIBUYENTE</th>
                  <th className="py-3 pr-6">SERVICIO</th>
                  <th className="py-3 pr-6">MONTO (Bs.)</th>
                  <th className="py-3 pr-6">CAJERO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(op => (
                  <tr key={op.recibo} className="border-b last:border-b-0">
                    <td className="py-4 font-medium">{op.recibo}</td>
                    <td className="py-4 text-gray-700">{op.fecha}</td>
                    <td className="py-4">
                      <div className="font-medium">{op.nombre}</div>
                      <div className="text-sm text-gray-500">{op.ci}</div>
                    </td>
                    <td className="py-4">
                      <span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">{op.servicio}</span>
                    </td>
                    <td className="py-4 font-semibold">Bs. {formatBs(op.monto)}</td>
                    <td className="py-4 text-gray-700">{op.cajero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>Mostrando {filtered.length} de {operaciones.length} registros</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 rounded-md border">Anterior</button>
              <button className="px-3 py-1 rounded-md bg-green-700 text-white">1</button>
              <button className="px-3 py-1 rounded-md border">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useMemo } from 'react'
import { Calendar, FileText, DollarSign, CheckCircle, Printer } from 'lucide-react'

export default function Informes({ operaciones = [] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [servicio, setServicio] = useState('Todas')

  const uniqueServices = useMemo(() => {
    const svcs = new Set()
    operaciones.forEach(op => {
      if (op.servicio) {
        op.servicio.split(',').forEach(s => {
          const trimmed = s.trim()
          if (trimmed) svcs.add(trimmed)
        })
      }
    })
    return ['Todas', ...Array.from(svcs)]
  }, [operaciones])

  const filtered = useMemo(() => {
    return operaciones.filter(op => {
      if (servicio !== 'Todas') {
        const matches = op.servicio && op.servicio.toLowerCase().includes(servicio.toLowerCase())
        if (!matches) return false
      }

      const opDate = new Date(op.fechaRaw)
      if (isNaN(opDate.getTime())) return true
      
      if (desde) {
        const fromDate = new Date(desde + 'T00:00:00')
        if (opDate < fromDate) return false
      }
      
      if (hasta) {
        const toDate = new Date(hasta + 'T23:59:59')
        if (opDate > toDate) return false
      }

      return true
    })
  }, [operaciones, servicio, desde, hasta])

  const resumen = useMemo(() => {
    const total = filtered.reduce((s, c) => s + c.monto, 0)
    const trans = filtered.length
    
    const servicioMasPagado = {}
    filtered.forEach(op => {
      if (op.servicio) {
        op.servicio.split(',').forEach(s => {
          const name = s.trim()
          if (name) {
            servicioMasPagado[name] = (servicioMasPagado[name] || 0) + op.monto
          }
        })
      }
    })
    const top = Object.entries(servicioMasPagado).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
    return { total, trans, top }
  }, [filtered])

  const handleExport = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor, permita las ventanas emergentes para exportar el PDF')
      return
    }

    const title = `Reporte de Recaudación - ${new Date().toLocaleDateString('es-VE')}`
    
    const rowsHtml = filtered.map(op => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px 10px; font-weight: 500; font-family: monospace; font-size: 11px;">${op.recibo}</td>
        <td style="padding: 12px 10px; color: #475569;">${op.fecha}</td>
        <td style="padding: 12px 10px;">
          <div style="font-weight: 500; color: #1e293b;">${op.nombre}</div>
          <div style="font-size: 10px; color: #64748b;">${op.ci}</div>
        </td>
        <td style="padding: 12px 10px;">
          <span style="background-color: #f0fdf4; color: #15803d; padding: 4px 8px; border-radius: 9999px; font-size: 10px; font-weight: 500; display: inline-block;">
            ${op.servicio}
          </span>
        </td>
        <td style="padding: 12px 10px; font-weight: 600; text-align: right; color: #0f172a;">Bs. ${formatBs(op.monto)}</td>
        <td style="padding: 12px 10px; color: #475569;">${op.cajero}</td>
      </tr>
    `).join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            color: #1e293b;
            padding: 40px;
            margin: 0;
            background: #fff;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #15803d;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #15803d;
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 5px 0 0 0;
          }
          .meta {
            text-align: right;
            font-size: 11px;
            color: #475569;
            line-height: 1.6;
          }
          .metrics {
            display: grid;
            grid-template-cols: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 35px;
          }
          .metric-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px 20px;
            background: #f8fafc;
          }
          .metric-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            font-weight: 600;
          }
          .metric-val {
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            margin-top: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 40px;
          }
          th {
            background-color: #f8fafc;
            border-bottom: 2px solid #cbd5e1;
            padding: 12px 10px;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.05em;
            text-align: left;
          }
          .footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 50px;
          }
          .signatures {
            display: grid;
            grid-template-cols: repeat(2, 1fr);
            gap: 80px;
            margin-top: 70px;
            margin-bottom: 40px;
            text-align: center;
            font-size: 12px;
          }
          .sig-line {
            border-top: 1px solid #94a3b8;
            padding-top: 10px;
            font-weight: 500;
            color: #334155;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">SISTEMA ALCALDÍA SERMAB</h1>
            <p class="subtitle">Dirección de Hacienda y Recaudación Municipal</p>
          </div>
          <div class="meta">
            <div><strong>Reporte:</strong> Recaudación de Ingresos</div>
            <div><strong>Filtro Fechas:</strong> ${desde ? new Date(desde + 'T00:00:00').toLocaleDateString('es-VE') : 'Inicio'} hasta ${hasta ? new Date(hasta + 'T00:00:00').toLocaleDateString('es-VE') : 'Hoy'}</div>
            <div><strong>Servicio:</strong> ${servicio}</div>
            <div><strong>Generado:</strong> ${new Date().toLocaleString('es-VE')}</div>
          </div>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <div class="metric-label">Total Recaudado</div>
            <div class="metric-val">Bs. ${formatBs(resumen.total)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Transacciones Procesadas</div>
            <div class="metric-val">${resumen.trans}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Servicio Principal</div>
            <div class="metric-val">${resumen.top}</div>
          </div>
        </div>

        <h3 style="font-size: 13px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Detalle de Operaciones</h3>
        <table>
          <thead>
            <tr>
              <th style="padding: 10px;">N° Recibo</th>
              <th style="padding: 10px;">Fecha</th>
              <th style="padding: 10px;">Contribuyente</th>
              <th style="padding: 10px;">Servicio</th>
              <th style="padding: 10px; text-align: right;">Monto (Bs.)</th>
              <th style="padding: 10px;">Cajero</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">No se encontraron operaciones en el período seleccionado.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div style="height: 60px;"></div>
            <div class="sig-line">Firma Cajero Autorizado</div>
          </div>
          <div>
            <div style="height: 60px;"></div>
            <div class="sig-line">Sello y Firma Receptor Hacienda</div>
          </div>
        </div>

        <div class="footer">
          <div>SERMAB - Sistema de Control Tributario y Recaudación de Impuestos</div>
          <div>Página 1 de 1</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  const formatBs = (v) => v.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Desde</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={desde} 
                    onChange={(e) => setDesde(e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium" 
                  />
                  <Calendar className="absolute right-3 top-3 text-gray-400 pointer-events-none w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hasta</label>
                <div className="relative">
                  <input 
                    type="date" 
                    value={hasta} 
                    onChange={(e) => setHasta(e.target.value)} 
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium" 
                  />
                  <Calendar className="absolute right-3 top-3 text-gray-400 pointer-events-none w-4 h-4" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Servicio</label>
                <select 
                  value={servicio} 
                  onChange={(e) => setServicio(e.target.value)} 
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-100 transition focus:border-green-300 font-medium cursor-pointer"
                >
                  {uniqueServices.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <button 
                  onClick={() => {}} 
                  className="w-full bg-green-800 hover:bg-green-700 active:bg-green-900 text-white font-semibold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition border-0 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Zona de Salida: métricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition duration-150">
            <div>
              <div className="text-sm text-gray-500 font-medium">Total Recaudado</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">Bs. {formatBs(resumen.total)}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-700" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition duration-150">
            <div>
              <div className="text-sm text-gray-500 font-medium">Transacciones Procesadas</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{resumen.trans}</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between hover:shadow-md transition duration-150">
            <div>
              <div className="text-sm text-gray-500 font-medium">Servicio más pagado</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">{resumen.top}</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
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
              <button 
                onClick={handleExport} 
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 px-4 py-2 rounded-lg cursor-pointer transition font-semibold text-sm"
              >
                <Printer className="w-4 h-4" />
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
                  <tr key={op.recibo} className="border-b last:border-b-0 hover:bg-gray-50/50">
                    <td className="py-4 font-semibold text-gray-800">{op.recibo}</td>
                    <td className="py-4 text-gray-700">{op.fecha}</td>
                    <td className="py-4">
                      <div className="font-semibold text-gray-800">{op.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{op.ci}</div>
                    </td>
                    <td className="py-4">
                      <span className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold border border-green-200">{op.servicio}</span>
                    </td>
                    <td className="py-4 font-semibold text-gray-900">Bs. {formatBs(op.monto)}</td>
                    <td className="py-4 text-gray-700">{op.cajero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
            <div>Mostrando {filtered.length} de {operaciones.length} registros</div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition cursor-pointer text-xs">Anterior</button>
              <button className="px-3 py-1.5 rounded-lg bg-green-800 text-white font-semibold text-xs border-0">1</button>
              <button className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium transition cursor-pointer text-xs">Siguiente</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

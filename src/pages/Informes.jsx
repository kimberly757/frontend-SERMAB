import React, { useState, useMemo } from 'react'
import { Calendar, FileText, DollarSign, CheckCircle, Printer, X, TrendingUp, PieChart, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function Informes({ operaciones = [] }) {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [servicio, setServicio] = useState('Todas')
  const [mostrarReporte, setMostrarReporte] = useState(false)

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

  const reporteData = useMemo(() => {
    if (filtered.length === 0) return null
    const porServicio = {}
    filtered.forEach(op => {
      if (op.servicio) {
        op.servicio.split(',').forEach(s => {
          const name = s.trim()
          if (name) porServicio[name] = (porServicio[name] || 0) + op.monto
        })
      }
    })
    const servicioRows = Object.entries(porServicio)
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, monto]) => ({ nombre, monto }))

    const porMetodo = {}
    filtered.forEach(op => {
      const name = op.metodo || 'Otro'
      porMetodo[name] = (porMetodo[name] || 0) + op.monto
    })
    const metodoRows = Object.entries(porMetodo)
      .sort((a, b) => b[1] - a[1])
      .map(([nombre, monto]) => ({ nombre, monto }))

    const porDia = {}
    filtered.forEach(op => {
      const d = new Date(op.fechaRaw)
      const key = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
      porDia[key] = (porDia[key] || 0) + op.monto
    })
    const trendData = Object.entries(porDia).map(([dia, monto]) => ({ dia, monto }))

    let comparativa = null
    if (desde && hasta) {
      const from = new Date(desde + 'T00:00:00')
      const to = new Date(hasta + 'T23:59:59')
      const diffMs = to.getTime() - from.getTime()
      const prevDesde = new Date(from.getTime() - diffMs)
      const prevHasta = new Date(from.getTime() - 86400000)

      let anteriorTotal = 0
      let anteriorCount = 0
      operaciones.forEach(op => {
        const opDate = new Date(op.fechaRaw)
        if (opDate >= prevDesde && opDate <= prevHasta) {
          anteriorTotal += op.monto
          anteriorCount++
        }
      })

      const diff = resumen.total - anteriorTotal
      const pct = anteriorTotal > 0 ? ((diff / anteriorTotal) * 100) : 0

      comparativa = { anteriorTotal, anteriorCount, diff, pct, mejoro: diff >= 0 }
    }

    return { servicioRows, metodoRows, trendData, comparativa }
  }, [filtered, desde, hasta, operaciones, resumen.total])

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
                  onClick={() => setMostrarReporte(true)} 
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

        {/* Reporte Generado */}
        {mostrarReporte && (
          <div className="bg-white shadow-sm rounded-xl p-6 mb-6 border-2 border-green-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-700" />
                  Reporte de Recaudación
                </h3>
                <p className="text-sm text-gray-500">
                  {desde ? new Date(desde + 'T00:00:00').toLocaleDateString('es-VE') : 'Inicio'} — {hasta ? new Date(hasta + 'T00:00:00').toLocaleDateString('es-VE') : 'Hoy'}
                  {servicio !== 'Todas' ? ` · ${servicio}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const pw = window.open('', '_blank')
                  if (!pw) { alert('Permita ventanas emergentes'); return }
                  const rows = reporteData.servicioRows.map(r =>
                    `<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${r.nombre}</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">Bs. ${formatBs(r.monto)}</td></tr>`
                  ).join('')
                  const mRows = reporteData.metodoRows.map(r =>
                    `<tr><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${r.nombre}</td><td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">Bs. ${formatBs(r.monto)}</td></tr>`
                  ).join('')
                  const cmp = reporteData.comparativa
                  pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte SERMAB</title><style>body{font-family:system-ui,sans-serif;padding:40px;color:#1e293b}table{width:100%;border-collapse:collapse;margin-bottom:30px}th{background:#f8fafc;border-bottom:2px solid #cbd5e1;padding:10px;text-align:left;font-size:12px;text-transform:uppercase}h2{color:#15803d;border-bottom:3px solid #15803d;padding-bottom:10px}</style></head><body>
                    <h2>SERMAB — Reporte de Recaudación</h2>
                    <p style="color:#64748b;margin-bottom:30px">${desde || 'Inicio'} — ${hasta || 'Hoy'} ${servicio !== 'Todas' ? '| '+servicio : ''}</p>
                    <h3>Resumen por Servicio</h3>
                    <table><thead><tr><th>Servicio</th><th style="text-align:right">Total</th></tr></thead><tbody>${rows}</tbody></table>
                    <h3>Resumen por Método de Pago</h3>
                    <table><thead><tr><th>Método</th><th style="text-align:right">Total</th></tr></thead><tbody>${mRows}</tbody></table>
                    ${cmp ? `<h3>Comparativa vs Período Anterior</h3><table><thead><tr><th></th><th style="text-align:right">Período Actual</th><th style="text-align:right">Período Anterior</th><th style="text-align:right">Variación</th></tr></thead><tbody>
                      <tr><td>Total</td><td style="text-align:right;font-weight:600">Bs. ${formatBs(resumen.total)}</td><td style="text-align:right;font-weight:600">Bs. ${formatBs(cmp.anteriorTotal)}</td><td style="text-align:right;font-weight:600;color:${cmp.mejoro?'#15803d':'#dc2626'}">${cmp.mejoro?'+':''}${cmp.pct.toFixed(1)}%</td></tr>
                      <tr><td>Transacciones</td><td style="text-align:right">${resumen.trans}</td><td style="text-align:right">${cmp.anteriorCount}</td><td style="text-align:right">${resumen.trans - cmp.anteriorCount >= 0 ? '+' : ''}${resumen.trans - cmp.anteriorCount}</td></tr>
                    </tbody></table>` : ''}
                    <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:50px;border-top:1px solid #e2e8f0;padding-top:20px">Generado el ${new Date().toLocaleString('es-VE')} · SERMAB</p>
                    <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script>
                  </body></html>`)
                  pw.document.close()
                }} className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 rounded-lg cursor-pointer transition font-semibold text-sm">
                  <Printer className="w-4 h-4" />
                  Imprimir Reporte
                </button>
                <button onClick={() => setMostrarReporte(false)} className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg cursor-pointer transition font-semibold text-sm border-0">
                  <X className="w-4 h-4" />
                  Cerrar
                </button>
              </div>
            </div>

            {!reporteData ? (
              <div className="text-center py-12 text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">No hay operaciones en el período seleccionado</p>
                <p className="text-sm mt-1">Seleccione un rango de fechas con transacciones registradas.</p>
              </div>
            ) : (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Resumen por Servicio */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><PieChart className="w-4 h-4 text-green-600" /> Recaudación por Servicio</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {reporteData.servicioRows.map(r => (
                    <div key={r.nombre} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{r.nombre}</span>
                      <span className="text-sm font-semibold text-gray-900">Bs. {formatBs(r.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen por Método de Pago */}
              <div className="border border-gray-100 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-green-600" /> Recaudación por Método de Pago</h4>
                <div className="space-y-2">
                  {reporteData.metodoRows.map(r => (
                    <div key={r.nombre} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-700">{r.nombre}</span>
                      <span className="text-sm font-semibold text-gray-900">Bs. {formatBs(r.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comparativa vs Período Anterior */}
            {reporteData.comparativa && (
              <div className="border border-gray-100 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /> Comparativa vs Período Anterior</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Actual</div>
                    <div className="text-lg font-bold text-gray-800 mt-1">Bs. {formatBs(resumen.total)}</div>
                    <div className="text-xs text-gray-400">{resumen.trans} transacciones</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Anterior</div>
                    <div className="text-lg font-bold text-gray-800 mt-1">Bs. {formatBs(reporteData.comparativa.anteriorTotal)}</div>
                    <div className="text-xs text-gray-400">{reporteData.comparativa.anteriorCount} transacciones</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Diferencia</div>
                    <div className={`text-lg font-bold mt-1 ${reporteData.comparativa.mejoro ? 'text-green-600' : 'text-red-600'}`}>
                      {reporteData.comparativa.mejoro ? '+' : ''}Bs. {formatBs(Math.abs(reporteData.comparativa.diff))}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Variación %</div>
                    <div className={`text-lg font-bold mt-1 ${reporteData.comparativa.mejoro ? 'text-green-600' : 'text-red-600'}`}>
                      {reporteData.comparativa.mejoro ? '+' : ''}{reporteData.comparativa.pct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tendencia Diaria - Gráfico */}
            {reporteData.trendData.length > 1 && (
              <div className="border border-gray-100 rounded-xl p-4">
                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /> Tendencia Diaria</h4>
                <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reporteData.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                    <Tooltip formatter={(v) => `Bs. ${formatBs(v)}`} />
                    <Bar dataKey="monto" fill="#15803d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}

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

import React, { useState } from 'react'
import { Shield, Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react'

export default function Backup({
  contribuyentes = [],
  setContribuyentes = () => {},
  deudas = [],
  setDeudas = () => {},
  operaciones = [],
  setOperaciones = () => {},
  logsBitacora = [],
  setLogsBitacora = () => {},
  tasaBcv = 36.45,
  setTasaBcv = () => {},
  registrarLog = () => {}
}) {
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Exportar datos a JSON
  const handleExportBackup = () => {
    try {
      setErrorMsg('')
      setSuccessMsg('')
      
      const backupData = {
        contribuyentes,
        deudas,
        operaciones,
        bitacora: logsBitacora,
        tasaBcv
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`
      
      const downloadAnchor = document.createElement('a')
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      
      downloadAnchor.setAttribute('href', jsonString)
      downloadAnchor.setAttribute('download', `sermab_backup_${dateStr}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()

      setSuccessMsg('¡Copia de seguridad exportada y descargada con éxito!')
      registrarLog('Copias de Seguridad', 'Exportó copia de seguridad del sistema en formato JSON.')
    } catch (error) {
      setErrorMsg('Error al exportar la copia de seguridad.')
    }
  }

  // Importar y restaurar datos desde JSON
  const handleImportBackup = (e) => {
    setErrorMsg('')
    setSuccessMsg('')
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsedData = JSON.parse(event.target.result)
        
        // Validar formato del archivo
        if (
          !parsedData.hasOwnProperty('contribuyentes') ||
          !parsedData.hasOwnProperty('deudas') ||
          !parsedData.hasOwnProperty('operaciones') ||
          !parsedData.hasOwnProperty('bitacora') ||
          !parsedData.hasOwnProperty('tasaBcv')
        ) {
          setErrorMsg('El archivo de respaldo no es válido. Faltan claves estructurales obligatorias.')
          return
        }

        // Confirmar antes de restaurar
        const confirmRestoration = window.confirm(
          '¡ADVERTENCIA!\nEsta acción reemplazará todos los datos actuales del sistema. ¿Desea continuar con la restauración?'
        )
        if (!confirmRestoration) return

        // Sobrescribir estados globales
        setContribuyentes(parsedData.contribuyentes)
        setDeudas(parsedData.deudas)
        setOperaciones(parsedData.operaciones)
        setLogsBitacora(parsedData.bitacora)
        setTasaBcv(parsedData.tasaBcv)

        // Forzar guardado inmediato en localStorage
        localStorage.setItem('sermab_contribuyentes', JSON.stringify(parsedData.contribuyentes))
        localStorage.setItem('sermab_deudas', JSON.stringify(parsedData.deudas))
        localStorage.setItem('sermab_operaciones', JSON.stringify(parsedData.operaciones))
        localStorage.setItem('sermab_bitacora', JSON.stringify(parsedData.bitacora))
        localStorage.setItem('sermab_tasa_bcv', String(parsedData.tasaBcv))

        setSuccessMsg('¡Sistema restaurado con éxito desde la copia de seguridad!')
        
        // Registrar acción en la nueva bitácora cargada
        const today = new Date()
        const fechaHora = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}:${String(today.getSeconds()).padStart(2, '0')}`
        const restoreLog = {
          id: `BIT-${String(parsedData.bitacora.length + 1).padStart(3, '0')}`,
          fechaHora,
          usuario: 'Administrador (Ana Rodríguez)',
          modulo: 'Copias de Seguridad',
          accion: 'Restauración completa del sistema desde archivo de respaldo JSON',
          ip: '192.168.1.102'
        }
        setLogsBitacora(prev => [restoreLog, ...prev])
      } catch (error) {
        setErrorMsg('Error al parsear el archivo. Asegúrese de que es un archivo JSON válido.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Cabecera */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex items-center justify-between border border-gray-100">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              Copias de <span className="text-green-700">Seguridad</span>
            </h1>
            <p className="text-sm text-gray-500">Respaldo físico y restauración de la base de datos local (localStorage)</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-700">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-4 bg-red-50 text-red-600 rounded-2xl p-4 flex items-center gap-2 border border-red-200">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-green-50 text-green-800 rounded-2xl p-4 flex items-center gap-2 border border-green-200">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{successMsg}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Tarjeta Exportar */}
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
                <div className="p-2 rounded-lg bg-green-50 text-green-700">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Exportar Base de Datos</h3>
                  <p className="text-xs text-gray-400">Descarga un respaldo completo en formato JSON</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Esta función recopila toda la información almacenada en el sistema, incluyendo el catálogo de contribuyentes registrados, historial de deudas activas, recibos de caja cobrados e historial completo de bitácora.
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resumen de Datos a Exportar:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Contribuyentes Registrados: <strong>{contribuyentes.length}</strong></li>
                  <li>• Deudas Totales: <strong>{deudas.length}</strong></li>
                  <li>• Transacciones en Informes: <strong>{operaciones.length}</strong></li>
                  <li>• Registros en Bitácora: <strong>{logsBitacora.length}</strong></li>
                  <li>• Tasa BCV Actual: <strong>Bs. {tasaBcv.toFixed(2)}</strong></li>
                </ul>
              </div>
            </div>
            <button
              onClick={handleExportBackup}
              className="w-full inline-flex items-center justify-center rounded-2xl bg-green-800 px-6 py-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 cursor-pointer border-0"
            >
              <Download className="w-4 h-4 mr-2" /> Descargar Copia de Seguridad
            </button>
          </div>

          {/* Tarjeta Importar */}
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3 mb-4">
                <div className="p-2 rounded-lg bg-yellow-50 text-yellow-700">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Restaurar Base de Datos</h3>
                  <p className="text-xs text-gray-400">Cargue un archivo JSON generado anteriormente</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                Seleccione un archivo de copia de seguridad con extensión `.json`. Al restaurar, **todos los datos del panel actual serán sobrescritos** de forma permanente con el contenido del archivo de respaldo.
              </p>
              <div className="bg-yellow-50/50 rounded-2xl p-4 mb-6 border border-yellow-100">
                <div className="flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0" />
                  <p className="text-xs text-yellow-800 leading-relaxed">
                    <strong>¡Atención!</strong> Asegúrese de que no haya cajeros operando en este momento, ya que la restauración forzará el cambio del estado global de la aplicación.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                id="file-upload-input"
                className="hidden"
              />
              <label
                htmlFor="file-upload-input"
                className="w-full inline-flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 hover:border-green-800 bg-white px-6 py-4 text-sm font-semibold text-gray-700 hover:text-green-800 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 mr-2" /> Seleccionar Archivo y Restaurar
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

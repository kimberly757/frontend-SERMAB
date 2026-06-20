import React from 'react'
import { Home, Users, FileText, Layers, BarChart2, Clock, Shield, LogOut } from 'lucide-react'
import logoAlcaldia from '../assets/logo-alcaldia.png'

export default function Sidebar({
  currentPage = 'home',
  onNavigate = () => {},
  onLogout = () => {},
  isOpen = false,
  onClose = () => {}
}) {
  const itemClass = (active) =>
    `flex items-center gap-4 p-3 rounded-lg text-white no-underline ${active ? 'bg-[#0f4f2f] shadow-sm' : 'hover:bg-white/5'}`

  const handleNav = (e, targetPage) => {
    e.preventDefault()
    onNavigate(targetPage)
    onClose()
  }

  return (
    <>
      {/* Background Overlay on Mobile */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-72 bg-[#06381f] text-white flex flex-col p-6 shadow-lg z-50 transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="flex items-center gap-3 mb-8">
          <img src={logoAlcaldia} alt="Logo Alcaldía Andrés Bello" className="w-12 h-12 rounded-full object-cover bg-white" />
          <div>
            <div className="font-semibold text-lg">Alcaldía</div>
            <div className="text-sm text-green-100">Andrés Bello</div>
          </div>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2 list-none p-0 m-0">
            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'home')}
                className={itemClass(currentPage === 'home')}
              >
                <span className="p-2 bg-yellow-400 rounded-full text-[#083018]">
                  <Home className="w-4 h-4" />
                </span>
                <span className="font-medium">Inicio</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'contribuyentes')}
                className={itemClass(currentPage === 'contribuyentes')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <Users className="w-4 h-4" />
                </span>
                <span>Contribuyentes</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'servicios')}
                className={itemClass(currentPage === 'servicios')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <Layers className="w-4 h-4" />
                </span>
                <span>Servicios</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'caja')}
                className={itemClass(currentPage === 'caja')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <BarChart2 className="w-4 h-4" />
                </span>
                <span>Caja</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'informes')}
                className={itemClass(currentPage === 'informes')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <FileText className="w-4 h-4" />
                </span>
                <span>Reportes</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'bitacora')}
                className={itemClass(currentPage === 'bitacora')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <Clock className="w-4 h-4" />
                </span>
                <span>Bitácora</span>
              </a>
            </li>

            <li>
              <a
                href="#"
                onClick={(e) => handleNav(e, 'backup')}
                className={itemClass(currentPage === 'backup')}
              >
                <span className="p-2 bg-transparent rounded-full text-yellow-300">
                  <Shield className="w-4 h-4" />
                </span>
                <span>Copias de Seguridad</span>
              </a>
            </li>
          </ul>
        </nav>

        <div className="mt-auto">
          <button onClick={onLogout} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-white/5 bg-transparent border-0 cursor-pointer text-left text-white text-base">
            <LogOut className="w-4 h-4 text-yellow-300" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}

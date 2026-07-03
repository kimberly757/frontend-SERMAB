import React, { useState, useEffect, useMemo } from 'react'
import Sidebar from '../components/Sidebar'
import { Users, FileText, Activity, Bell, User, CheckCircle, TrendingUp, Monitor, Menu, XCircle } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import Contribuyentes from './Contribuyentes'
import Caja from './Caja'
import Servicios from './Servicios'
import Informes from './Informes'
import Bitacora from './Bitacora'
import Backup from './Backup'
import Usuarios from './Usuarios'
import { contribuyenteService } from '../services/contribuyenteService'
import { servicioService } from '../services/servicioService'
import api from '../services/api'

const mapDateToPeriod = (dateStr, freq) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  if (freq === 'Mensual') {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[month - 1]} ${year}`;
  }
  
  if (freq === 'Bimensual') {
    const bims = [
      'Ene-Feb', 'Mar-Abr', 'May-Jun', 'Jul-Ago', 'Sep-Oct', 'Nov-Dic'
    ];
    const bimIndex = Math.floor((month - 1) / 2);
    return `${bims[bimIndex]} ${year}`;
  }
  
  if (freq === 'Trimestral') {
    const trimIndex = Math.floor((month - 1) / 3) + 1;
    return `Trimestre ${trimIndex} ${year}`;
  }
  
  if (freq === 'Semestral') {
    const semIndex = Math.floor((month - 1) / 6) + 1;
    return `${semIndex === 1 ? '1er' : '2do'} Semestre ${year}`;
  }
  
  if (freq === 'Anual') {
    return `Año ${year}`;
  }
  
  return 'No Aplica / Pago Único';
};

const formatServiciosList = (str) => {
  if (!str) return '';
  const items = str.split(',').map(s => s.trim()).filter(Boolean);
  const counts = {};
  items.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([name, count]) => count > 1 ? `${name} (x${count})` : name)
    .join(', ');
};

export default function Dashboard({ onLogout }) {
  const [page, setPage] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Estados dinámicos centralizados cargados desde la base de datos
  const [contribuyentes, setContribuyentes] = useState([])
  const [inmuebles, setInmuebles] = useState([])

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

  const loadInmuebles = async () => {
    try {
      const data = await contribuyenteService.getInmuebles();
      setInmuebles(data || []);
    } catch (err) {
      console.error('Error al cargar inmuebles:', err);
    }
  };

  useEffect(() => {
    loadContribuyentes();
    loadInmuebles();
    loadDeudas();
    loadServicios();
    loadOperaciones();
    loadBitacora();
    loadUsuarios();
    loadTasaBcv();
  }, []);

  // Refrescar datos al volver al panel de resumen
  useEffect(() => {
    if (page === 'home') {
      loadBitacora();
      loadOperaciones();
    }
  }, [page]);

  const [deudas, setDeudasState] = useState([])
  const [servicios, setServicios] = useState([])
  const [usuarios, setUsuarios] = useState([])

  const loadUsuarios = async () => {
    try {
      const { data } = await api.get('/usuarios');
      setUsuarios(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  const loadBitacora = async (all = false) => {
    try {
      const data = await servicioService.getBitacora(all);
      const mapped = data.map(b => {
        let modulo = 'General';
        let action = b.bitaco_ac;
        let ip = '192.168.1.102';
        
        const ipRegex = /\(IP:\s*([0-9.]+)\)$/;
        const ipMatch = action.match(ipRegex);
        if (ipMatch) {
          ip = ipMatch[1];
          action = action.replace(ipRegex, '').trim();
        }

        const modRegex = /^\[([^\]]+)\]/;
        const modMatch = action.match(modRegex);
        if (modMatch) {
          modulo = modMatch[1];
          action = action.replace(modRegex, '').trim();
        }

        return {
          id: `BIT-${String(b.bitaco_id).padStart(3, '0')}`,
          idRaw: b.bitaco_id,
          fechaHora: new Date(b.bitaco_fe).toLocaleString('es-VE'),
          fechaRaw: b.bitaco_fe,
          usuario: `${b.usuario_rol || 'Admin'} (${b.usuario_nombre || 'Usuario'})`,
          modulo,
          accion: action,
          ip
        };
      });
      setLogsBitacora(mapped);
    } catch (err) {
      console.error('Error al cargar bitacora:', err);
    }
  };

  const loadDeudas = async (contri_id = null) => {
    try {
      const params = {};
      if (contri_id) params.contri_id = contri_id;
      const data = await servicioService.getDeudas(params);
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
          periodo: d.deudas_fe ? mapDateToPeriod(d.deudas_fe, d.servic_fr) : '',
          deudas_fe: d.deudas_fe ? String(d.deudas_fe).substring(0, 10) : null,
          monto: parseFloat(d.deudas_mt) || 0,
          abono_mt: parseFloat(d.abono_mt) || 0,
          estado: d.deudas_es,
          inmueb_id: d.inmueb_id,
          inmueble_direccion: d.inmueble_direccion
        };
      });
      setDeudasState(mapped);
      return mapped;
    } catch (err) {
      console.error('Error al cargar deudas:', err);
      return [];
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
        tarifa_id: s.tarifa_id,
        servic_tp: s.servic_tp || 'general'
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
    
    const updates = [];
    for (const newD of newDeudas) {
      const oldD = deudas.find(d => d.id === newD.id);
      if (oldD && oldD.estado !== newD.estado) {
        updates.push(
          servicioService.updateDeuda(newD.id, { deudas_es: newD.estado })
            .catch(e => console.error(`Error al actualizar deuda ${newD.id}:`, e))
        );
        updatedIds.push(newD.id);
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }
    setDeudasState(newDeudas);
  };

  const [operaciones, setOperaciones] = useState([])

  const loadOperaciones = async () => {
    try {
      const data = await servicioService.getCobros();
      const mapped = data.map(c => {
        let tipo = 'V';
        if (c.tipcon_id === 2) tipo = 'J';
        else if (c.tipcon_id === 3) tipo = 'G';
        else if (c.tipcon_id === 4) tipo = 'E';
        
        let doc = c.contribuyente_documento || '';
        const cleanDoc = doc.replace(/[^0-9]/g, '');
        if (cleanDoc && cleanDoc.length > 3) {
          doc = Number(cleanDoc).toLocaleString('es-VE');
        }

        return {
          id: c.cobros_id,
          recibo: c.cobros_rb,
          fecha: new Date(c.cobros_fh).toLocaleString('es-VE'),
          fechaRaw: c.cobros_fh,
          nombre: c.contribuyente_nombre,
          ci: `${tipo}-${doc}`,
          servicio: formatServiciosList(c.servicios_list) || 'Sin detalles',
          monto: parseFloat(c.cobros_mt) || 0,
          cajero: `${c.cajero_nombre} ${c.cajero_apellido || ''}`.trim(),
          estado: c.cobros_es,
          metodo_id: c.metodo_id,
          metodo: c.metodo_nombre,
          bancos_id: c.bancos_id,
          banco: c.banco_nombre
        };
      });
      setOperaciones(mapped);
    } catch (err) {
      console.error('Error al cargar operaciones:', err);
    }
  };

  const [logsBitacora, setLogsBitacora] = useState([])

  const [tasaBcv, setTasaBcv] = useState(36.45)
  const [isEditingTasa, setIsEditingTasa] = useState(false)
  const [tempTasa, setTempTasa] = useState(36.45)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTasaBcv = async () => {
    try {
      const { data } = await api.get('/config/tasa-bcv')
      setTasaBcv(data.tasa)
      setTempTasa(data.tasa)
    } catch (err) {
      console.error('Error al cargar tasa BCV', err)
    }
  }

  const handleSaveTasa = async () => {
    try {
      const { data } = await api.put('/config/tasa-bcv', { tasa: tempTasa })
      setTasaBcv(data.tasa)
      setIsEditingTasa(false)
      registrarLog('Sistema', `Actualizó tasa BCV a Bs. ${data.tasa}`)
      showToast('Tasa BCV actualizada correctamente', 'success')
    } catch (err) {
      console.error('Error al guardar tasa BCV', err)
      const serverMsg = err.response?.data?.message || err.message
      showToast('Error al guardar tasa BCV: ' + serverMsg, 'error')
    }
  }

  // Sincronización automática con localStorage
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

  // Eliminado el guardado en localStorage de tasaBcv

  const registrarLog = async (modulo, accion) => {
    try {
      const ip = userData.rol === 'Administrador' ? '192.168.1.102' : '192.168.1.105'
      const actionText = `[${modulo}] ${accion} (IP: ${ip})`
      const usuari_id = currentUser?.usuari_id || 2
      await servicioService.registrarLog(usuari_id, actionText)
      loadBitacora()
    } catch (err) {
      console.error('Error al registrar log en la bitacora:', err)
    }
  }

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sermab_user');
      if (!saved || saved === 'undefined' || saved === 'null') return null;
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  });

  const userData = useMemo(() => {
    return {
      id: currentUser?.usuari_id || 2,
      nombre: currentUser ? `${currentUser.usuari_nm} ${currentUser.usuari_ap || ''}`.trim() : 'Ana Rodríguez',
      rol: currentUser?.rolusr_id === 1 ? 'Administrador' : 'Cajera',
      loginTime: '08:32',
    };
  }, [currentUser]);

  const statsDashboard = useMemo(() => {
    const today = new Date();
    const totalContribuyentes = contribuyentes.length;
    
    let totalRecaudadoHoy = 0;
    let operacionesHoy = 0;
    
    operaciones.forEach(op => {
      if (op.estado !== 'Anulado' && op.fechaRaw) {
        const opDate = new Date(op.fechaRaw);
        if (opDate.getFullYear() === today.getFullYear() &&
            opDate.getMonth() === today.getMonth() &&
            opDate.getDate() === today.getDate()) {
          totalRecaudadoHoy += op.monto;
          operacionesHoy++;
        }
      }
    });

    const serviciosFacturados = deudas.length;

    return {
      totalRecaudadoHoy,
      totalContribuyentes,
      operacionesHoy,
      serviciosFacturados
    };
  }, [operaciones, contribuyentes, deudas]);

  const dataRecaudacion = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const revenueByDay = { Lun: 0, Mar: 0, Mié: 0, Jue: 0, Vie: 0, Sáb: 0, Dom: 0 };
    const orderedDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    operaciones.forEach(op => {
      if (op.estado !== 'Anulado' && op.fechaRaw) {
        const date = new Date(op.fechaRaw);
        if (!isNaN(date.getTime()) && date >= sevenDaysAgo) {
          const dayName = days[date.getDay()];
          revenueByDay[dayName] += op.monto;
        }
      }
    });

    return orderedDays.map(day => ({
      name: day,
      monto: revenueByDay[day]
    }));
  }, [operaciones]);

  const ultimosMovimientos = useMemo(() => {
    const ordenados = [...operaciones].sort((a, b) => new Date(b.fechaRaw) - new Date(a.fechaRaw));
    return ordenados.slice(0, 4).map((op, idx) => ({
      id: op.id || idx,
      nombre: op.cajero || 'Caja',
      servicio: `Recibo: ${op.recibo}`,
      monto: `Bs. ${op.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tiempo: new Date(op.fechaRaw).toLocaleDateString('es-VE')
    }));
  }, [operaciones]);

  const statsCajas = useMemo(() => {
    const totalCajeras = usuarios.filter(u => u.rolusr_id === 2).length;
    
    // Activas hoy: usuarios que usaron el módulo Caja o cajeras con login hoy
    const today = new Date();
    const cajerasActivas = new Set();
    
    logsBitacora.forEach(log => {
      if (!log.fechaRaw) return;
      const d = new Date(log.fechaRaw);
      const esHoy = d.getFullYear() === today.getFullYear() && 
                    d.getMonth() === today.getMonth() && 
                    d.getDate() === today.getDate();
      if (!esHoy) return;

      // Cuenta como activo si: usó el módulo Caja O es cajera con login hoy
      if (log.modulo === 'Caja' || log.usuario?.includes('Cajera')) {
        cajerasActivas.add(log.usuario);
      }
    });

    return {
      activas: cajerasActivas.size,
      total: totalCajeras || 3
    };
  }, [usuarios, logsBitacora]);

  const pendientesCount = useMemo(() => {
    return usuarios.filter(u => u.usuari_es === 'Pendiente').length;
  }, [usuarios]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        currentPage={page} 
        onNavigate={setPage} 
        onLogout={onLogout} 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        userData={userData}
      />

      <main className="ml-0 md:ml-72 p-6 transition-all duration-300">
        {/* Header móvil para alternar barra lateral */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4 mb-6 md:hidden border border-gray-100">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 cursor-pointer border-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-semibold text-gray-800">Alcaldía Andrés Bello</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-green-800 text-white flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
        </div>
        {page === 'caja' ? (
          <Caja
            contribuyentes={contribuyentes}
            inmuebles={inmuebles}
            loadInmuebles={loadInmuebles}
            deudas={deudas}
            loadDeudas={loadDeudas}
            loadOperaciones={loadOperaciones}
            userData={userData}
            registrarLog={registrarLog}
            tasaBcv={tasaBcv}
            onLogout={onLogout}
          />
        ) : page === 'contribuyentes' ? (
          <Contribuyentes
            contribuyentes={contribuyentes}
            inmuebles={inmuebles}
            loadInmuebles={loadInmuebles}
            setContribuyentes={loadContribuyentes}
            registrarLog={registrarLog}
            isAdmin={true}
          />
        ) : page === 'servicios' ? (
          <Servicios
            deudas={deudas}
            setDeudas={setDeudas}
            loadDeudas={loadDeudas}
            servicios={servicios}
            loadServicios={loadServicios}
            contribuyentes={contribuyentes}
            registrarLog={registrarLog}
          />
        ) : page === 'informes' ? (
          <Informes
            operaciones={operaciones}
          />
        ) : page === 'bitacora' ? (
          <Bitacora historial={logsBitacora} loadBitacora={loadBitacora} />
        ) : page === 'backup' ? (
          <Backup
            contribuyentes={contribuyentes}
            setContribuyentes={setContribuyentes}
            deudas={deudas}
            setDeudas={setDeudas}
            operaciones={operaciones}
            setOperaciones={setOperaciones}
            logsBitacora={logsBitacora}
            setLogsBitacora={setLogsBitacora}
            tasaBcv={tasaBcv}
            setTasaBcv={setTasaBcv}
            registrarLog={registrarLog}
          />
        ) : page === 'usuarios' ? (
          <Usuarios />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">
                  Bienvenido(a) al Sistema, <span className="text-green-700">{userData.nombre}</span>
                </h1>
                <p className="text-sm text-gray-500">Rol: {userData.rol} · Sesión iniciada hoy a las {userData.loginTime}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {pendientesCount > 0 && (
                  <button 
                    onClick={() => setPage('usuarios')}
                    className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-medium hover:bg-yellow-200 transition animate-pulse shadow-sm border border-yellow-200"
                  >
                    <User className="w-4 h-4" />
                    {pendientesCount} {pendientesCount === 1 ? 'Solicitud pendiente' : 'Solicitudes pendientes'}
                  </button>
                )}
                <div className="text-sm text-gray-600 hidden md:block">Miércoles, 27 De Mayo De 2026</div>
                <button className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition">
                  <Bell className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center ml-4">
                  <User className="w-5 h-5" />
                </div>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">Panel de Control</h2>
            <p className="text-sm text-gray-500 mb-6">Resumen operativo del día — Municipio Andrés Bello</p>

            <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="text-sm text-gray-500">Total Recaudado Hoy</div>
                <div className="text-3xl font-bold text-gray-800 mt-3">Bs. {statsDashboard.totalRecaudadoHoy.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-green-600 mt-1">En tiempo real</div>
                <div className="absolute top-4 right-4 bg-green-50 p-2 rounded-md">
                  <span className="text-green-700">$</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="text-sm text-gray-500">Contribuyentes Registrados</div>
                <div className="text-3xl font-bold text-gray-800 mt-3">{statsDashboard.totalContribuyentes.toLocaleString('es-VE')}</div>
                <div className="text-sm text-gray-400 mt-1">Base de datos activa</div>
                <div className="absolute top-4 right-4 bg-green-50 p-2 rounded-md">
                  <Users className="w-5 h-5 text-green-700" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="text-sm text-gray-500">Operaciones en Caja Hoy</div>
                <div className="text-3xl font-bold text-gray-800 mt-3">{statsDashboard.operacionesHoy}</div>
                <div className="text-sm text-gray-400 mt-1">Transacciones procesadas</div>
                <div className="absolute top-4 right-4 bg-green-50 p-2 rounded-md">
                  <FileText className="w-5 h-5 text-green-700" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 relative">
                <div className="text-sm text-gray-500">Facturas Pendientes</div>
                <div className="text-3xl font-bold text-gray-800 mt-3">{statsDashboard.serviciosFacturados}</div>
                <div className="text-sm text-gray-400 mt-1">Por cobrar en sistema</div>
                <div className="absolute top-4 right-4 bg-green-50 p-2 rounded-md">
                  <Activity className="w-5 h-5 text-green-700" />
                </div>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Evolución de Recaudación (Últimos 7 días)</h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataRecaudacion} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`Bs. ${value.toLocaleString()}`, 'Recaudación']} cursor={{ fill: 'rgba(22, 101, 52, 0.08)' }} />
                      <Bar dataKey="monto" fill="#166534" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Últimos Movimientos Registrados</h4>
                  <div>
                    {ultimosMovimientos.map((mov) => (
                      <div key={mov.id} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-800" />
                          <div>
                            <div className="font-medium text-gray-800">{mov.nombre}</div>
                            <div className="text-sm text-gray-500">{mov.servicio}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-gray-800">{mov.monto}</div>
                          <div className="text-sm text-gray-500">{mov.tiempo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-3">Estado del Sistema</h3>

                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-800" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Estado de Conexión:</span>
                      <span className="text-sm font-medium text-gray-800">Operativo</span>
                      <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-yellow-500" />
                    <div>
                      <label htmlFor="tasaBcvInput" className="text-xs font-semibold text-gray-500 block uppercase">Tasa BCV (Bs):</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          id="tasaBcvInput"
                          type="number"
                          step="0.01"
                          value={isEditingTasa ? tempTasa : tasaBcv}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            setTempTasa(val)
                          }}
                          disabled={!isEditingTasa}
                          className={`text-sm font-semibold text-gray-800 border rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-green-100 ${isEditingTasa ? 'bg-white border-green-300' : 'bg-gray-50 border-gray-200'}`}
                        />
                        {isEditingTasa ? (
                          <button onClick={handleSaveTasa} className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded cursor-pointer border-0">
                            Guardar
                          </button>
                        ) : (
                          <button onClick={() => setIsEditingTasa(true)} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded cursor-pointer border-0">
                            Editar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Monitor className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Cajas Operativas:</div>
                      <div className="text-sm text-gray-800 font-medium">{statsCajas.activas} / {statsCajas.total}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Floating Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-xl text-white font-medium z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}
    </div>
  )
}

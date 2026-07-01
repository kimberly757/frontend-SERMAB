import api from './api';

export const servicioService = {
  // Obtener todas las categorías (tipos de servicio)
  getCategorias: async () => {
    const response = await api.get('/categorias');
    return response.data;
  },

  // Obtener todos los servicios con su categoría y precio actual
  getAll: async () => {
    const response = await api.get('/servicios');
    return response.data;
  },

  // Crear un nuevo servicio y su tarifa inicial
  create: async (data) => {
    const response = await api.post('/servicios', data);
    return response.data;
  },

  // Actualizar datos del servicio y su tarifa si cambia
  update: async (id, data) => {
    const response = await api.put(`/servicios/${id}`, data);
    return response.data;
  },

  // Desactivar un servicio (eliminación lógica)
  delete: async (id) => {
    const response = await api.delete(`/servicios/${id}`);
    return response.data;
  },

  // Obtener todas las deudas registradas
  getDeudas: async (params = {}) => {
    const response = await api.get('/deudas', { params });
    return response.data;
  },

  // Crear o asignar una deuda a un contribuyente
  createDeuda: async (data) => {
    const response = await api.post('/deudas', data);
    return response.data;
  },

  // Actualizar estado de deuda (por ejemplo, al pagar o anular)
  updateDeuda: async (id, data) => {
    const response = await api.put(`/deudas/${id}`, data);
    return response.data;
  },

  // Eliminar una deuda activa
  deleteDeuda: async (id) => {
    const response = await api.delete(`/deudas/${id}`);
    return response.data;
  },

  // Obtener todos los bancos
  getBancos: async () => {
    const response = await api.get('/bancos');
    return response.data;
  },

  // Obtener métodos de pago
  getMetodosPago: async () => {
    const response = await api.get('/metodos');
    return response.data;
  },

  // Obtener todos los cobros procesados
  getCobros: async () => {
    const response = await api.get('/cobros');
    return response.data;
  },

  // Registrar un cobro y sus detalles en el backend
  createCobro: async (data) => {
    const response = await api.post('/cobros', data);
    return response.data;
  },

  // Actualizar datos de un cobro (ej. cambiar de estado o anulación)
  updateCobro: async (id, data) => {
    const response = await api.put(`/cobros/${id}`, data);
    return response.data;
  },

  // Obtener logs de la bitácora
  getBitacora: async (all = false) => {
    const response = await api.get(`/bitacoras?all=${all}`);
    return response.data;
  },

  // Registrar un log en la bitácora
  registrarLog: async (usuari_id, action) => {
    const response = await api.post('/bitacoras', {
      usuari_id: parseInt(usuari_id),
      bitaco_ac: action
    });
    return response.data;
  }
};

import api from './api';

export const contribuyenteService = {
  // Obtener todos los contribuyentes
  getAll: async () => {
    const response = await api.get('/contribuyentes');
    return response.data;
  },

  // Obtener contribuyente por ID
  getById: async (id) => {
    const response = await api.get(`/contribuyentes/${id}`);
    return response.data;
  },

  // Crear contribuyente
  create: async (data) => {
    const response = await api.post('/contribuyentes', data);
    return response.data;
  },

  // Actualizar contribuyente (incluyendo activar/inactivar)
  update: async (id, data) => {
    const response = await api.put(`/contribuyentes/${id}`, data);
    return response.data;
  },

  // Obtener sectores de la base de datos
  getSectores: async () => {
    const response = await api.get('/sectores');
    return response.data;
  },

  // Obtener todas las direcciones registradas
  getDirecciones: async () => {
    const response = await api.get('/direcciones');
    return response.data;
  },

  // Crear una dirección para un contribuyente
  createDireccion: async (data) => {
    const response = await api.post('/direcciones', data);
    return response.data;
  },

  // Eliminar una dirección física
  deleteDireccion: async (id) => {
    const response = await api.delete(`/direcciones/${id}`);
    return response.data;
  },

  // Crear un inmueble (propiedad) para un contribuyente
  createInmueble: async (data) => {
    const response = await api.post('/inmuebles', data);
    return response.data;
  },

  // Disparar facturación automática de Aseo Urbano
  triggerAseoBilling: async (fecha = null) => {
    const response = await api.post('/jobs/run-aseo-billing', { fecha });
    return response.data;
  },

  // Obtener todos los inmuebles
  getInmuebles: async () => {
    const response = await api.get('/inmuebles');
    return response.data;
  }
};

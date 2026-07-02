import api from './api';

export const usuarioService = {
  getAll: async () => {
    const response = await api.get('/usuarios');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  }
};

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token JWT a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sermab_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si la API responde con 401 (No autorizado / Token vencido)
    if (error.response && error.response.status === 401) {
      // Limpiar datos de sesión local si el usuario estaba logueado
      if (localStorage.getItem('sermab_logged_in') === 'true') {
        localStorage.removeItem('sermab_logged_in');
        localStorage.removeItem('sermab_user_role');
        localStorage.removeItem('sermab_token');
        localStorage.removeItem('sermab_user');
        
        // Recargar la aplicación para redirigir a la pantalla de login
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

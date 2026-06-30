import api from './api';

export const authService = {
  /**
   * Inicia sesión con el código de usuario y contraseña.
   * @param {string} usuari_cd - Código del usuario (ej. admin01)
   * @param {string} usuari_co - Contraseña
   */
  login: async (usuari_cd, usuari_co) => {
    const response = await api.post('/auth/login', { usuari_cd, usuari_co });
    const { token, user } = response.data;
    
    // Guardar información en localStorage
    localStorage.setItem('sermab_token', token);
    localStorage.setItem('sermab_logged_in', 'true');
    
    // Mapear rolusr_id a rol string del frontend ('admin' o 'cajera')
    // rolusr_id === 1 es Administrador, cualquier otro es Cajera
    const roleString = user.rolusr_id === 1 ? 'admin' : 'cajera';
    localStorage.setItem('sermab_user_role', roleString);
    localStorage.setItem('sermab_user', JSON.stringify(user));
    
    return { token, user, roleString };
  },

  /**
   * Cierra la sesión activa.
   */
  logout: () => {
    localStorage.removeItem('sermab_logged_in');
    localStorage.removeItem('sermab_user_role');
    localStorage.removeItem('sermab_token');
    localStorage.removeItem('sermab_user');
  },

  /**
   * Obtiene la información del perfil del usuario autenticado.
   */
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  }
};

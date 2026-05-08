import axios from 'axios';
import Cookies from 'js-cookie';

const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: api_url,
});

// Intercepta las solicitudes para agregar el token de autenticación
api.interceptors.request.use((config) => { 
    const token = Cookies.get('token'); // pa obtener el token de las cookies
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
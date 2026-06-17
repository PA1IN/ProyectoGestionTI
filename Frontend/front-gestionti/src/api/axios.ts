import axios from 'axios';
import keycloak from '@/auth/keycloak';

const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: api_url,
});

// Intercepta las solicitudes para agregar el token de autenticación
api.interceptors.request.use(async (config) => {
    if (keycloak.authenticated) {
        await keycloak.updateToken(30);
    }

    const token = keycloak.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
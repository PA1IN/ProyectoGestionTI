import axios from 'axios';
import keycloak from '@/auth/keycloak';

const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

const api = axios.create({
    baseURL: api_url,
    headers: {
        'x-private-key': process.env.NEXT_PUBLIC_PRIVATE_KEY || 'default_private_key',
    }
});

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
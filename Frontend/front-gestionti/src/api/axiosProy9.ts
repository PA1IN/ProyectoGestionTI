import axios from 'axios';

export const apiProy9 = axios.create({
    baseURL: '/api/proxy-p9',
    headers: {
        'Content-Type': 'application/json',
    },
});

import axios from "axios";

export const apiProy7 = axios.create({
    baseURL: '/api/proxy-crm',
    headers: {
        'Content-Type': 'application/json',
    },
});
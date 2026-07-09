import axios from "axios";

export const apiProy7 = axios.create({
    baseURL: '/api/proxy-p7',
    headers: {
        'Content-Type': 'application/json',
    },
});
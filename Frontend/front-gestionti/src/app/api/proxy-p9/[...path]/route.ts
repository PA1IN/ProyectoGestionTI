import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

let token: string | null = null;
let tiempoExp: number = 0;

async function obtenerToken() {

    if (token && Date.now() < tiempoExp - 15000)
    {
        return token;        
    }

    const tokenParams = new URLSearchParams();
    tokenParams.append('grant_type', 'password');
    tokenParams.append('client_id', process.env.NEXT_PUBLIC_P9_CLIENT_ID || '');
    tokenParams.append('username', process.env.NEXT_PUBLIC_P9_USERNAME || '');
    tokenParams.append('password', process.env.NEXT_PUBLIC_P9_PASSWORD || '');

    const respuestaKeycloak = await axios.post(
        process.env.NEXT_PUBLIC_PROY12_KEYCLOAK_URL || '',
        tokenParams,
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        }
    );

    token = respuestaKeycloak.data.access_token;
    const expiraEn = respuestaKeycloak.data.expires_in;
    tiempoExp = Date.now() + expiraEn * 1000;

    return token;

}

async function reenviarPeticion(req: NextRequest, contexto: { params: Promise<{ path: string[] }> }) { 
    try {
        const accessToken = await obtenerToken();

        const paramsResolved = await contexto.params;
        const endpoint = paramsResolved.path.join('/');
        const url = `${process.env.NEXT_PUBLIC_API_URL_PROY9}/${endpoint}`;

        console.log("URL a la que se reenvía la petición:", url);
        console.log("Método de la petición:", req.method);

        let data = null;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            try {
                data = await req.json();
            } catch (error) {
                console.error('Error al leer el cuerpo de la solicitud:', error);
            }
        }

        const respuesta = await axios({
            method: req.method,
            url: url,
            data: data,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return NextResponse.json(respuesta.data);
    } catch (error: any) {
        if (error.response?.status === 401) {
            token = null;
            tiempoExp = 0;
            return NextResponse.json({ error: 'No autorizado. Token inválido o expirado.' }, { status: 401 });
        }
        console.error('Error en el proxy al p9:', error.response?.data || error.message);
        return NextResponse.json({ error: 'Error en el proxy al p9.' }, { status: 500 });
    };
}

export async function GET(req: NextRequest, contexto: { params: Promise<{ path: string[] }> }) { 
    return reenviarPeticion(req, contexto);
}

export async function POST(req: NextRequest, contexto: { params: Promise<{ path: string[] }> }) {
    return reenviarPeticion(req, contexto);
}
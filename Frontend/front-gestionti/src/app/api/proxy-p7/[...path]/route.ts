import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

async function reenviarPeticion(req: NextRequest, contexto:{ params: Promise<{ path: string[]}>}) {
    //console.log("AAAAAAAAANTES")
    try{
        const paramsResolved= await contexto.params;
        console.log("PARAMETROS", paramsResolved);
        const endpoint = paramsResolved.path.join('/');
        console.log("ENDPOINT: ", endpoint);
        //console.log("CONTEXTO", req);

        const baseUrl = process.env.NEXT_PUBLIC_API_URL_PROY7;
        const url = `${baseUrl}/${endpoint}?api_key=${process.env.NEXT_PUBLIC_API_KEY_PROY7}`;

        const axiosConfig: any = {
            method: req.method,
            url: url,
            headers: {
                'x-api-key': process.env.NEXT_PUBLIC_API_KEY_PROY7 || '',
                'Content-Type':'application/json',
            },
        };

        console.log("URL a la que se reenvía la petición:", url);
        console.log("Método de la petición:", req.method);

        let data = null;
        if (req.method !== 'GET' && req.method !== 'HEAD')
        {
            
            try{
                data = await req.json();
                console.log("DATA: ", data);
                axiosConfig.data = data;
            } catch (error) {
                console.error('Error al leer la solicitud: ', error);
            }
            
        }
        
        const respuesta = await axios(axiosConfig);

        return NextResponse.json(respuesta.data);
    } catch (error: any) {
        console.error('Error en el proxy al pro7: ', error.response?.data || error.message);
        return NextResponse.json(
            error.response?.data || { error: 'Error interno en el proxy al crm.'},
            {status: error.response?.status || 500}
        );
    }
}

export async function GET(req: NextRequest, contexto: { params: Promise<{path: string []}>}){
    return reenviarPeticion(req, contexto);
}

export async function POST(req: NextRequest, contexto: { params: Promise<{path: string []}>}){
    return reenviarPeticion(req, contexto);
}
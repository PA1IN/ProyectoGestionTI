import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export interface DetalleTransaccion {
    token: string;
    comercio: string;
    montoTotal: number;
    moneda: string;
    estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
    tarjeta: {
        marca: string | null;
        ultimosCuatro: string | null;
        expMonth?: number | null;
        expYear?: number | null;
    } | null;
    rrn?: number | null;
    tipoOperacion?: 'CIT' | 'MIT' | null;
    codigoAutorizacion?: string | null;
}

export interface DatosPagoTarjeta {
    numeroTarjeta: string;
    fechaExpiracion: string; //mm/aa
    cvv: string;
    titular?: string;
}

// obtiene los datos cuando el usuario accede a checkout
/*export function useDetalleTransaccion(token: string) {
    return useQuery<DetalleTransaccion>({
        queryKey: ['transaccion', token],
        queryFn: async () => {
            const respuesta = await api.get(`/pagos/checkout/${token}`);
            return respuesta.data;
        },
        enabled: !!token, // solo se ejecuta si hay un token valido
        retry: false, // en caso de error no reintentar la peticion
    })
}*/

export function useDetalleTransaccion(token: string) {
    return useQuery<DetalleTransaccion>({
        queryKey: ['transaccion', token],
        queryFn: async () => {
            const respuesta = await api.get(`/ucnpay/checkout/${token}`);
            return respuesta.data as DetalleTransaccion;
        },
        enabled: !!token,
        retry: false
    })
}

// realiza el proceso de pago al enviar los datos de la tarjeta
/*export function useProcesarPago(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async (datosTarjeta: DatosPagoTarjeta) => {
            //se envia los datos de la tarjeta junto con el token de transaccion en los headers para validar la transaccion
            const respuesta = await api.post('/pagos/procesar', datosTarjeta, {
                headers: {
                    'X-Transaction-Token': tokenTransaccion
                }
            });
            return respuesta.data;
        }
    })
}*/

export function useProcesarPago(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async (datosTarjeta: DatosPagoTarjeta) => {
            const respuesta = await api.post(
                `/ucnpay/checkout/${tokenTransaccion}/process`,
                datosTarjeta,
            );

            return respuesta.data as {
                status: 'APROBADO' | 'PENDIENTE' | 'RECHAZADO';
                message: string;
                redirectUrl: string;
                transactionId: string;
            };
        }
    });
}

// solicita el texto del qr al backend
export function useGenerarQr(tokenTransaccion: string) {
    return useQuery({
        queryKey: ['qrData', tokenTransaccion],
        queryFn: async () => {
            const respuesta = await api.get(`/ucnpay/checkout/${tokenTransaccion}/qr`);
            return respuesta.data;
        },
        enabled: !!tokenTransaccion,
        refetchOnWindowFocus: false, // no volver a ejecutar la consulta al cambiar de ventana
    }); 
}


export function useProcesarPagoQr(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async (tokenQr: string) => {
            const respuesta = await api.post(
                `/ucnpay/checkout/${tokenTransaccion}/process-qr`,
                { qrData:tokenQr }
            );
            return respuesta.data;
        }
    });
}



// pregunta al backend si el usuario ya escaneo y pago el qr
export function useConsultarEstadoPago(tokenTransaccion: string, activarPolling: boolean)
{
    return useQuery({
        queryKey: ['estadoPago', tokenTransaccion],
        queryFn: async () => {
            const respuesta = await api.get(`/ucnpay/checkout/${tokenTransaccion}`);
            return { estado: respuesta.data.estado as string };
        },
        enabled: activarPolling,
        refetchInterval: 2000,
    })
}
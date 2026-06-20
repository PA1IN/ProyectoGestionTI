import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export interface DetalleTransaccion {
    token: string;
    comercio: string;
    montoTotal: number;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    urlRetorno?: string; // url a la que se redirige al finalizar el proceso de pago
    codigoQr?: string; // url o datos para generar el código qr en caso de pago con billetera digital
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
            const respuesta = await api.get(`/pago/checkout/${token}`);
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
                '/pago/process',
                datosTarjeta,
                {
                    headers: {
                        'X-Transaction-Token': tokenTransaccion,
                    },
                },
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
/*export function useGenerarQr(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async () => {
            const respuesta = await api.post('/pagos/generar-qr', { metodo: 'billetera' }, { 
                headers: {
                    'X-Transaction-Token': tokenTransaccion
                }
             });
             return respuesta.data;
        }
    });
}*/


export function useGenerarQr(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async () => {
            const respuesta = await api.get(`/pago/checkout/${tokenTransaccion}`);
            return { qrData: respuesta.data.codigoQr as string };
        }
    });
}


// pregunta al backend si el usuario ya escaneo y pago el qr
/*export function useConsultarEstadoPago(tokenTransaccion: string, activarPolling: boolean) {
    return useQuery({
        queryKey: ['estadoPago', tokenTransaccion],
        queryFn: async () => {
            const respuesta = await api.get(`/pagos/estado/${tokenTransaccion}`);
            return respuesta.data;
        }
        enabled: activarPolling,    
        refetchInterval: 3000,
    })
}*/


export function useConsultarEstadoPago(tokenTransaccion: string, activarPolling: boolean)
{
    return useQuery({
        queryKey: ['estadoPago', tokenTransaccion],
        queryFn: async () => {
            const respuesta = await api.get(`/pago/checkout/${tokenTransaccion}`);
            return { estado: respuesta.data.estado as string };
        },
        enabled: activarPolling,
        
    })
}
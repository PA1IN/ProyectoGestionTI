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
    vencimiento: string; //mm/aa
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

// mock de funcion para obtener los detalles de la transaccion
export function useDetalleTransaccion(token: string) {
    return useQuery<DetalleTransaccion>({
        queryKey: ['transaccion', token],
        queryFn: async () => {
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        token: token,
                        comercio: 'Tienda de ejemplo',
                        montoTotal: 16000,
                        estado: 'pendiente',
                        urlRetorno: 'https://www.google.com',
                        codigoQr: `bancoapp://pay?transactionId=${token}&amount=16000&currency=CLP`
                    });
                }, 1500);
            });
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

// mock de funcion para procesar el pago
export function useProcesarPago(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async (datosTarjeta: DatosPagoTarjeta) => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Procesando pago con los siguientes datos:', datosTarjeta, 'y token de transaccion:', tokenTransaccion);
                    resolve({ success: true, message: 'Pago procesado exitosamente' });
                }, 2000);
            });
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


//mock de funcion para generar el qr
export function useGenerarQr(tokenTransaccion: string) {
    return useMutation({
        mutationFn: async () => {
            return new Promise<{ qrData: string }>((resolve) => {
                setTimeout(() => {
                    console.log(`Pidiendo Qr para el token: ${tokenTransaccion}`);
                    resolve({ qrData: `bancoapp://pay?transactionId=${tokenTransaccion}&amount=16000&currency=CLP` });
                }, 1500);
            });
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


//mock para revisar el estado del qr
export function useConsultarEstadoPago(tokenTransaccion: string, activarPolling: string)
{
    return useQuery({
        queryKey: ['estadoPago', tokenTransaccion],
        queryFn: async () => {
            return new Promise<{ estado: string}>((resolve) => {
                console.log("Consultando estado al banco...");
                resolve({ estado: 'pendiente'});
            });
        },
        
    })
}
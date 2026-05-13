import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export interface DetalleTransaccion {
    token: string;
    comercio: string;
    montoTotal: number;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
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
                        estado: 'pendiente'
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


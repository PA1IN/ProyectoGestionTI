import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export interface DetalleTransaccion {
    token: string;
    comercio: string;
    montoTotal: number;
    moneda: string;
    estado: 'APROBADO' | 'RECHAZADO' | 'PENDIENTE';
    returnUrl?: string;
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

export interface ComprobantePago {
    montoTotal: number;
    moneda: string;
    nombreComercio: string;
    fechaHora: string;
    numeroOrden:string;
    estado:string;
    codigoAutorizacion:string;
    metodoPago:string;
    ultimosCuatro:string;
}


export function useObtenerComprobante(transactionId:string | null) {
    return useQuery<ComprobantePago>({
        queryKey:['comprobante', transactionId],
        queryFn: async () => {
            const respuesta = await api.get(`/ucnpay/comprobante/${transactionId}`);
            return respuesta.data as ComprobantePago;
        },
        enabled:!!transactionId,
        retry:false
    });
}

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
                `/ucnpay/checkout/${tokenTransaccion}/process/qr`,
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
import { useMutation, useQuery } from "@tanstack/react-query";
import api from '../api/axios';

export interface ResumenDiscrepancia {
    id: number;
    rrn: number | null;
    tipo: string;
    estado: string;
}

export interface DetalleDiscrepancia extends ResumenDiscrepancia {
    monto_interno: number | null;
    monto_banco: number | null;
    fecha_conciliacion: string;
    archivo_id: string | null;
    resuelto_por: string | null;
    created_at: string;
    updated_at: string;
    diferencia_monto: number | null;
}

export interface ConciliationResponse {
    mensaje: string;
    archivo_id: string;
    fecha_hora: string;
    registros_banco: number;
    discrepancias_encontradas: number;
    discrepancias: ResumenDiscrepancia[];
}

export interface UploadPayload {
    archivo: File;
    fechaHora?: string;
    archivoId?: string;
}


export interface DiscrepanciaHistorial {
    id:number;
    rrn:number;
    id_transaccion:string;
    tipo:string;
    monto_interno:number;
    monto_banco:number;
    fecha_conciliacion: string;
    archivo_id: string;
    estado: 'ABIERTA' | 'CERRADA';
    resuelto_por: string | null;
    created_at: string;
    updated_at: string;
}

export function useSubirArchivoConciliacion() {
    return useMutation<ConciliationResponse, Error, UploadPayload>({
        mutationFn: async ({ archivo, fechaHora, archivoId }) => {
            const formData = new FormData();
            formData.append('archivo', archivo);
            formData.append('fecha_hora', fechaHora ?? new Date().toISOString());
            formData.append('archivo_id', archivoId ?? archivo.name);

            const respuesta = await api.post('/conciliacion/procesamiento/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return respuesta.data as ConciliationResponse;
        }
    });
}

export function useHistorialConciliaciones(){
    return useQuery<DiscrepanciaHistorial[]>({
        queryKey:['historialConciliaciones'],
        queryFn: async () => {
            const respuesta = await api.get('/conciliacion/discrepancias');
            return respuesta.data;
        }

    })
}

export interface CerrarDiscrepanciaPayload {
    estado?: string;
    resuelto_por?: string;
}


export function useDiscrepanciaPorRrn(rrn: number | null) {
    return useQuery<DetalleDiscrepancia>({
        queryKey: ['discrepancia', rrn],
        queryFn: async () => {
            if (rrn === null) {
                throw new Error('RRN inválido');
            }

            const respuesta = await api.get(`/conciliacion/discrepancias/${rrn}`);
            return respuesta.data as DetalleDiscrepancia;
        },
        enabled: rrn !== null,
    });
}

export function useCerrarDiscrepancia() {
    return useMutation<DetalleDiscrepancia, Error, { rrn: number; payload?: CerrarDiscrepanciaPayload }>({
        mutationFn: async ({ rrn, payload }) => {
            const respuesta = await api.patch(
                `/conciliacion/discrepancias/${rrn}`,
                {
                    ...payload
                },
            );

            return respuesta.data as DetalleDiscrepancia;
        }
    });
}
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

export interface RegistroHistorial {
    id: string;
    archivo_id: string;
    fecha_hora: string;
    registros_banco: number;
    discrepancias_encontradas: number;
    operador: string;
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

export function useHistorialConciliaciones() {
    return useQuery<RegistroHistorial[]>({
        queryKey: ['historialConciliaciones'],
        queryFn: async () => {
            // backend real:
            /*
            const respuesta = await api.get('/conciliacion/historial'); 
            return respuesta.data as RegistroHistorial[];
            */
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        { 
                            id: '101', 
                            fecha_hora: '2026-05-11T14:30:00Z', 
                            archivo_id: 'banco_estado_1105.csv', 
                            registros_banco: 450, 
                            discrepancias_encontradas: 2, 
                            operador: 'henrique gomez' 
                        },
                        { 
                            id: '102', 
                            fecha_hora: '2026-05-10T11:15:00Z', 
                            archivo_id: 'banco_estado_1005.csv', 
                            registros_banco: 380, 
                            discrepancias_encontradas: 0, 
                            operador: 'daniel soto' 
                        },
                        { 
                            id: '103', 
                            fecha_hora: '2026-05-09T09:00:00Z', 
                            archivo_id: 'banco_estado_0905.csv', 
                            registros_banco: 412, 
                            discrepancias_encontradas: 5, 
                            operador: 'juanito perez' 
                        },
                    ]);
                }, 1000);
            });
        }
    });
}

export interface CerrarDiscrepanciaPayload {
    estado?: string;
    resuelto_por?: string;
}

const USUARIO_SISTEMA_UUID = '00000000-0000-0000-0000-000000000000';

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
                payload ?? {
                    estado: 'CERRADA',
                    resuelto_por: USUARIO_SISTEMA_UUID,
                },
            );

            return respuesta.data as DetalleDiscrepancia;
        }
    });
}
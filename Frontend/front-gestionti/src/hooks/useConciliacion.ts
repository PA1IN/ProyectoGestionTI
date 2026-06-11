import { useMutation } from "@tanstack/react-query";
import api from '../api/axios';

export interface ConciliationResponse {
    mensaje: string;
    archivo_id: string;
    fecha_hora: string;
    registros_banco: number;
    discrepancias_encontradas: number;
}

export interface UploadPayload {
    archivo: File;
    fechaHora?: string;
    archivoId?: string;
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
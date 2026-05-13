import { useMutation, useQuery } from "@tanstack/react-query";
import api from '../api/axios';

export interface RegistroHistorial {
    id: string;
    fecha: string;
    nombreArchivo:string;
    totalTransacciones: number;
    diferencias:number;
    operador: string;
}

export function useHistorialConciliaciones(){
    return useQuery<RegistroHistorial[]>({
        queryKey: ['historialConciliaciones'],
        queryFn: async () => {
            //respuesta real backend ///
            /*
            const respuesta = await api.get('/conciliacion/historial'); 
            return respuesta.data;
            */
            //mock
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([
                        {id: '101', fecha: '2026-05-11', nombreArchivo: 'banco_estado_1105.csv', totalTransacciones: 450, diferencias: 2, operador: 'EF'},
                        { id: '102', fecha: '2026-05-10', nombreArchivo: 'banco_estado_1005.csv', totalTransacciones: 380, diferencias: 0, operador: 'EF (Automático)' },
                        { id: '103', fecha: '2026-05-09', nombreArchivo: 'banco_estado_0905.csv', totalTransacciones: 412, diferencias: 5, operador: 'David Ramos' },
                    ])
                }, 1000);

            });
        }
    });
}


export interface ResultadoConciliacion {
    id: string;
    transaccion: string;
    monto: number;
    estadoBancario: string;
    estadoInterno: string;
    coincidencia: boolean;
}

export function useSubirArchivoConciliacion() {
    return useMutation({
        mutationFn: async (archivo: File) => {
            //se prepara el archivo para enviarlo por http
            const formData = new FormData();
            formData.append('file', archivo);
            /*
            const respuesta = await api.post('/conciliacion/procesar', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            return respuesta.data as ResultadoConciliacion[];
            */
            //mock
            return new Promise<ResultadoConciliacion[]>((resolve) => {
                setTimeout(() => {
                    resolve([
                        { id: '1', transaccion: 'trans-9901', monto: 16050, estadoBancario: 'Aprobado', estadoInterno: 'Aprobado', coincidencia: true },
                        { id: '2', transaccion: 'trans-9902', monto: 12990, estadoBancario: 'Rechazado', estadoInterno: 'Aprobado', coincidencia: false },
                        { id: '3', transaccion: 'trans-9903', monto: 5000, estadoBancario: 'No encontrado', estadoInterno: 'Pendiente', coincidencia: false },
                        { id: '4', transaccion: 'trans-9904', monto: 25000, estadoBancario: 'Aprobado', estadoInterno: 'Aprobado', coincidencia: true },
                    ])
                }, 2500);
            });
        }
    });

}
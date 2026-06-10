import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/axios';

export interface KpiResumenHisto {
    volumenTransDiario: number;
    crecimientoVolumen: number;
    tasaRechazo: number;
    uptimeSLA: number;
}

export interface VolumenPorMetodoHisto {
    metodo: string;
    volumenTrans: number;
}

export interface DetalleReporteHisto {
    id_reporte: string;
    fecha: string;
    kpiResumen: KpiResumenHisto;
    volumenPorMetodo: VolumenPorMetodoHisto[];
}

export interface ReporteHistorico {
    id: string;
    fecha: string;
    tipo: string;
    estado: 'completo' | 'en_proceso' | 'fallido';
}


//obtiene los reportes historicos de la auditoria
export function useObtenerReportes() {
    return useQuery<ReporteHistorico[]>({
        queryKey: ['reportes_historicos'],
        refetchInterval: 3000,
        queryFn: async () => {
            /*
            const respuesta = await api.get('/auditoria/reportes');
            return respuesta.data;
            */

            return new Promise((resolve) => {
                setTimeout(() => {

                    resolve([
                        { id: '1', fecha: '2024-06-01T10:00:00Z', tipo: 'reporte_diario', estado: 'completo' },
                        { id: '2', fecha: '2024-06-02T10:00:00Z', tipo: 'reporte_diario', estado: 'en_proceso' },
                        { id: '3', fecha: '2024-06-03T10:00:00Z', tipo: 'reporte_diario', estado: 'fallido' }
                    ]);
                }, 800);
            });
        }
    });
}

export function obtenerDetalleReporteHistorico(id: string): Promise<DetalleReporteHisto> {
    /*
    const respuesta = await api.get(`/auditoria/reportes/${id}`);
    return respuesta.data;
    */

    return new Promise((resolve) => {
        setTimeout(() => {
            let fechaDocumento = '2024-06-01T10:00:00Z';
            if(id === '2'){
                fechaDocumento = '2024-06-02T10:00:00Z';
            } 
            if(id === '3'){
                fechaDocumento = '2024-06-03T10:00:00Z';
            }

            resolve({
                id_reporte: id,
                fecha: fechaDocumento,
                kpiResumen: {
                    volumenTransDiario: id === '1' ? 14200 : (id === '2' ? 15000 : 12500),
                    crecimientoVolumen: id === '1' ? 8.4 : (id === '2' ? 5.6 : -1.2),
                    tasaRechazo: id === '1' ? 1.9 : (id === '2' ? 3.2 : 4.5),
                    uptimeSLA: id === '1' ? 99.99 : (id === '2' ? 99.98 : 99.10)
                },
                volumenPorMetodo: [
                    { metodo: 'Tarjetas Debito', volumenTrans: id === '1' ? 9200 : 10000},
                    { metodo: 'Billeteras Qr', volumenTrans: id === '1' ? 5000 : 5000}
                ]
            });
        }, 300);
    });
}

//solicita la generacion de un nuevo reporte
export function useGenerarReporte() {
    const clienteQuery = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            /*
            const respuesta = await api.post('/auditoria/reportes/generar');
            return respuesta.data;
            */
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log("peticion enviada para generar reporte");
                    resolve({ success: true});
                }, 2000);
            });
        },
        onSuccess: () => {
            clienteQuery.invalidateQueries({ queryKey: ['reportes_historicos'] });
        }
    });
}
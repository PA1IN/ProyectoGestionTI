import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiProy9 } from '@/api/axiosProy9';
import { useAuth } from '@/context/AuthContext';

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
    const { autenticado } = useAuth();
    return useQuery<ReporteHistorico[]>({
        queryKey: ['reportes_historicos'],
        queryFn: async () => {
            
            const respuesta = await apiProy9.get('/auditoria/reportes');
            return respuesta.data;
        },
        enabled: autenticado,
        refetchInterval: 15000
    });
}

export async function obtenerDetalleReporteHistorico(id: string): Promise<DetalleReporteHisto> {
    
    const respuesta = await apiProy9.get(`/auditoria/reportes/${id}`);
    return respuesta.data;
    
}

//solicita la generacion de un nuevo reporte
export function useGenerarReporte() {
    const clienteQuery = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            
            const respuesta = await apiProy9.post('/auditoria/reportes/generar');
            return respuesta.data;
            
        },
        onSuccess: () => {
            clienteQuery.invalidateQueries({ queryKey: ['reportes_historicos'] });
        }
    });
}
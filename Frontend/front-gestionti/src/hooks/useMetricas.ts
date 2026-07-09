import { useQuery } from '@tanstack/react-query';
import { apiProy9} from '@/api/axiosProy9';
import { useAuth } from '@/context/AuthContext';

export interface KPIResumen {
    volumenTransDiario: number;
    crecimientoVolumen: number;
    tasaRechazo: number;
    uptimeSLA: number;
}

export interface TransaccionDiaria {
    hora: string;
    exitosas: number;
    rechazadas: number;
}

export interface VolumenPorMetodo {
    metodo: string;
    volumenTrans: number;
}

export interface DashboardMetricas {
    kpiResumen: KPIResumen;
    transaccionesDiarias: TransaccionDiaria[];
    volumenPorMetodo: VolumenPorMetodo[];
}

export function useObtenerMetricas() {
    const { autenticado } = useAuth();
    return useQuery<DashboardMetricas>({
        queryKey: ['dashboardMetricas'],
        queryFn: async () => {
            
            const respuesta = await apiProy9.get('/analitica/dashboard');
            console.log("respuesta metricas", respuesta.data);
            return respuesta.data;
            
        },
        enabled: autenticado,
        refetchInterval: 15000, 
    });
}
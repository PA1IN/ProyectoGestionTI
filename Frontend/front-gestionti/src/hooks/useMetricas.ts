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
            
           /*
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        kpiResumen: {
                            volumenTransDiario: 15000,
                            crecimientoVolumen: 12.5,
                            tasaRechazo: 3.2,
                            uptimeSLA: 99.98
                        },
                        transaccionesDiarias: [
                            { hora: '08:00', exitosas: 120, rechazadas: 5 },
                            { hora: '09:00', exitosas: 250, rechazadas: 15 },
                            { hora: '12:00', exitosas: 350, rechazadas: 365 }
                        ],
                        volumenPorMetodo: [
                            { metodo: 'Tarjetas Debito', volumenTrans: 10000 },
                            { metodo: 'Billeteras QR', volumenTrans: 5000 }
                        ]
                    });
                },800);
             });
            */
        },
        enabled: autenticado,
        refetchInterval: 15000, 
    });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export interface Alerta {
    id: string;
    fecha: string;
    tipo: string;
    descripcion: string;
    nivel: 'Alto' | 'Medio' | 'Bajo';
    estado: 'Pendiente' | 'Resuelto';
}


let mockAlertas: Alerta[] = [
    { id: 'ALR-001', fecha: '2026-05-13 08:30', tipo: 'Diferencia de Conciliación', descripcion: 'Transacción TRX-9903 no encontrada en los registros del banco.', nivel: 'Alto', estado: 'Pendiente' },
    { id: 'ALR-002', fecha: '2026-05-12 15:45', tipo: 'Reintento Sospechoso', descripcion: 'Múltiples intentos fallidos (5+) para la tarjeta terminada en 4312.', nivel: 'Medio', estado: 'Pendiente' },
    { id: 'ALR-003', fecha: '2026-05-12 10:15', tipo: 'Falla de Proveedor', descripcion: 'Caída de conexión temporal con Sistema Bancario Simulado (Timeout).', nivel: 'Alto', estado: 'Resuelto' },
    { id: 'ALR-004', fecha: '2026-05-11 11:20', tipo: 'Inconsistencia de Monto', descripcion: 'Monto cobrado ($15.000) difiere de la orden original ($16.050) en TRX-8842.', nivel: 'Alto', estado: 'Pendiente' },
]

//traer las alertas del backend
export function useObtenerAlertas(){
    return useQuery<Alerta[]>({
        queryKey: ['alertas'],
        queryFn: async () => {
            /*
            const respuesta = await api.get('/auditoria/alertas');
            return respuesta.data;
            */

            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve([...mockAlertas]);
                }, 800);
            });
        }
    });
}

//marcar alerta como resuelta
export function useResolverAlerta() {
    const clienteQuery = useQueryClient();

    return useMutation({
        mutationFn: async (idAlerta: string) => {
            /*
            const respuesta = await api.patch(`/auditoria/alertas/${idAlerta}`, { estado: 'Resuelto' });
            return respuesta.data;
            */

            return new Promise((resolve) => {
                setTimeout(()=> {
                    mockAlertas = mockAlertas.map(alerta => 
                        alerta.id === idAlerta ? { ...alerta, estado: 'Resuelto'}: alerta
                    );
                    resolve({ success: true });
                }, 500);
            });
        },
        onSuccess: () => {
            clienteQuery.invalidateQueries({ queryKey: ['alertas']});
        }
    });
}
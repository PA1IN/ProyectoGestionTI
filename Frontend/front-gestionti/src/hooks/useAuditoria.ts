import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';

export interface Alerta {
    id: string;
    fecha: string;
    tipo: string;
    descripcion: string;
    nivel: 'Alto' | 'Medio' | 'Bajo';
    revisado: boolean;
}

//traer las alertas del backend
export function useObtenerAlertas(revisado?: boolean | null){
    return useQuery<Alerta[]>({
        queryKey: ['alertas', revisado ?? 'all'],
        queryFn: async () => {
            try {
                const respuesta = await api.get('/analitica/alertas', {
                    params: revisado === null || revisado === undefined ? undefined : { revisado },
                });

                return respuesta.data as Alerta[];
            } catch (error) {
                console.error('Error al obtener alertas historicas', error);
                throw error;
            }
        }
    });
}

//marcar alerta como resuelta
export function useResolverAlerta() {
    const clienteQuery = useQueryClient();

    return useMutation({
        mutationFn: async (idAlerta: string) => {
            try {
                const respuesta = await api.patch(`/analitica/alertas/${idAlerta}/revisar`);
                return respuesta.data as Alerta;
            } catch (error) {
                console.error('Error al revisar la alerta', error);
                throw error;
            }
        },
        onSuccess: () => {
            clienteQuery.invalidateQueries({ queryKey: ['alertas']});
        }
    });
}
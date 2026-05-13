import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from '../api/axios';

export interface ConfiguracionReintentos { 
    reintentosActivos: boolean;
    maxIntentos: number;
    intervalo: number;
    erroresAplicables: {
        timout: boolean;
        fondosInsuficientes: boolean;
        fallaRed: boolean;
        rechazoBanco: boolean;
    };
}

//obtiene la config desde el back
export function useObtenerConfiguracion() {
    return useQuery<ConfiguracionReintentos>({
        queryKey: ['configuracion_reintentos'],
        queryFn: async () => {
            /*
            const respuesta = await api.get('/configuracion/reintentos');
            return respuesta.data;
            */
           
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        reintentosActivos: true,
                        maxIntentos: 3,
                        intervalo: 5,
                        erroresAplicables: {
                            timout: true,
                            fondosInsuficientes: false,
                            fallaRed: true,
                            rechazoBanco: false
                        }
                    });
                }, 800);
            });
        }
    });
}

//guarda los cambios realizados por el user
export function useGuardarConfiguracion() {
    const clienteQuery = useQueryClient();

    return useMutation({
        mutationFn: async (nuevaConfig: ConfiguracionReintentos) => {
            /*
            const respuesta = await api.put('/configuracion/reintentos', nuevaConfig);
            return respuesta.data;
            */

            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log("peticion enviada con exito", nuevaConfig);
                    resolve({ success: true});
                }, 1000);
            });
        },
        onSuccess: () => {
            clienteQuery.invalidateQueries({ queryKey: ['configuracion_reintentos']});
        }
    });
}
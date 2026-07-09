import { useMutation } from "@tanstack/react-query";
import { apiProy7 } from "../api/axiosProy7";

export interface TicketPayload{
    asunto: string;
    descripcion: string;
    prioridad: string;
    sistema_origen: string;
    sistema_id: string;
    cliente_nombre: string;
    cliente_email: string;
    pago_id_ref: string;
}

export function useCrearTicket() {
    return useMutation({
        mutationFn: async (datosTicket: TicketPayload) => {
            const respuesta = await apiProy7.post('/tickets/externo', datosTicket);
            return respuesta.data;
        }
    });
}

export function useEstadoTicket(){
    return useMutation({
        mutationFn: async (ticketId: string) => {
            const respuesta = await apiProy7.get(`/tickets/externo/${ticketId}`)
            return respuesta.data;
        }
    })
}
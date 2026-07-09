"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Ticket, Search, Plus, Loader2, AlertCircle, Clock, CheckCircle2, User } from 'lucide-react';
import { useEstadoTicket } from '@/hooks/useCrm';

export default function TicketsDashboardPage() {
    const estadoTicket = useEstadoTicket();
    const [busquedaId, setBusquedaId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [ticket, setTicket] = useState<any>(null);
    
    const buscarTicket = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!busquedaId.trim())
        {
            return;
        }

        setError(null);
        setTicket(null);

        try {
            const data = await estadoTicket.mutateAsync(busquedaId.trim());

            if (data.ok)
            {
                setTicket(data.ticket);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ticket no encontrado o error de conexión.');
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-indigo-600" />
                        Soporte y Tickets CRM
                    </h1>
                    <p className="text-gray-500 mt-1">Consulta el estado de los incidentes reportados.</p>
                </div>
                <Link href="/dashboard/tickets/nuevo" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl transition-colors flex items-center gap-2 shadow-sm">
                    <Plus className="w-5 h-5" />
                    Nuevo Ticket
                </Link>
            </div>

            <form onSubmit={buscarTicket} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Rastrear Ticket</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input 
                            type="text" 
                            value={busquedaId}
                            onChange={(e) => setBusquedaId(e.target.value)}
                            placeholder="Ingresa el ID del ticket (ej. a1b2c3d4-...)" 
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>
                <button type="submit" disabled={estadoTicket.isPending || !busquedaId.trim()} className="w-full sm:w-auto bg-gray-900 text-white font-bold py-3 px-8 rounded-xl transition-colors hover:bg-gray-800 disabled:opacity-50 flex justify-center items-center h-[50px]">
                    {estadoTicket.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
                </button>
            </form>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
                    <p className="font-bold">{error}</p>
                    <p className="text-sm mt-1 opacity-80">Verifica que el ID esté correcto y vuelve a intentar.</p>
                </div>
            )}

            {ticket && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-6 border-b flex justify-between items-center ${ticket.estado === 'resuelto' || ticket.estado === 'cerrado' ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2
                                ${ticket.estado === 'resuelto' || ticket.estado === 'cerrado' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                                {ticket.estado === 'resuelto' || ticket.estado === 'cerrado' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                Estado: {ticket.estado}
                            </span>
                            <h2 className="text-xl font-bold text-gray-900">{ticket.asunto}</h2>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-500 font-bold uppercase">Prioridad</p>
                            <p className={`text-sm font-bold capitalize ${ticket.prioridad === 'critica' ? 'text-red-600' : 'text-indigo-600'}`}>
                                {ticket.prioridad}
                            </p>
                        </div>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-gray-500">Cliente</p>
                                    <p className="font-medium text-gray-900">{ticket.cliente_nombre}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Ticket className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-gray-500">ID de Pago Asociado</p>
                                    <p className="font-medium text-gray-900">{ticket.pago_id_ref}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-bold text-gray-500 mb-1">Fecha de Creación</p>
                                <p className="font-medium text-gray-900">
                                    {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.creado_en))}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-500 mb-1">Vencimiento SLA</p>
                                <p className="font-medium text-gray-900">
                                    {new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ticket.fecha_vencimiento_sla))}
                                </p>
                            </div>
                        </div>
                    </div>

                    {ticket.resolucion && (
                        <div className="p-6 bg-gray-50 border-t border-gray-200">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2">Resolución del Equipo</h3>
                            <p className="text-gray-700 bg-white p-4 rounded-xl border border-gray-200">
                                {ticket.resolucion}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
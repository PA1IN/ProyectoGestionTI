"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Ticket, Send, Loader2, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';
import { useCrearTicket } from '../../../../hooks/useCrm';

export default function NuevoTicketPage() {
    const crearTicket = useCrearTicket();
    const [error, setError] = useState<string | null>(null);
    const [ticketCreado, setTicketCreado] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        asunto: '',
        descripcion: '',
        prioridad: 'media',
        cliente_nombre: '',
        cliente_email: '',
        pago_id_ref: ''
    });

    const handleCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value});
    };

    const handleEnviar = async (e: React.SyntheticEvent) => {
        e.preventDefault();
        setError(null);

        try{ 
            const payload = {
                ...formData,
                sistema_origen: "pagos",
                sistema_id: "P04"
            };

            const data = await crearTicket.mutateAsync(payload);
            if (data.ok) {
                setTicketCreado(data.ticket.id);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error al conectar con el crm');
        }
    };

    if (ticketCreado)
    {
        return (
            <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl border border-emerald-200 shadow-sm text-center animate-in zoom-in duration-500">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="w-16 h-16 text-emerald-500"/>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Ticket Creado con Éxito!</h2>
                <p className="text-gray-600 mb-6">El equipo de soporte ha recibido la solicitud.</p>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-8 inline-block text-left">
                    <p className="text-sm text-gray-500">ID del Ticket:</p>
                    <p className="font-mono font-bold text-indigo-600">{ticketCreado}</p>
                </div>
                <div className="flex justify-center gap-4">
                    <Link href="/dashboard/tickets" className="text-indigo-600 hover:bg-indigo-50 font-bold py-2 px-6 rounded-xl transition-colors">
                        Ver estado del ticket
                    </Link>
                    <button onClick={() => { setTicketCreado(null); setFormData({...formData, asunto: '', descripcion: ''}); }} className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-2 px-6 rounded-xl transition-colors">
                        Crear otro ticket
                    </button>
                </div>
            </div>
        );
        
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/dashboard/tickets" className="p-2 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Ticket className="w-6 h-6 text-indigo-600" />
                        Crear Nuevo Ticket
                    </h1>
                    <p className="text-gray-500 mt-1">Generar una solicitud de soporte en el CRM.</p>
                </div>
            </div>

            <form onSubmit={handleEnviar} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Datos del Cliente</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                            <input required type="text" name="cliente_nombre" value={formData.cliente_nombre} onChange={handleCambio} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Ej. María González" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                            <input required type="email" name="cliente_email" value={formData.cliente_email} onChange={handleCambio} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="maria@email.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID de Pago / Transacción *</label>
                            <input required type="text" name="pago_id_ref" value={formData.pago_id_ref} onChange={handleCambio} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="PAGO-55555" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider border-b pb-2">Detalle del Problema</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad *</label>
                            <select required name="prioridad" value={formData.prioridad} onChange={handleCambio} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                                <option value="baja">Baja</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                                <option value="critica">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
                            <input required type="text" name="asunto" value={formData.asunto} onChange={handleCambio} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" placeholder="Ej. Cargo duplicado" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea name="descripcion" value={formData.descripcion} onChange={handleCambio} rows={4} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none" placeholder="Detalla el problema aquí..." />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                    <button type="submit" disabled={crearTicket.isPending} className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl transition-colors hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
                        {crearTicket.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        {crearTicket.isPending ? 'Enviando...' : 'Crear Ticket'}
                    </button>
                </div>
            </form>
        </div>
    );
}
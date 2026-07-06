"use client"; 
import React, { useMemo, useState } from 'react';
import { BellRing, AlertTriangle, ShieldAlert, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useObtenerAlertas, useResolverAlerta } from '@/hooks/useAuditoria';
import axios from 'axios';

export default function AlertasPage() {
    const [filtroRevisado, setFiltroRevisado] = useState<'Todas' | 'Pendientes'>('Pendientes');

    const filtroBackend = filtroRevisado === 'Pendientes' ? false : null;
    const {data: alertas, isLoading, error } = useObtenerAlertas(filtroBackend);
    const resolverAlerta = useResolverAlerta();

    const marcarResuelta = async (id: string) => {
        try {
            await resolverAlerta.mutateAsync(id);
        } catch (err) {
            console.error("Error al cambiar el estado de la alerta", err);
        }
    };

    const getIconoNivel = (nivel:string) => {
        if(nivel === 'Alto') return <ShieldAlert className="w-5 h-5 text-red-500"/>
        if(nivel === 'Medio') return <AlertTriangle className="w-5 h-5 text-amber-500"/>
        return <BellRing className="w-5 h-5 text-blue-500" />;
    };

    const mensajeError = useMemo(() => {
        if (!error) {
            return null;
        }

        if (axios.isAxiosError(error)) {
            return error.response ? 'Error en el servidor al obtener las alertas.' : 'Error de red al obtener las alertas.';
        }

        return 'Error en el servidor al obtener las alertas.';
    }, [error]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
                <p>Cargando registros de auditoria...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-red-700 font-medium">
                {mensajeError ?? 'Error en el servidor al obtener las alertas.'}
            </div>
        );
    }

    const alertasVisibles = alertas ?? [];

    return(
        <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <BellRing className="w-7 h-7 text-indigo-600"/>
                        Centro de Alertas
                    </h1>
                    <p className="text-gray-500 mt-2 max-w-2xl">
                        Monitoreo de inconsistencias, diferencias de conciliación y comportamientos anomalos detectados por el sistema de auditoría.
                    </p>
                </div>

                <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm w-fit">
                    {(['Pendientes', 'Todas'] as const).map(estado => (
                        <button
                            key={estado}
                            onClick={() => setFiltroRevisado(estado)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                                filtroRevisado === estado 
                                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {estado}
                        </button>
                    ))}
                </div>
            </div>

            {mensajeError && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700 font-medium">
                    {mensajeError}
                </div>
            )}

            <div className="space-y-4">
                {alertasVisibles.length === 0 ? (
                    <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center border-dashed">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3"/>
                        <h3 className="text-lg font-bold text-gray-900">Todo en orden</h3>
                        <p className="text-gray-500">No hay alertas en esta categoría en este momento.</p>
                    </div>

                ) : (
                    alertasVisibles.map((alerta) => (
                        <div
                            key={alerta.id}
                            className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row md:items-center gap-6 transition-all ${
                                alerta.revisado ? 'border-gray-200 opacity-60' : 
                                alerta.nivel === 'Alto' ? 'border-red-200 hover:border-red-300' : 'border-amber-200 hover:border-amber-300'
                            }`}                        
                        >
                            <div className={`p-4 rounded-full flex-shrink-0 ${alerta.revisado ? 'bg-gray-100' : alerta.nivel === 'Alto' ? 'bg-red-50' : 'bg-amber-50'}`}>
                                {getIconoNivel(alerta.revisado ? 'Bajo' : alerta.nivel)}
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-xs font-black uppercase tracking-wider text-gray-400">{alerta.id}</span>
                                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                        <Clock className="w-3 h-3"/> {alerta.fecha}
                                    </span>
                                </div>
                                <h3 className={`text-base font-bold mb-1 ${alerta.revisado ? 'text-gray-700 line-through' : 'text-gray-900'}`}>
                                    {alerta.tipo}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {alerta.descripcion}
                                </p>
                            </div>

                            <div className="flex-shrink-0 flex flex-col sm:flex-row md:flex-col gap-2">
                                {!alerta.revisado ? (
                                    <>
                                        <button
                                            onClick={() => marcarResuelta(alerta.id)}
                                            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4"/> Marcar Resuelta
                                        </button>
                                    </>
                                ) : (
                                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl">
                                        <CheckCircle2 className="w-4 h-4"/> Auditada
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
        
    )
}
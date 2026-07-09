"use client";

import React, { useState } from 'react';
import { useHistorialConciliaciones } from '@/hooks/useConciliacion';
import { Search, Calendar, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export function HistorialConciliaciones() {
    const { data: historial, isLoading, isError } = useHistorialConciliaciones();
    const [filtroArchivo, setFiltroArchivo] = useState('');
    const [filtroFecha, setFiltroFecha] = useState('');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
                <p className="font-medium animate-pulse">Cargando historial...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl flex items-center gap-3 border border-red-200">
                <AlertCircle className="w-6 h-6" />
                <p className="font-bold">Error al cargar el historial de discrepancias.</p>
            </div>
        );
    }

    const discrepanciasFiltradas = historial?.filter(item => {
        const matchArchivo = item.archivo_id.toLowerCase().includes(filtroArchivo.toLowerCase());
        
        const fechaItem = item.fecha_conciliacion.split('T')[0];
        const matchFecha = filtroFecha ? fechaItem === filtroFecha : true;

        return matchArchivo && matchFecha;
    }) || [];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Buscar por Archivo</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Ej. conciliacion_temporal.csv"
                            value={filtroArchivo}
                            onChange={(e) => setFiltroArchivo(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400"
                        />
                    </div>
                </div>
                <div className="md:w-64">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Filtrar por Fecha</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={filtroFecha}
                            onChange={(e) => setFiltroFecha(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm text-gray-900"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">ID Conciliación</th>
                                <th className="px-6 py-4">Tipo Diferencia</th>
                                <th className="px-6 py-4">Archivo</th>
                                <th className="px-6 py-4">Fecha</th>
                                <th className="px-6 py-4 text-right">Interno / Banco</th>
                                <th className="px-6 py-4">Resuelto Por</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {discrepanciasFiltradas.length > 0 ? (
                                discrepanciasFiltradas.map((disc) => (
                                    <tr key={disc.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{disc.id}</div>
                                            <div className="text-xs text-gray-400">RRN: {disc.rrn}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-700">
                                            {disc.tipo.replace(/_/g, ' ')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{disc.archivo_id}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Intl.DateTimeFormat('es-CL').format(new Date(disc.fecha_conciliacion))}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="font-bold text-indigo-600">Interno: ${disc.monto_interno}</div>
                                            <div className="text-bold text-gray-600">Bancario: ${disc.monto_banco ? 0 : '0'}</div> {/*modificar*/}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {disc.resuelto_por ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase">
                                                            {disc.resuelto_por.charAt(0)}
                                                        </div>
                                                        <span className="text-gray-700 font-medium capitalize">{disc.resuelto_por.split('@')[0]}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-bold">Pendiente</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                                disc.estado === 'ABIERTA' 
                                                    ? 'bg-amber-100 text-amber-700' 
                                                    : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {disc.estado === 'ABIERTA' ? <Clock className="w-3 h-3"/> : <CheckCircle2 className="w-3 h-3"/>}
                                                {disc.estado}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No se encontraron discrepancias con los filtros actuales.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
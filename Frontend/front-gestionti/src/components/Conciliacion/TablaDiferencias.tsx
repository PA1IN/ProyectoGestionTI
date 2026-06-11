import React from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Hash } from 'lucide-react';
import { ProcesamientoConciliacionResponse } from '@/hooks/useConciliacion';

interface TablaDiferenciasProps {
    resultado: ProcesamientoConciliacionResponse;
}

export const TablaDiferencias = ({ resultado }: TablaDiferenciasProps) => {
    const hayDiferencias = resultado.discrepancias_encontradas > 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    Resultado del procesamiento
                </h2>
                <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${hayDiferencias ? 'text-amber-700 bg-amber-100' : 'text-emerald-700 bg-emerald-100'}`}>
                    {hayDiferencias ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    {hayDiferencias ? 'Revisión requerida' : 'Sin diferencias'}
                </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2 p-6">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Archivo</p>
                    <p className="mt-2 font-medium text-gray-900">{resultado.archivo_id}</p>
                    <p className="mt-1 text-sm text-gray-500">Procesado el {new Date(resultado.fecha_hora).toLocaleString('es-CL')}</p>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mensaje</p>
                    <p className="mt-2 text-sm text-gray-700">{resultado.mensaje}</p>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Registros del banco</p>
                    <div className="mt-2 flex items-center gap-2 text-2xl font-black text-gray-900">
                        <Hash className="w-5 h-5 text-indigo-600" />
                        {resultado.registros_banco}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Discrepancias encontradas</p>
                    <div className={`mt-2 flex items-center gap-2 text-2xl font-black ${hayDiferencias ? 'text-amber-600' : 'text-emerald-600'}`}>
                        <AlertTriangle className="w-5 h-5" />
                        {resultado.discrepancias_encontradas}
                    </div>
                </div>
            </div>
        </div>
    )
}
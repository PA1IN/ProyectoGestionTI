import React from 'react';
import { History, FileCheck, AlertCircle } from 'lucide-react';
import { useHistorialConciliaciones } from '@/hooks/useConciliacion';

export const HistorialConciliaciones = () => {
    const { data: historial, isLoading } = useHistorialConciliaciones();
    if (isLoading) {
        return <div className="text-center text-sm text-gray-500 py-8 animate-pulse">Cargando registros de Conciliaciones...</div>
    }

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mt-8 animate-in fade-in duration-500">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500"/>
                Historial de Conciliaciones
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 rounded-tl-lg">Fecha</th>
                            <th className="px-6 py-4">Archivo</th>
                            <th className="px-6 py-4">Transacciones</th>
                            <th className="px-6 py-4">Diferencias</th>
                            <th className="px-6 py-4 rounded-tr-lg">Operador</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {historial?.map((registro) => (
                            <tr key={registro.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{registro.fecha}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-emerald-500"/>
                                    {registro.nombreArchivo}
                                </td>
                                <td className="px-6 py-4 font-mono">{registro.totalTransacciones}</td>
                                <td className="px-6 py-4">
                                    {registro.diferencias > 0 ? (
                                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md text-xs font-bold w-fit">
                                            <AlertCircle className="w-3 h-3"/> {registro.diferencias}
                                        </span>
                                    ): (
                                        <span className="text-emerald-600 font-bold text-xs">0</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">{registro.operador}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
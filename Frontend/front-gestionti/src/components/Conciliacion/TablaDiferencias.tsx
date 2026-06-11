import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Hash } from 'lucide-react';
import { ModalDetalleDiferencia } from './ModalDetalleDiferencia';
import { ConciliationResponse, ResumenDiscrepancia } from '@/hooks/useConciliacion';

interface TablaDiferenciasProps {
    resultado: ConciliationResponse;
}

export const TablaDiferencias = ({ resultado }: TablaDiferenciasProps) => {
    const [discrepanciaSeleccionada, setDiscrepanciaSeleccionada] = useState<ResumenDiscrepancia | null>(null);
    const [esModalAbierto, setEsModalAbierto] = useState(false);
    const [resultadoLocal, setResultadoLocal] = useState<ConciliationResponse>(resultado);

    useEffect(() => {
        setResultadoLocal(resultado);
    }, [resultado]);

    const resultadoBackend = resultado as unknown as Record<string, unknown>;
    const archivoId = String(resultadoBackend['archivoId'] ?? resultadoBackend['archivo_id'] ?? '');
    const fechaHora = String(resultadoBackend['fechaHora'] ?? resultadoBackend['fecha_hora'] ?? '');
    const mensaje = String(resultadoBackend['mensaje'] ?? '');
    const registrosBanco = Number(resultadoBackend['registrosBanco'] ?? resultadoBackend['registros_banco'] ?? 0);
    const discrepanciasEncontradas = Number(
        resultadoBackend['discrepanciasEncontradas'] ?? resultadoBackend['discrepancias_encontradas'] ?? 0,
    );
    const listaResultados: ResumenDiscrepancia[] = (resultadoBackend['discrepancias'] ?? []) as ResumenDiscrepancia[];
    const hayDiferencias = discrepanciasEncontradas > 0;

    const handleDiscrepanciaCerrada = (discrepanciaCerrada: ResumenDiscrepancia) => {
        setResultadoLocal((actual) => ({
            ...actual,
            discrepancias: actual.discrepancias.map((item) =>
                item.id === discrepanciaCerrada.id ? { ...item, estado: discrepanciaCerrada.estado } : item,
            ),
        }));
    };

    const handleRevisarAlerta = (item: ResumenDiscrepancia) => {
        setDiscrepanciaSeleccionada(item);
        setEsModalAbierto(true);
    };

    return (
        <>
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
                <div className="grid gap-4 md:grid-cols-2 p-6 border-b border-gray-100">
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Archivo procesado</p>
                        <p className="mt-2 font-medium text-gray-900">{archivoId}</p>
                        <p className="mt-1 text-sm text-gray-500">
                            Procesado el {fechaHora ? new Date(fechaHora).toLocaleString('es-CL') : ''}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Mensaje</p>
                        <p className="mt-2 text-sm text-gray-700">{mensaje}</p>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Registros del banco</p>
                        <div className="mt-2 flex items-center gap-2 text-2xl font-black text-gray-900">
                            <Hash className="w-5 h-5 text-indigo-600" />
                            {registrosBanco}
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Discrepancias encontradas</p>
                        <div className={`mt-2 flex items-center gap-2 text-2xl font-black ${hayDiferencias ? 'text-amber-600' : 'text-emerald-600'}`}>
                            <AlertTriangle className="w-5 h-5" />
                            {resultadoLocal.discrepancias.filter((item) => item.estado === 'ABIERTA').length}
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">RRN</th>
                                <th className="px-6 py-4">Tipo</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {resultadoLocal.discrepancias.map((item, index: number) => (
                                <tr key={item.id ?? index} className={item.estado === 'ABIERTA' ? 'bg-amber-50/50' : ''}>
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{item.id}</td>
                                    <td className="px-6 py-4 font-mono">{item.rrn ?? '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md text-xs font-bold text-red-700">
                                            {item.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.estado === 'CERRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {item.estado}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.rrn !== null && (
                                            <button
                                                onClick={() => handleRevisarAlerta(item)} 
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                                                Ver detalle
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {listaResultados.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-6 text-sm text-gray-400 italic">
                                        No hay transacciones detalladas para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <ModalDetalleDiferencia
                abierto={esModalAbierto}
                cerrado={() => setEsModalAbierto(false)}
                rrn={discrepanciaSeleccionada?.rrn ?? null}
                onDiscrepanciaCerrada={handleDiscrepanciaCerrada}
            />
        </>
    );
};
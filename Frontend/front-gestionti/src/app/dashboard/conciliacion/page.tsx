"use client";
import React, { useState } from 'react';
import { DropArchivos } from '@/components/Conciliacion/DropArchivos';
import { FileSpreadsheet, History, UploadCloud } from 'lucide-react';
import { TablaDiferencias } from '@/components/Conciliacion/TablaDiferencias';
import { ConciliationResponse } from '@/hooks/useConciliacion';
import { HistorialConciliaciones } from '@/components/Conciliacion/HistorialConciliaciones';

export default function ConciliacionPage() {
    const [vistaActiva, setVistaActiva] = useState<'nueva' | 'historial'>('nueva');
    const [resultadoConciliacion, setResultadoConciliacion] = useState<ConciliationResponse | null>(null);

    const handleArchivoProcesado = (datos: ConciliationResponse) => {
        setResultadoConciliacion(datos);
    };

    const handleLimpiarVista = () => {
        setResultadoConciliacion(null);
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
                    Conciliación Bancaria
                </h1>
                <p className="text-gray-500 mt-2">
                    Gestiona la verificación de transacciones y revisa el historial de discrepancias financieras detectadas.
                </p>
            </div>

            <div className="flex gap-6 border-b border-gray-200 mb-8">
                <button
                    onClick={() => setVistaActiva('nueva')}
                    className={`pb-4 flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${
                        vistaActiva === 'nueva' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <UploadCloud className="w-4 h-4" />
                    Nueva Conciliación
                </button>
                <button
                    onClick={() => setVistaActiva('historial')}
                    className={`pb-4 flex items-center gap-2 text-sm font-bold border-b-2 transition-all ${
                        vistaActiva === 'historial' 
                            ? 'border-indigo-600 text-indigo-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                >
                    <History className="w-4 h-4" />
                    Historial de Discrepancias
                </button>
            </div>

            <div className={vistaActiva === 'nueva' ? "animate-in slide-in-from-left-4 duration-300 block" : "hidden"}>
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6">
                        Ingesta de Archivo Bancario
                    </h2>
                    <DropArchivos 
                        onArchivoProcesado={handleArchivoProcesado} 
                        onLimpiar={handleLimpiarVista} 
                    />
                </div>

                {resultadoConciliacion ? (
                    <TablaDiferencias resultado={resultadoConciliacion} />
                ) : (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mt-8 text-center">
                        <p className="text-sm text-gray-500">
                            Sube un archivo CSV para ejecutar la conciliación y ver el resumen devuelto por el backend.
                        </p>
                    </div>
                )}
            </div>

            <div className={vistaActiva === 'historial' ? "animate-in slide-in-from-right-4 duration-300 block" : "hidden"}>
                <HistorialConciliaciones />
            </div>
        </div>
    );
}
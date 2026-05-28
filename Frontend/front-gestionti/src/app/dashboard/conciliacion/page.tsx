"use client";
import React, { useState } from 'react';
import { DropArchivos } from '@/components/Conciliacion/DropArchivos';
import { FileSpreadsheet} from 'lucide-react';
import { TablaDiferencias } from '@/components/Conciliacion/TablaDiferencias';
import { HistorialConciliaciones } from '@/components/Conciliacion/HistorialConciliaciones';

export default function ConciliacionPage() {
    const [resultadosConciliacion, setResultadosConciliacion ] = useState<any[] | null>(null);

    const handleArchivoProcesado = (datos: any[]) => {
        setResultadosConciliacion(datos);
    };

    return(
        <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <FileSpreadsheet className="w-7 h-7 text-indigo-600"/>
                    Conciliación Bancaria
                </h1>
                <p className="text-gray-500 mt-2">
                    Sube el archivo de transacciones emitido por la entidad financiera.
                    El sistema verificará la integridad de los datos e identificará diferencias para revisión manual. 
                </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6">
                    Ingesta de Archivo bancario
                </h2>

                <DropArchivos onArchivoProcesado={handleArchivoProcesado}/>
            </div>

            {resultadosConciliacion ? (
                <TablaDiferencias resultados={resultadosConciliacion}/>
            ) : (
                <HistorialConciliaciones/>
            )}
        </div>
    );
}
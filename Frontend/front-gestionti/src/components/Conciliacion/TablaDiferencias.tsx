import React, { useState} from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { ModalDetalleDiferenica } from './ModalDetalleDiferencia';
import { it } from 'node:test';

interface TablaDiferenciasProps {
    resultados: any[];
}

export const TablaDiferencias = ({ resultados }: TablaDiferenciasProps) => {
    const [alertaSeleccionada, setAlertaSeleccionada] = useState<any | null>(null);
    const [esModalAbierto, setEsModalAbierto] = useState(false);
    const aprobadas = resultados.filter(item => item.coincidencia).length;
    const diferencias = resultados.filter(item => !item.coincidencia).length;

    const handleRevisarAlerta = (item: any) => {
        setAlertaSeleccionada(item);
        setEsModalAbierto(true);
    }

    return (
        <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        Resultados del Matching
                    </h2>
                    <div className="flex gap-4 text-xs font-bold">
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                            <ShieldCheck className="w-4 h-4"/> {aprobadas} Aprobada{aprobadas !== 1 ? 's':''}
                        </span>
                        <span className="flex items-center gap-1 text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                            <AlertTriangle className="w-4 h-4"/>{diferencias} Diferencia{diferencias !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Id Transacción</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Estado Banco</th>
                                <th className="px-6 py-4">Estado Interno</th>
                                <th className="px-6 py-4">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {resultados.map((item, index) => (
                                <tr key={index} className={item.coincidencia ? '': 'bg-amber-50/50'}>
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900">{item.transaccion}</td>
                                    <td className="px-6 py-4 font-medium">${item.monto.toLocaleString('es-CL')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.estadoBancario === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.estadoBancario}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.estadoInterno === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :'bg-amber-100 text-amber-700'}`}>
                                            {item.estadoInterno}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {!item.coincidencia && (
                                            <button
                                                onClick={() => handleRevisarAlerta(item)} 
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline">
                                                Revisar Alerta
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}

                        </tbody>
                    </table>
                </div>
            </div>

            <ModalDetalleDiferenica
                abierto={esModalAbierto}
                cerrado={() => setEsModalAbierto(false)}
                detalle={alertaSeleccionada}
            />
        </>
    )
}
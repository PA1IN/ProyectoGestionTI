import React from 'react';
import { X, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, Building2, Server } from 'lucide-react';

interface ModalProps { 
    abierto: boolean;
    cerrado: () => void;
    detalle: any | null;
}

export const ModalDetalleDiferenica = ({ abierto, cerrado, detalle }: ModalProps) => {
    if(!abierto || !detalle) return null;

    //tipos de error 
    const esErrorEstado = detalle.estadoBancario !== detalle.estadoInterno;
    const esNoEncontrado = detalle.estadoBancario === 'No encontrado';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                <div className="bg-slate-900 p-6 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400"/>
                    </div>
                
                    <div>
                        <h2 className="text-lg font-bold leading-tight">Revisión de Inconsistencia</h2>
                        <p className="text-xs text-slate-400 font-mono mt-1">ID Transacción: {detalle.transaccion} </p>
                    </div>
                
                <button
                    onClick={cerrado}
                    className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors"
                >
                    <X className="w-5 h-5"/>
                </button>
                </div>

            <div className="p-8 bg-slate-50">
                <p className="text-sm text-slate-600 mb-6 text-center">
                    {esNoEncontrado
                        ? "El banco no tiene registro de esta transacción, pero existe en nuestro sistema."
                        : "Se detectó una diferencia en los estados procesados entre el banco y el sistema interno."}
                </p>

                <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 relative">
                    <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative z-10">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <Building2 className="w-5 h-5 text-slate-400"/>
                            <h3 className="font-bold text-slate-700 text-sm">Registro Bancario</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Monto Reportado</p>
                                <p className="text-lg font-mono text-slate-900">${detalle.monto.toLocaleString('es-CL')}</p>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Estado</p>
                                <span className={`inline-flex mt-1 px-3 py-1 rounded-md text-sm font-bold ${detalle.estadoBancario === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {detalle.estadoBancario}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center justify-center w-12 relative z-0 -mx-6"> 
                        <div className="bg-slate-200 p-2 rounded-full shadow-inner border border-white">
                            <ArrowRight className="w-5 h-5 text-slate-400"/>
                        </div>
                    </div>

                    <div className={`flex-1 bg-white p-6 rounded-xl border shadow-sm relative z-10 ${esErrorEstado ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                            <Server className="w-5 h-5 text-indigo-400"/>
                            <h3 className="text-gray-900">Registro Interno (Flujo de pago)</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Monto Esperado</p>
                                <p className="text-lg font-mono text-slate-900">${detalle.monto.toLocaleString('es-CL')}</p>                                
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Estado</p>
                                <span className={`inline-flex mt-1 px-3 py-1 rounded-md text-sm font-bold ${detalle.estadoInterno === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {detalle.estadoInterno}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

                <div className="p-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-end gap-3">
                    <button
                        onClick={cerrado}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            alert("Alerta derivada al equipo de auditoría.");
                            cerrado();
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                        <ShieldAlert className="w-4 h-4"/>
                        Mover a centro de alertas
                    </button>
                    <button
                        onClick={() => {
                            alert("Transacción confirmada");
                            cerrado();
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4"/>
                        Forzar Aprobación
                    </button>
                </div>
            </div>
        </div>
    )
}
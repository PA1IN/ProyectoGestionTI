"use client"

import React, { useState, use } from 'react';
import { ShieldCheck, XCircle, CheckCircle2, Building2, CreditCard, Loader2 } from 'lucide-react';
import { useDetalleTransaccion, useProcesarPagoQr } from '@/hooks/useCheckout';

export default function AppBancariaSimulada({ searchParams }: { searchParams: Promise<{ token: string, qrData: string }> }) {
    const parametros = use(searchParams);
    const token = parametros.token;
    const qrData = parametros.qrData;

    const { data: transaccion, isLoading: cargaTransaccion, isError: errorTransaccion } = useDetalleTransaccion(token);
    const procesarPagoQr = useProcesarPagoQr(token);

    const [estadoFinal, setEstadoFinal] = useState<'aprobada' | 'rechazada' | null>(null);

    const autorizar = async (decision: 'aprobada' | 'rechazada') => {
        if (decision === 'rechazada') 
        {
            setEstadoFinal('rechazada');
            return;
        }

        try {
            await procesarPagoQr.mutateAsync(qrData);
            setEstadoFinal('aprobada');
        } catch (error) {
            console.error("Error al procesar el pago QR:", error);
            setEstadoFinal('rechazada');
            alert("El codigo Qr ha expirado o no es valido.");
        }
 
    };

    if (cargaTransaccion) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
                <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
            </div>
        );
    }

    if (errorTransaccion || !transaccion) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-4">
                <XCircle className="w-12 h-12 text-red-500" />
                <h2 className="text-xl font-bold">Enlace inválido o expirado</h2>
                <p>Porfavor, vuelve al comercio y genera un nuevo enlace de pago.</p>
            </div>
        );
    }

    if (estadoFinal){
        const aprobada = estadoFinal === 'aprobada';
        return (
            <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in zoom-in duration-500">
                {aprobada ? <CheckCircle2 className="w-24 h-24 text-emerald-500 mb-6" /> : <XCircle className="w-24 h-24 text-red-500 mb-6" />}
                <h2 className="text-2xl font-bold mb-2">Transacción {aprobada ? 'Aprobada' : 'Rechazada'}</h2>
                <p className="text-slate-400 text-base max-w-xs">Puedes mirar la pantalla</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col sm:justify-center items-center font-sans">
            <div className="w-full max-w-md bg-white min-h-screen sm:min-h-[auto] sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden flex flex-col relative">
                <div className="bg-[#0f172a] pt-12 pb-8 px-6 text-center text-white rounded-b-[2rem] shadow-md z-10 relative">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                </div>

                <div className="flex-1 p-8 flex flex-col">
                    <div className="text-center mb-10">
                        <p className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-4">Monto a Pagar</p>
                        <p className="text-5xl font-light text-slate-900 tracking-tighter">{transaccion?.montoTotal?.toLocaleString('es-CL')}</p>    
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-100 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs text-slate-400 font-bold uppercase">Comercio</p>
                                <p className="text-sm font-bold text-slate-800 truncate">{transaccion?.comercio}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto space-y-3">
                        <button
                            onClick={() => autorizar('aprobada')}
                            disabled={procesarPagoQr.isPending}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-lg shadow-blue-200"
                        >
                            {procesarPagoQr.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "Autorizar Pago"}
                        </button>

                        <button
                            onClick={() => autorizar('rechazada')}
                            disabled={procesarPagoQr.isPending}
                            className="w-full bg-white text-slate-500 hover:bg-slate-50 font-bold py-4 rounded-2xl"
                        >
                            Rechazar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
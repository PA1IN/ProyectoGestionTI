"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, RefreshCcw, CheckCircle } from 'lucide-react';

function FalloComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');
    const comercio = searchParams.get('comercio');

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-500">
                <div className="flex justify-center mb-6">
                    <XCircle size={48} className="text-red-500" />
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-2">Pago Rechazado</h1>
                <p className="text-gray-500 mb-8">
                    Lo sentimos, tu entidad bancaria rechazo la transacción para <span className="font-bold text-gray-800">{comercio}</span>. Por favor, verifica tus datos o utiliza otro medio de pago.
                </p>

                <div className="space-y-3">
                    <button
                        onClick={() => router.push(`/checkout/${token}`)}
                        className="w-full flex justify-center items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        <RefreshCcw className="w-5 h-5" />
                            Reintentar Pago
                    </button>

                    <button
                        onClick={() => router.push('/')} //redirigir a la pagina original del comercio
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Cancelar y regresar al comercio
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function FalloPage() {
    return (
        <Suspense fallback={
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <CheckCircle size={48} className='animate-pulse text-emerald-500' />
                <p className='text-lg text-gray-600'>Procesando tu pago...</p>
            </div>
        }>
            <FalloComponent />
        </Suspense>
    );
}
"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

function ExitoComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const comercio = searchParams.get('comercio');

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-500">
                <div className="flex items-center justify-center mb-6">
                    <CheckCircle size={48} className="text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Pago Exitoso</h1>
                <p className="text-gray-600 mb-8">
                    La hay transaccion en <span className="font-bold text-gray-800">{comercio}</span> ha sido procesada y autorizada correctamente.
                </p>
                <button
                    onClick={() => router.push('/')} //redirigir a la pagina original del comercio
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                    Regresar al comercio
                </button>
            </div>
        </div>
    );
}

export default function ExitoPage() {
    return (
        <Suspense fallback={
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <CheckCircle size={48} className='animate-pulse text-emerald-500' />
                <p className='text-lg text-gray-600'>Procesando tu pago...</p>
            </div>
        }>
            <ExitoComponent />
        </Suspense>
    );
}
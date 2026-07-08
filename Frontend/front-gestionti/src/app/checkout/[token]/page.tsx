"use client";

import React, { useState, use } from 'react';
import { useDetalleTransaccion, useProcesarPago, DatosPagoTarjeta } from '@/hooks/useCheckout';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck, XCircle } from 'lucide-react';
import { FormTarjeta } from '@/components/Checkout/FormTarjeta';
import { MetodosPago } from '@/components/Checkout/MetodosPago';
import { ResumenOrden } from '@/components/Checkout/ResumenOrden';
import { BilleteraDigital } from '@/components/Checkout/BilleteraDigital';


export default function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter();
    const desarmarparametros = use(params);
    const token = desarmarparametros.token;

    const [metodoPago, setMetododoPago] = useState<'tarjeta' | 'billetera'>('tarjeta');

    const {data: transaccion, isLoading: cargaTransaccion, isError: errorTransaccion} = useDetalleTransaccion(token);
    const procesarPago = useProcesarPago(token);

    const ProcesarPago = async (datosTarjeta: DatosPagoTarjeta) => {
        try {
            const respuesta = await procesarPago.mutateAsync(datosTarjeta);

            //const returnUrl = transaccion?.urlRetorno || '/';
            const encodedReturnUrl = encodeURIComponent(respuesta.redirectUrl);

            if (respuesta.status === 'RECHAZADO')
            {
                console.warn("error al procesar pago, pago rechazado por el back:", respuesta.message);
                router.push(`/resultado/fallo?token=${token}&comercio=${transaccion?.comercio}&returnUrl=${encodedReturnUrl}`);
                return;
            }

            router.push(`/resultado/exito?comercio=${transaccion?.comercio}&returnUrl=${encodedReturnUrl}`);
        } catch (error) {
            console.error("error al procesar el pago, pago rechazado", error);
            const encodedReturnUrl = encodeURIComponent(`${window.location.origin}/resultado/fallo`);
            router.push(`/resultado/fallo?token=${token}&comercio=${transaccion?.comercio}&returnUrl=${encodedReturnUrl}`);
        }
    };

    if (cargaTransaccion) {
        return (
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <ShieldCheck size={48} className='animate-pulse text-blue-500' />
                <p className='text-lg text-gray-600'>Cargando detalles de la transacción...</p>
            </div>
        );
    }

    if (errorTransaccion || !transaccion) {
        return (
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <XCircle size={48} className='text-red-500' />
                <h2 className='text-xl font-bold text-gray-800'>Enlace inválido o expirado</h2>
                <p className='text-lg text-gray-600'>Porfavor, vuelve al comercio y genera un nuevo enlace de pago.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">

                {/* metodos e ingreso de datos*/}
                <div className="flex-1 p-8">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Estas pagando en</p>
                    <h1 className="text-2xl font-bold text-indigo-600 mb-8">{transaccion.comercio}</h1>
                    
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Selecciona tu método de pago</h2>

                    <MetodosPago
                        metodoActual={metodoPago}
                        onCambiarMetodo={setMetododoPago}
                    />
                    <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 underline text-center w-full block">
                        Anular compra y volver
                    </button>
                </div>

                {/* resumen del pedido y formulario*/}
                <div className="flex-1 bg-gray-50 p-8 border-l border-gray-100 flex flex-col">
                    <ResumenOrden montoTotal={transaccion.montoTotal} />

                    <div className="flex-1">
                        {metodoPago === 'tarjeta' ? (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <FormTarjeta onSubmit={ProcesarPago} isProcessing={procesarPago.isPending} />
                            </div>
                        ) : (
                            <BilleteraDigital token={token} comercio={transaccion.comercio} />
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-500"/>
                        Transaccion segura 
                    </div>
                </div>

            </div>

        </div>
    );

};
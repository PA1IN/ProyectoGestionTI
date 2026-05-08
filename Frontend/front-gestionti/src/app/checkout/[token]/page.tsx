"use client";

import React, { useState, use } from 'react';
import { useDetalleTransaccion, useProcesarPago, DatosPagoTarjeta } from '@/hooks/useCheckout';
import { useRouter } from 'next/navigation';
import { QrCode, ShieldCheck, XCircle } from 'lucide-react';
import { FormTarjeta } from '@/components/Checkout/FormTarjeta';
import { MetodosPago } from '@/components/Checkout/MetodosPago';
import { ResumenOrden } from '@/components/Checkout/ResumenOrden';


export default function CheckoutPage({ params }: { params: Promise<{ token: string }> }) {
    const router = useRouter();
    const desarmarparametros = use(params);
    const token = desarmarparametros.token;

    // estado para saber el metodo de pago seleccionado
    const [metodoPago, setMetododoPago] = useState<'tarjeta' | 'billetera'>('tarjeta');

    const {data: transaccion, isLoading: cargaTransaccion, isError: errorTransaccion} = useDetalleTransaccion(token);
    const procesarPago = useProcesarPago(token);

    const handlePago = async (datosTarjeta: DatosPagoTarjeta) => {
        try {
            await procesarPago.mutateAsync(datosTarjeta);
                router.push(`/resultado/exito?comercio=${transaccion?.comercio}`);
        } catch (error) {
            console.error("Error al procesar el pago, pago rechazado", error);
            router.push(`/resultado/fallo?token=${token}&comercio=${transaccion?.comercio}`);
        }
    };

    //vista 1: mientras se cargan los datos de la transaccion
    if (cargaTransaccion) {
        return (
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <ShieldCheck size={48} className='animate-pulse text-blue-500' />
                <p className='text-lg text-gray-600'>Cargando detalles de la transacción...</p>
            </div>
        );
    }

    //vista 2: si hay un error al cargar los datos de la transaccion o el token no es valido
    if (errorTransaccion || !transaccion) {
        return (
            <div className='flex flex-col items-center justify-center h-screen gap-4'>
                <XCircle size={48} className='text-red-500' />
                <h2 className='text-xl font-bold text-gray-800'>Enlace inválido o expirado</h2>
                <p className='text-lg text-gray-600'>Porfavor, vuelve al comercio y genera un nuevo enlace de pago.</p>
            </div>
        );
    }

    //vista 3: formulario de pago
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row">

                {/*columna izquierda / metodos e ingreso de datos*/}
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

                {/*columna derecha / resumen del pedido y formulario*/}
                <div className="flex-1 bg-gray-50 p-8 border-l border-gray-100 flex flex-col">
                    <ResumenOrden montoTotal={transaccion.montoTotal} />

                    <div className="flex-1">
                        {metodoPago === 'tarjeta' ? (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <FormTarjeta onSubmit={handlePago} isProcessing={procesarPago.isPending} />
                            </div>
                        ) : (
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                                <QrCode className="w-48 h-48 mx-auto text-gray-800 mb-4"/>
                                <p className="text-sm text-gray-500">Escanea el codigo QR con tu app de pago</p>
                            </div>
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
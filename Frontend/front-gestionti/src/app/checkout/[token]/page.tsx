"use client";

import React, { useState, use } from 'react';
import { useDetalleTransaccion, useProcesarPago, DatosPagoTarjeta } from '@/hooks/useCheckout';
import { useRouter } from 'next/navigation';
import { CreditCard, QrCode, ShieldCheck, XCircle } from 'lucide-react';
import { FormTarjeta } from '@/components/Checkout/FormTarjeta';


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

                    <div className="space-y-3 mb-8">
                        {/*boton de tarjetas*/}
                        <button
                            onClick={() => setMetododoPago('tarjeta')}
                            className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors ${metodoPago === 'tarjeta' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                            <div className="bg-white p-2 rounded-lg shadow-sm mr-4">
                                <CreditCard className={`w-6 h-6 ${metodoPago === 'tarjeta' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900">Tarjetas</p>
                                <p className="text-sm text-gray-500">Credito / Debido</p>
                            </div>
                        </button>

                        {/*boton de billetera*/}
                        <button
                            onClick={() => setMetododoPago('billetera')}
                            className={`w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-colors ${metodoPago === 'billetera' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                            <div className="bg-white p-2 rounded-lg shadow-sm mr-4">
                                <QrCode className={`w-6 h-6 ${metodoPago === 'billetera' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900">Billeteras</p>
                                <p className="text-sm text-gray-500">Pago digital con el Qr</p>
                            </div>
                        </button>
                    </div>

                    <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 underline text-center w-full block">
                        Anular compra y volver
                    </button>
                </div>

                {/*columna derecha / resumen del pedido y formulario*/}
                <div className="flex-1 bg-gray-50 p-8 border-l border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                        <span className="text-sm font-bold text-gray-500 uppercase">Total a pagar </span>
                        <span className="text-2xl font-black text-gray-900">${transaccion.montoTotal.toLocaleString('es-CL')}</span>
                    </div>
                </div>

                <div className="flex-1">
                    {metodoPago === 'tarjeta' ? (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            {<FormTarjeta onSubmit={handlePago} isProcessing={procesarPago.isPending} />}
                            <p className="text-sm text-gray-500"> Formulario de tarjeta de pago...</p>
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
    );

};
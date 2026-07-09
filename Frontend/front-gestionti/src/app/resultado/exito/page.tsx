"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { useObtenerComprobante } from '@/hooks/useCheckout';

function ExitoComponent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const comercio = searchParams.get('comercio');
    const returnUrl = searchParams.get('returnUrl');
    const transactionId = searchParams.get('transactionId');

    const { data: comprobante, isLoading: cargaComprobante } = useObtenerComprobante(transactionId);

    const volveraUrl = () => {
        if(returnUrl)
        {
            //window.location.href = returnUrl;
            router.push(returnUrl);
        } else {
            router.push('/');
        }
    }

    const descargarComprob = () => {
        if (!comprobante) {
            return;
        }

        console.log("comprobante", comprobante);
        const doc = new jsPDF();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("Comprobante de Pago", 105, 20, { align: "center"});

        doc.setLineWidth(0.5);
        doc.line(20, 25, 190, 25);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");

        const fechaFormateada = new Date(comprobante.fechaHora).toLocaleString('es-CL', {
            timeZone: 'America/Santiago'
        });
        
        console.log(fechaFormateada);
        console.log(comprobante.fechaHora);

        doc.text(`Comercio: ${comprobante.nombreComercio}`, 20, 40);
        doc.text(`Monto Total: $${comprobante.montoTotal.toLocaleString('es-CL')} ${comprobante.moneda}`, 20, 50);
        doc.text(`Fecha y Hora: ${fechaFormateada}`, 20, 60);
        doc.text(`Número de Orden: ${comprobante.numeroOrden}`, 20, 70);
        
        doc.text(`Estado: ${comprobante.estado}`, 20, 90);
        doc.text(`Métdo de Pago: ${comprobante.metodoPago}`, 20, 100);
        doc.text(`Tarjeta terminada en: **** ${comprobante.ultimosCuatro}`, 20, 110);
        doc.text(`Código de Autorización: ${comprobante.codigoAutorizacion}`, 20, 120);

        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Gracias por utilizar nuestra pasarela de pagos.", 105, 150, { align: "center"});
        doc.text("Este documento es un comprobante válido de su transacción.", 105, 156, { align: "center"});

        doc.save(`Comprobante_Pago_${comprobante.numeroOrden}.pdf`);


    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-in zoom-in duration-500">
                <div className="flex items-center justify-center mb-6">
                    <CheckCircle size={48} className="text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Pago Exitoso</h1>
                <p className="text-gray-600 mb-8">
                    La transaccion en <span className="font-bold text-gray-800">{comercio}</span> ha sido procesada y autorizada correctamente.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={descargarComprob}
                        disabled={cargaComprobante || !comprobante}
                        className="w-full bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download size={20}/>
                        {cargaComprobante ? 'Preparando comprobante...' : 'Descargar comprobante de pago'}
                    </button>

                    <button
                        onClick={volveraUrl} //redirigir a la pagina original del comercio
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                    >
                        Regresar al comercio
                    </button>
                </div>


                
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
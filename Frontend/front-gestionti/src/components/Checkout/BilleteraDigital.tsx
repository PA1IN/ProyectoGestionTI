import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Info, Loader2, Smartphone } from 'lucide-react';

interface BilleteraDigitalProps {
    qrData?: string;
    isLoading?: boolean;
}

export const BilleteraDigital = ({ qrData, isLoading = false }: BilleteraDigitalProps) => {

    if (isLoading || !qrData) {
        return (
            <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm text-center flex flex-col items-center jutify-center min-h-[350px] animate-in fade-in duration-500">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4"/>
                <p className="text-sm font-bold text-gray-700">Generando código QR...</p>
                <p className="text-xs text-gray-400 mt-2">Esto tomará unos momentos</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center flex flex-col items-center animate-in zoom-in duration-300">
            <div className="flex items-center gap-2 mb-6">
                <Smartphone className="w-5 h-5 text-indigo-600"/>
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Abre tu Billetera Digital</h3>
            </div>

            <div className="p-5 bg-white border-2 border-indigo-50 rounded-2xl shadow-inner mb-6 transition-transform hover:scale-105">
                <QRCodeSVG
                    value={qrData}
                    size={220}
                    level={"Q"}
                    imageSettings={{
                        src:"/favicon.ico",
                        x: undefined,
                        y: undefined,
                        height: 24,
                        width: 24,
                        excavate: true,
                    }}                
                />
            </div>

            <div className="space-y-2 mb-6">
                <p className="text-sm font-black text-gray-900">
                    Escanea para pagar
                </p>
                <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
                    Abre tu billetera digital y escanea el código QR para realizar el pago.
                </p>
            </div>

            <div className="w-full pt-6 border-t border-gray-100 flex items-start gap-2 text-left">
                <Info className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0"/>
                <p className="text-[10px] text-gray-400 leading-tight">
                    Tu pago será procesado una vez que el código QR sea escaneado.
                </p>
            </div>
        </div>

    );







}
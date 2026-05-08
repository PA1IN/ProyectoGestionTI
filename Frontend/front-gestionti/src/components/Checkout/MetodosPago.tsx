import React from "react";
import { CreditCard, QrCode} from "lucide-react";

interface MetodosPagoProps {
    metodoActual: 'tarjeta' | 'billetera';
    onCambiarMetodo: (metodo: 'tarjeta' | 'billetera') => void;
}

export const MetodosPago = ({ metodoActual, onCambiarMetodo }: MetodosPagoProps) => {
    return (
        <div className="space-y-3 mb-8">
            <button
                onClick={() => onCambiarMetodo('tarjeta')}
                className={`w-full flex items-center gap-3 p-4 border rounded-lg transition-colors ${metodoActual === 'tarjeta' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-100'}`}
            >
                <div className="bg-white p-2 rounded-lg shadow-sm mr-4">
                    <CreditCard className={`w-6 h-6 ${metodoActual === 'tarjeta' ? 'text-indigo-600' : 'text-gray-500'}`} />
                </div>

                <div className="text-left">
                    <p className="font-bold text-gray-900">Tarjetas</p>
                    <p className="text-sm text-gray-500">Credito / Debito</p>
                </div>
            </button>


            <button
                onClick={() => onCambiarMetodo('billetera')}
                className={`w-full flex items-center gap-3 p-4 border rounded-lg transition-colors ${metodoActual === 'billetera' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-100'}`}
            >
                <div className="bg-white p-2 rounded-lg shadow-sm mr-4">
                    <QrCode className={`w-6 h-6 ${metodoActual === 'billetera' ? 'text-indigo-600' : 'text-gray-500'}`} />
                </div>
                <div className="text-left">
                    <p className="font-bold text-gray-900">Billetera</p>
                    <p className="text-sm text-gray-500">Pago digital con el Qr</p>
                </div>
            </button>
        </div>
    );
}
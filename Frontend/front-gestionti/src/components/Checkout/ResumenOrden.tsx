import React from 'react';

interface ResumenOrdenProps {
    montoTotal: number;
}

export const ResumenOrden = ({ montoTotal }: ResumenOrdenProps) => {
    return (
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <span className="text-sm font-bold text-gray-500 uppercase">Monto total a pagar</span>
            <span className="text-2xl font-bold text-gray-900">
                ${montoTotal.toLocaleString('es-CL')}
            </span>

        </div>
    );
}
import React from 'react';
import { History } from 'lucide-react';

export const HistorialConciliaciones = () => {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mt-8 animate-in fade-in duration-500">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500"/>
                Historial de Conciliaciones
            </h2>
            <p className="text-sm text-gray-500">
                El historial aún no está expuesto por el backend. Esta vista se deja sin datos simulados para evitar mostrar información ficticia.
            </p>
        </div>
    );
}
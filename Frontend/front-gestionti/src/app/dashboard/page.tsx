import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function DashboardResumenPage(){
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-indigo-600"/>
                    Resumen General
                </h1>
                <p className="text-gray-500 mt-1">Métricas y KPIs de la pasarela de pagos.</p>
            </div>

            <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center border-dashed">
                <p className="text-gray-500">
                    Reporteria y analitica en desarrollo.
                </p>

            </div>

        </div>
    )
}
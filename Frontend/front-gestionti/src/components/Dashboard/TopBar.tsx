import React from 'react';

export const TopBar = () => {
    return(
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900">Equipo Financiero</p>
                    <p className="text-xs text-gray-500">Operador</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold border-2 border-indigo-200">
                    EF
                </div>
            </div>
        </header>
    );
};
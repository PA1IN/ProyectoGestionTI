"use client";

import React  from 'react';
import { Settings,Loader2 } from 'lucide-react';
import { useObtenerConfiguracion } from '@/hooks/useConfiguracion';
import { FormConfiguracion } from '@/components/Configuracion/page';

export default function ConfiguracionPage() { 
    const { data: configInicial, isLoading} = useObtenerConfiguracion();

    if(isLoading || !configInicial) {
        return(
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4"/>
                <p>Cargando los parametros...</p>
            </div>
        )

    }

    return(

        <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <Settings className="w-7 h-7 text-indigo-600"/>
                    Configuración del sistema
                </h1>
                <p className="text-gray-500 mt-2">
                    Administra los parametros operativos de la pasarela de pagos.
                </p>
            </div>
            <FormConfiguracion configInicial={configInicial}/>
        </div>

    )
    
}
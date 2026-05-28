"use client";

import React, { useState, useRef } from 'react';
import { useSubirArchivoConciliacion } from '@/hooks/useConciliacion';
import { UploadCloud, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface DropProps {
    onArchivoProcesado: (datos: any) => void;
}

export const DropArchivos = ({ onArchivoProcesado }: DropProps) => {
    const [arrastrando, setArrastrando] = useState(false);
    const [archivo, setArchivo] = useState<File | null>(null);
    const [estado, setEstado] = useState<'esperando' | 'subiendo' | 'exito' | 'error'>('esperando');
    const [mensajeError, setMensajeError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const subirArchivo = useSubirArchivoConciliacion();

    // drag & drop
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setArrastrando(true);
    };

    const handleDragLeave = () => setArrastrando(false);


    const validarArchivo = (arch: File) => {
        if(!arch) return;

        const formatosValidos = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if(!formatosValidos.includes(arch.type) && !arch.name.endsWith('.csv')) {
            setEstado('error');
            setMensajeError('Formato no válido. Suba un archivo .CSV o .XLSX');
            setArchivo(null);
            return;
        }

        setArchivo(arch);
        setEstado('esperando');
        setMensajeError('');
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setArrastrando(false);
        const archivo = e.dataTransfer.files[0];
        validarArchivo(archivo);
    }

    const handleSeleccionManual = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files.length > 0) {
            validarArchivo(e.target.files[0]);
        }
    };


    const handleSubirArchivo = async () => {
        if(!archivo) return;
        setEstado('subiendo');

        try {
            const resultados = await subirArchivo.mutateAsync(archivo);
            setEstado('exito');
            onArchivoProcesado(resultados);
        } catch(err) {
            console.error("Error al procesar el archivo:", err);
            setEstado('error');
            setMensajeError('hubo un problema de red al comunicarse con el server')
        }
    };

    const resetear = () => {
        setArchivo(null);
        setEstado('esperando');
        if(inputRef.current) inputRef.current.value = '';
    };

    return(
        <div className="w-full">
            {estado !== 'exito' && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !archivo && inputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all ${
                        archivo ? 'border-indigo-400 bg-indigo-50/50 cursor-default' :
                        arrastrando ? 'border-indigo-600 bg-indigo-50 cursor-pointer' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer'                        
                    }`}
                
                >
                    <input
                        type="file"
                        className="hidden"
                        ref={inputRef}
                        onChange={handleSeleccionManual}
                        accept=".csv, application/vnd.openxmlformats-officedocument.sheet, application/vnd.ms-excel"
                    />
                    {!archivo ? (
                        <>
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                <UploadCloud className={`w-8 h-8 ${arrastrando ? 'text-indigo-600' : 'text-gray-400'}`}/>
                            </div>
                            <p className="text-sm font-bold text-gray-700">Haz click o arrastra tu archivo aquí</p>
                            <p className="text-sm font-bold text-gray-400">Soporta formatos .CSV o .XLSX bancarios</p>
                        </>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-indigo-100 w-full max-w-md relative">
                                <FileText className="w-8 h-8 text-indigo-500 flex-shrink-0"/>
                                <div className="text-left flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-gray-900 truncate">{archivo.name}</p>
                                    <p>{(archivo.size / 1024).toFixed(1)} Kb</p>
                                </div>
                                {estado !== 'subiendo' && (
                                    <button onClick={(e) => { e.stopPropagation(); resetear(); }} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5"/>
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={(e) => {e.stopPropagation(); handleSubirArchivo(); }}
                                disabled={estado === 'subiendo'}
                                className="mt-6 flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {estado === 'subiendo' ? (
                                    <><Loader2 className="w-5 h-5 animate-spin"> Procesando archivo...</Loader2></>
                                ) : (
                                    'Comenzar Conciliación'
                                )}
                            </button>
                        </div>
                    )}

                    {estado === 'error' && (
                        <div className="absolute -bottom-12 flex items-center gap-2 text-red-600 text-sm font-medium bg-red-50 px-4 py-2 rounded-lg">
                            <AlertCircle className="w-4 h-4"/>
                            {mensajeError}
                        </div>
                    )}
                </div>
            )}

            {estado === 'exito' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 flex flex-col items-center text-center animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4"/>
                    <h3 className="text-lg font-bold text-emerald-900">Archivo Procesado con exito</h3>
                    <p className="text-sm text-emerald-700 mt-2 max-w-md">
                        El motor de matching cruzó los datos bancarios con los registro de la base de datos de la pasarela de pago.
                    </p>
                    <button
                        onClick={resetear}
                        className="mt-6 text-sm font-bold text-emerald-600 hover:text-emerald-800 underline"
                    >
                        Subir otro archivo
                    </button>

                </div>
            )}
        </div>
    );
}
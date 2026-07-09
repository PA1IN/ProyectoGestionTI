"use client"

import React, { useState } from 'react';
import { useObtenerMetricas } from '@/hooks/useMetricas';
import { FileText, Download, Calendar, Filter, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useObtenerReportes, useGenerarReporte, obtenerDetalleReporteHistorico } from '@/hooks/useReportes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ReportesPage (){
    const {data: metricas, isLoading: cargaMetricas} = useObtenerMetricas();
    const { data: reportes, isLoading: cargaReportes } = useObtenerReportes();
    const generarReporte = useGenerarReporte();

    const [mostrarExito, setMostrarExito] = useState(false);
    const [idDescargaHistorial, setIdDescargaHistorial] = useState<string | null>(null);


    const generarpdf = (fechaDocumento: string, kpis: any, metodoPago: any[]) => {
        const documento = new jsPDF();

        //creacion del formato del pdf 
        documento.setFontSize(24);
        documento.setTextColor(79,70,229);
        documento.text("Reporte diario de transacciones", 14, 20);

        documento.setFontSize(12);
        documento.setTextColor(100, 116, 139);
        documento.text(`Fecha de generacion: ${fechaDocumento}`, 14, 28);
        documento.line(14, 32, 196, 32);

        documento.setFontSize(14);
        documento.setTextColor(15,23,42);
        documento.text('1) Resumen de métricas (kpis)', 14, 45);

        
        autoTable(documento, {
            startY: 50,
            head: [['Metrica', 'Valor', 'Estado / variacion']],
            body: [
                [
                    'Volumen Diario de Transacciones',
                    kpis.volumenTransDiario.toLocaleString('es-CL'),
                    `${kpis.crecimientoVolumen}% respecto al día anterior`
                ],
                [
                    'Tasa de Rechazo',
                    `${kpis.tasaRechazo}%`,
                    kpis.tasaRechazo < 0.5 ? 'Optimo (Objetivo < 0.5%)' : 'Alerta - Desviacion detectada'
                ],
                [
                    'Disponibilidad SLA',
                    `${kpis.uptimeSLA}%`,
                    kpis.uptimeSLA >= 99.9 ? 'Cumple objetivo (>= 99.9%)' : 'Fuera del objetivo'
                ],
            ],
            theme: 'grid',
            headStyles: { fillColor: [79,70,229], textColor: [255,255,255] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        documento.setFontSize(14);
            documento.setTextColor(15,23,42);
            documento.text('2) Distribución del volumen por metodo de pago', 14, (documento as any).lastAutoTable.finalY + 15);
            
            //prepara los datos para la tabla de volumen por metodo
            const filasMetodos = metodoPago.map(item => [
                item.metodo,
                `$${item.volumenTrans.toLocaleString('es-CL')}`
            ]);

            autoTable(documento, {
                startY: (documento as any).lastAutoTable.finalY + 22,
                head: [['Metodo de pago', 'Volumen de transacciones (CLP)']],
                body: filasMetodos,
                theme: 'striped',
                headStyles: { fillColor: [51, 65, 85]},
            });

            documento.save(`reporte_diario_${fechaDocumento.replace(/\//g, '-')}.pdf`);
    }
    const generarReportePdf = async () => {
        try {
            if (!metricas) { 
                alert("Los datos operativos de la pasarela aun no estan disponibles.");
                return;
            }

            await generarReporte.mutateAsync();
            const fechaActual = new Date().toLocaleString('es-CL');

            //obtiene los datos del hook para las metricas 
            generarpdf(fechaActual, metricas.kpiResumen, metricas.volumenPorMetodo);
            setMostrarExito(true);
            setTimeout(() => setMostrarExito(false), 5000);
        } catch (error) {
            console.error("error al generar el reporte:", error);
        }
    };


    const descargarHistorico = async (id: string, fechaReporte: string) => {
        try{
            setIdDescargaHistorial(id);

            const infoHistorico = await obtenerDetalleReporteHistorico(id);

            generarpdf(fechaReporte, infoHistorico.kpiResumen, infoHistorico.volumenPorMetodo);

        } catch (e) {
            console.error("error al obtener la info del historico", e);
        } finally {
            setIdDescargaHistorial(null);
        }
    }

        if (cargaMetricas || cargaReportes || !reportes) {
            return (
                <div className='flex flex-col items-center justify-center h-full min-h-[60vh] text-gray-500'>
                    <Loader2 className='w-10 h-10 animate-spin text-indigo-600 mb-4' />
                    <p className='font-medium text-sm animate-pulse'>Cargando datos para reportes...</p>
                </div>
            );
        }

    return(
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-8">

            <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <FileText className="w-7 h-7 text-indigo-600"/>
                    Reportes
                </h1>
                <p className="text-gray-500 mt-1">
                    Generación de reportes detallados en formato PDF de las métricas y transacciones.
                </p>
            </div>

            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 mb-2">Generar reporte diario</h2>
                        <p className="text-sm text-gray-600 max-w-xl">
                            Genera el reporte diario en formato PDF con el volumen de transacciones, tasa de rechazo, uptime SLA y distribución del volumen por método de pago.
                        </p>
                    </div>

                    <button
                        onClick={generarReportePdf}
                        disabled={generarReporte.isPending}
                        className="w-full md:w-auto flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 
                        disabled:opacity-70 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2"   
                    >
                        {generarReporte.isPending ? (
                            <><Loader2 className="w-5 h-5 animate-spin"/> Generando pdf </>
                        ): mostrarExito ? (
                            <><CheckCircle2 className="w-5 h-5"/> Reporte generado </>
                        ) : (
                            <><Download className="w-5 h-5"/> Generar PDF </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500"/>
                        Historial de reportes generados
                    </h3>
                    <button className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">
                        <Filter className="w-4 h-4"/> Filtrar
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {reportes.map((reporte) => (
                        <div key={reporte.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="bg-red-50 p-3 rounded-xl text-red-600">
                                    <FileText className="w-6 h-6"/>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{reporte.tipo} - {new Date(reporte.fecha).toLocaleDateString('es-CL')}</h4>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 font-medium">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/>{new Date(reporte.fecha).toLocaleDateString('es-CL')}</span>
                                        <span>•</span>
                                        <span className="uppercase tracking-wider font-mono font-bold">N°{reporte.id}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end w-48">
                                {reporte.estado === 'completo' && (
                                    <button
                                        onClick={() => descargarHistorico(reporte.id, new Date(reporte.fecha).toLocaleDateString('es-CL'))}
                                        disabled={idDescargaHistorial === reporte.id}
                                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold w-full
                                        text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        {idDescargaHistorial === reporte.id ? (
                                            <><Loader2 className="w-4 h-4 animate-spin"/> Descargando...</>
                                        ) : (
                                            <><Download className="w-4 h-4"/> Descargar reporte</>
                                        )}
                                    </button>
                                )}

                                {reporte.estado === 'en_proceso' && (
                                    <span className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-amber-600
                                    bg-amber-50 border border-amber-100 rounded-lg w-full">
                                        <Loader2 className="w-4 h-4 animate-spin"/> Reporte Pendiente...
                                    </span>
                                )}

                                {reporte.estado === 'fallido' && (
                                    <span className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg w-full">
                                        <AlertCircle className="w-4 h-4"/> Reporte fallido, error al generarlo.
                                    </span>
                                )}
                                
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-blue-50 border-t border-blue-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"/>
                    <p className="text-sm text-blue-800">
                        Los reportes historicos estan almacenados y encriptados para cumplir con la inmutabilidad, cualquier cambio dejara invalido el hash asociado de la auditoria.
                    </p>
                </div>
            </div>
        </div>
    );
}
import { useState } from 'react';

export const FormTarjeta = ({ onSubmit, isProcessing }: { onSubmit: (datos: { numeroTarjeta: string; fechaExpiracion: string; cvv: string, titular: string }) => void; isProcessing: boolean }) => {
    const [titular, setTitular] = useState('');
    const [numeroTarjeta, setNumeroTarjeta] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [cvv, setCvv] = useState('');
    
    const titularChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // validar la entrada para incluir solo letras y espacios
        const valor = e.target.value.replace(/[^a-zA-Z\s]/g, '').toUpperCase();
        setTitular(valor);
    };

    const numeroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // formatear el numero de tarjeta en grupos de 4 digitos
        const valor = e.target.value.replace(/\D/g, '').substring(0, 16); // eliminar cualquier caracter que no sea un numero
        const numeroFormateado = valor.match(/.{1,4}/g)?.join(' ') || valor; // formateo de tarjeta
        setNumeroTarjeta(numeroFormateado);
    };

    const vencimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // formatear el vencimiento en formato MM/AA
        let valor = e.target.value.replace(/\D/g, '').substring(0, 4); // eliminar cualquier caracter que no sea un numero
        if (valor.length >= 3) {
            valor = `${valor.substring(0,2)}/${valor.substring(2,4)}`;
        }
        setVencimiento(valor);
    }

    const cvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // formatear el CVV en formato de 3 o 4 digitos
        const valor = e.target.value.replace(/\D/g, '').substring(0, 3); // eliminar cualquier caracter que no sea un numero
        setCvv(valor);
    }

    const enviar = (e: React.FormEvent) => {
        e.preventDefault();
        // eliminar espacios del numero de tarjeta antes de enviar
        const numeroLimpio = numeroTarjeta.replace(/\s/g, '');
        onSubmit({ numeroTarjeta: numeroLimpio, fechaExpiracion: vencimiento, cvv, titular });
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="w-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden h-48 flex flex-col justify-between">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <div className="w-12 h-8 bg-yellow-400/80 rounded-md"></div>
                <div className="z-10">
                    <p className="text-xs opacity-80 mb-1">Numero de Tarjeta</p>
                    <p className="text-xl font-mono tracking-widest drop-shadow-md">{numeroTarjeta || 'XXXX XXXX XXXX XXXX'}</p>
                </div>
                <div className="flex justify-between items-end z-10">
                    <div>
                        <p className="text-[10px] uppercase opacity-80">Vencimiento</p>
                        <p className="font-mono">{vencimiento || 'MM/AA'}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase opacity-80">CVV</p>
                        <p className="font-mono">{cvv ? '***' : '---'}</p>
                    </div>
                </div>

            </div>

            <form onSubmit={enviar} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nombre del titular</label>
                    <input
                        type="text"
                        value={titular}
                        onChange={titularChange}
                        placeholder="Daniel Perez"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-gray-900"
                        required
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Número de tarjeta</label>
                    <input
                        type="text" 
                        value={numeroTarjeta}
                        onChange={numeroChange}
                        placeholder="1234 5678 9012 3456"
                        className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all text-gray-900"
                        required
                    />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vencimiento</label>
                        <input
                            type="text"
                            value={vencimiento}
                            onChange={vencimientoChange}
                            placeholder="MM/AA"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all text-gray-900"
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">CVV</label>
                        <input
                            type="password"
                            value={cvv}
                            onChange={cvvChange}
                            placeholder="123"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono transition-all text-gray-900"
                            required
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={isProcessing}
                    className={`w-full py-3.5 mt-2 rounded-xl font-bold transition-all border shadow-sm ${
                        isProcessing 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-indigo-600 hover:text-white hover:border-indigo-600'
                    }`}
                >
                    {isProcessing ? 'Procesando pago seguro...' : 'Pagar ahora'}
                </button>
            </form>
        </div>
    );

}
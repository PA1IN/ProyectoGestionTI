import { useState } from 'react';

export const FormTarjeta = ({ onSubmit, isProcessing }: { onSubmit: (datos: { numeroTarjeta: string; vencimiento: string; cvv: string }) => void; isProcessing: boolean }) => {
    const [numeroTarjeta, setNumeroTarjeta] = useState('');
    const [vencimiento, setVencimiento] = useState('');
    const [cvv, setCvv] = useState('');    

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ numeroTarjeta, vencimiento, cvv });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número de tarjeta</label>
                <input
                    type="text" 
                    value={numeroTarjeta}
                    onChange={(e) => setNumeroTarjeta(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
            </div>
            <div className="flex gap-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento</label>
                    <input
                        type="text"
                        value={vencimiento}
                        onChange={(e) => setVencimiento(e.target.value)}
                        placeholder="MM/AA"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                    <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                </div>
            </div>
            <button
                type="submit"
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg text-white font-bold ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {isProcessing ? 'Procesando...' : 'Pagar ahora'}
            </button>
        </form>
    );




}
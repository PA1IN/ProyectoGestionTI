"use client";
import { ProveedorAuth } from "@/context/AuthContext";
import {  QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
    const [clienteQuery] = useState(() => new QueryClient());
    return (
        <QueryClientProvider client={clienteQuery}>
            <ProveedorAuth>
                {children}
            </ProveedorAuth>
        </QueryClientProvider>
    );
}
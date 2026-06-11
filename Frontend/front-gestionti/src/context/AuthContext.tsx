'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import keycloak from '@/auth/keycloak';

type AdminRole = 'admin';

interface TipoAutenticacion {
    token: string | null;
    rolUsuario: AdminRole | null;
    isAdmin: boolean;
    loading: boolean;
    autenticado: boolean;
    iniciarSesion: () => Promise<void>;
    logout: () => void;
}

const contextoAutenticacion = createContext<TipoAutenticacion | undefined>(undefined);

export const ProveedorAuth = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [rolUsuario, setRolUsuario] = useState<AdminRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [autenticado, setAutenticado] = useState(false);

    const obtenerRoles = useCallback(() => {
        const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
        const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'front-gestionti';
        const clientRoles = keycloak.tokenParsed?.resource_access?.[clientId]?.roles ?? [];

        return [...new Set([...realmRoles, ...clientRoles])];
    }, []);

    const sincronizarEstado = useCallback(() => {
        const tokenActual = keycloak.token ?? null;
        const roles = obtenerRoles();
        const tieneRolAdmin = roles.includes('admin');

        setToken(tokenActual);
        setAutenticado(Boolean(keycloak.authenticated));
        setRolUsuario(tieneRolAdmin ? 'admin' : null);
    }, [obtenerRoles]);

    useEffect(() => {
        let cancelado = false;

        const iniciar = async () => {
            try {
                const authenticated = await keycloak.init({
                    onLoad: 'check-sso',
                    pkceMethod: 'S256',
                    checkLoginIframe: false,
                });

                if (!cancelado) {
                    setAutenticado(authenticated);
                    sincronizarEstado();
                }
            } finally {
                if (!cancelado) {
                    setLoading(false);
                }
            }
        };

        iniciar();

        return () => {
            cancelado = true;
        };
    }, [sincronizarEstado]);

    const iniciarSesion = useCallback(async () => {
        if (keycloak.authenticated && obtenerRoles().includes('admin')) {
            return;
        }

        await keycloak.login({
            redirectUri: `${window.location.origin}/dashboard`,
        });
    }, [obtenerRoles]);

    const logout = useCallback(() => {
        keycloak.logout({
            redirectUri: `${window.location.origin}/login`,
        });
    }, []);

    const isAdmin = rolUsuario === 'admin';

    const valorContexto = useMemo(() => ({
        token,
        rolUsuario,
        isAdmin,
        loading,
        autenticado,
        iniciarSesion,
        logout
    }), [token, rolUsuario, isAdmin, loading, autenticado, iniciarSesion, logout]);

    return (
        <contextoAutenticacion.Provider value={valorContexto}>
            {children}
        </contextoAutenticacion.Provider>  
    );
};

export const useAuth = (): TipoAutenticacion => {
    const contexto = useContext(contextoAutenticacion);
    if (!contexto)
    {
        throw new Error('el hook de useAuth debe ir dentro de un ProveedorAuth');
    }
    return contexto;
}


'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import keycloak from '@/auth/keycloak';
import api from '@/api/axios';
import { usePathname } from 'next/navigation';

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

let keycloakIniciado = false;

export const ProveedorAuth = ({ children }: { children: React.ReactNode }) => {
    const [token, setToken] = useState<string | null>(null);
    const [rolUsuario, setRolUsuario] = useState<AdminRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [autenticado, setAutenticado] = useState(false);

    const ruta = usePathname();

    const obtenerRoles = useCallback(() => {
        const realmRoles = keycloak.tokenParsed?.realm_access?.roles ?? [];
        return [...new Set([...realmRoles])];
    }, []);

    const sincronizarEstado = useCallback(() => {
        const tokenActual = keycloak.token ?? null;
        const roles = obtenerRoles();
        const tieneRolAdmin = roles.includes('admin');

        setToken(tokenActual);
        setAutenticado(Boolean(keycloak.authenticated));
        setRolUsuario(tieneRolAdmin ? 'admin' : null);
    }, [obtenerRoles]);

    const sincronizarDesdeBackend = useCallback(async () => {
        try {
            const respuesta = await api.get('/auth/me');
            const rolesBackend = Array.isArray(respuesta.data?.roles) ? respuesta.data.roles : [];
            const tieneRolAdmin = rolesBackend.includes('admin');

            setToken(keycloak.token ?? null);
            setAutenticado(true);
            setRolUsuario(tieneRolAdmin ? 'admin' : null);
        } catch {
            sincronizarEstado();
        }
    }, [sincronizarEstado]);

    

    useEffect(() => {
        let cancelado = false;

        const iniciar = async () => {
            //verifica si es la ruta publica de pago antes de llamar a keycloak
            if (ruta?.startsWith('/checkout'))
            {
                if (!cancelado)
                {
                    setLoading(false);
                }
                return; 
            }

            if (keycloakIniciado) {
                return;
            }

            keycloakIniciado = true;

            try {
                const authenticated = await keycloak.init({
                    onLoad: 'check-sso',
                    pkceMethod: 'S256',
                    checkLoginIframe: false,
                });

                if (!cancelado) {
                    setAutenticado(authenticated);
                    if (authenticated) {
                        await sincronizarDesdeBackend();
                    } else {
                        sincronizarEstado();
                    }
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
    }, [sincronizarEstado, sincronizarDesdeBackend, ruta]);

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

## Backend

Este backend está dividido en varios microservicios: `pagos`, `conciliacion`, `analitica`, `gateway` y `webhook-worker`.

## Levantar en local

### Con Docker

Desde la raíz del proyecto:

```bash
docker-compose up -d --build
```

### Sin Docker

Levanta cada microservicio por separado:

```bash
npm run start:dev pagos
npm run start:dev conciliacion
npm run start:dev analitica
```

## Variables de entorno

Las variables más importantes del backend son estas:

- `DATABASE_URL`: conexión a PostgreSQL usada por los microservicios que persisten datos.
- `JWT_SECRET`: clave para firmar y verificar los JWT internos de `pagos`.
- `JWT_EXPIRES_IN`: tiempo de vida de los JWT generados por `pagos`.
- `FRONTEND_URL`: URL del frontend para construir redirecciones y links de retorno.
- `PORT_PAGOS`: puerto del servicio `pagos`.
- `PORT_CONCILIACION`: puerto del servicio `conciliacion`.
- `PORT_ANALITICA`: puerto del servicio `analitica`.
- `PORT_GATEWAY`: puerto del `gateway`.
- `PAGOS_SERVICE_URL`: URL interna del servicio `pagos` usada por el gateway.
- `CONCILIACION_SERVICE_URL`: URL interna del servicio `conciliacion` usada por el gateway.
- `ANALITICA_SERVICE_URL`: URL interna del servicio `analitica` usada por el gateway.
- `KEYCLOAK_URL`: base URL de Keycloak.
- `KEYCLOAK_REALM`: realm de Keycloak.
- `KEYCLOAK_ISSUER`: issuer completo de Keycloak; si no existe, se arma con `KEYCLOAK_URL` y `KEYCLOAK_REALM`.
- `ANALYTICS_WEBHOOK_URL`: endpoint al que `pagos` envía eventos de analítica.
- `ALERTAS_WEBHOOK_URL`: endpoint al que `pagos` envía alertas.
- `CONCILIATION_WEBHOOK_URL`: webhook usado por conciliación cuando corresponde.
- `SYSTEM_ID`: identificador del sistema para conciliación.
- `PROY11_WEBHOOK_API_KEY`: api key para los webhooks externos cuando aplica.

## Autenticación

El diseño es simple:

- El `gateway` valida tokens de Keycloak con su `KeycloakAuthGuard`.
- `analitica` también valida tokens de Keycloak con su propio guard.
- `pagos` usa `PagoMerchantAuthGuard` para validar credenciales del comercio en endpoints internos como `ucnpay`.
- `comercios` y `tarjeta` en `pagos` también quedan protegidos por `PagoMerchantAuthGuard`.

El guard de Keycloak reutiliza el JWKS remoto en memoria, así no descarga las llaves públicas en cada request.

## Dockerfiles

### `Dockerfile`

Se usa para producción. Compila todos los microservicios y luego ejecuta los binarios generados.

### `Dockerfile.dev`

Se usa para desarrollo. Compila solo el microservicio indicado por `APP_NAME` y arranca ese servicio en modo más simple.

## Tests

Para correr los tests actuales:

```bash
npm run test:pagos
npm run test:conciliacion
npm run test:analitica
```


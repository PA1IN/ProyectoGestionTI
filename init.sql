CREATE TYPE estado_transaccion AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'SUCCESS',
    'FAILED',
    'REJECTED',
    'REFUNDED'
);

CREATE TYPE tipo_pago AS ENUM (
    'TARJETA',
    'BILLETERA',
    'TRANSFERENCIA'
);

CREATE TABLE transaccion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_orden VARCHAR(255) NOT NULL,
    monto DECIMAL(18, 2) NOT NULL,
    moneda CHAR(3) DEFAULT 'CLP',
    estado estado_transaccion DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE detalle_transaccion (
    id BIGSERIAL PRIMARY KEY,
    nombre_usuario VARCHAR(255),
    rut VARCHAR(20),
    id_transaccion UUID NOT NULL,
    metodo_pago tipo_pago NOT NULL,
    ultimos_cuatro VARCHAR(4),
    cuotas INT DEFAULT 1,
    codigo_autorizacion VARCHAR(100),
    emisor_tarjeta VARCHAR(100),
    CONSTRAINT fk_transaccion_detalle 
        FOREIGN KEY (id_transaccion) 
        REFERENCES transaccion(id) 
        ON DELETE CASCADE
);

CREATE TABLE historial_transaccion (
    id BIGSERIAL PRIMARY KEY,
    id_transaccion UUID NOT NULL,
    status_from estado_transaccion,
    status_to estado_transaccion,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaccion_historial
        FOREIGN KEY (id_transaccion)
        REFERENCES transaccion(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_transaccion_id_orden ON transaccion(id_orden);
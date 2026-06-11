CREATE TYPE estado_transaccion AS ENUM (
  'PENDING', 'AUTHORIZED', 'SUCCESS', 'FAILED', 'REJECTED', 'REFUNDED'
);

CREATE TYPE tipo_pago AS ENUM (
  'TARJETA', 'BILLETERA', 'TRANSFERENCIA'
);

CREATE TYPE discrepancia_tipo AS ENUM (
  'EXISTE_EN_BANCO',
  'FALTANTE_EN_BANCO',
  'DIFERENCIA_DE_MONTO'
);

CREATE TYPE discrepancia_estado AS ENUM (
  'ABIERTA',
  'CERRADA'
);

CREATE TABLE transaccion (
  id          UUID               DEFAULT gen_random_uuid(),
  id_orden    VARCHAR(255)       NOT NULL,
  rrn         INT,
  monto       INT    NOT NULL,
  moneda      CHAR(3)            DEFAULT 'CLP',
  estado      estado_transaccion DEFAULT 'PENDING',
  created_at  TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

--CREATE INDEX idx_transaccion_id_orden ON transaccion (id_orden);
--CREATE INDEX idx_transaccion_rrn_fecha ON transaccion (rrn);

CREATE TABLE detalle_transaccion (
  id                  BIGSERIAL PRIMARY KEY,
  nombre_usuario      VARCHAR(255),
  rut                 VARCHAR(20),
  id_transaccion      UUID      NOT NULL,
  metodo_pago         tipo_pago NOT NULL,
  ultimos_cuatro      VARCHAR(4),
  cuotas              INT       DEFAULT 1,
  codigo_autorizacion VARCHAR(100),
  emisor_tarjeta      VARCHAR(100),
  CONSTRAINT fk_detalle_transaccion 
    FOREIGN KEY (id_transaccion) REFERENCES transaccion(id) ON DELETE CASCADE
);

CREATE TABLE historial_transaccion (
  id              BIGSERIAL PRIMARY KEY,
  id_transaccion  UUID               NOT NULL,
  status_from     estado_transaccion,
  status_to       estado_transaccion,
  created_at      TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_historial_transaccion 
    FOREIGN KEY (id_transaccion) REFERENCES transaccion(id) ON DELETE CASCADE
);

CREATE TABLE conciliacion_temporal (
  id             SERIAL PRIMARY KEY,
  rrn_banco      INT            NOT NULL,
  monto_externo  INT NOT NULL,
  fecha_hora     TIMESTAMP      NOT NULL,
  archivo_id        VARCHAR(255),
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  UNIQUE         (rrn_banco, fecha_hora)
);

--CREATE INDEX idx_conc_temp_fecha ON conciliacion_temporal (fecha);

CREATE TABLE discrepancias_conciliacion (
  id                 SERIAL PRIMARY KEY,
  rrn                INT,
  tipo               discrepancia_tipo   NOT NULL,
  monto_interno      INT,
  monto_banco        INT,
  fecha_conciliacion DATE                NOT NULL,
  archivo_id            VARCHAR(255),
  estado             discrepancia_estado DEFAULT 'ABIERTA',
  resuelto_por       UUID,
  created_at         TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP           DEFAULT CURRENT_TIMESTAMP
);

--CREATE INDEX idx_disc_rrn_fecha ON discrepancias_conciliacion (rrn, fecha_conciliacion);
--CREATE INDEX idx_disc_estado ON discrepancias_conciliacion (estado) WHERE estado = 'ABIERTA';
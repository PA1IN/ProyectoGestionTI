CREATE TYPE estado_transaccion AS ENUM (
  'PENDIENTE', 'APROBADO', 'RECHAZADO', 'FALLIDO', 'DEVUELTO'
);

CREATE TYPE tipo_pago AS ENUM (
  'TARJETA', 'BILLETERA', 'TRANSFERENCIA'
);

CREATE TYPE tipo_operacion_transaccion AS ENUM (
  'CIT', 'MIT'
);

CREATE TYPE estado_tarjeta_guardada AS ENUM (
  'ACTIVA', 'ELIMINADA'
);

CREATE TYPE estado_mandato_pago AS ENUM (
  'ACTIVO', 'SUSPENDIDO', 'REVOCADO'
);

CREATE TYPE estado_credencial_comercio AS ENUM (
  'ACTIVA', 'INACTIVA'
);

CREATE TYPE estado_tarjeta AS ENUM (
  'APROBADO', 'RECHAZADO'
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
  id_orden    VARCHAR(255)       NOT NULL UNIQUE,
  merchant_credential_id UUID,
  payment_method_token UUID,
  mandate_id  UUID,
  tipo_operacion tipo_operacion_transaccion,
  rrn         INT,
  monto       INT    NOT NULL,
  moneda      CHAR(3)            DEFAULT 'CLP',
  estado      estado_transaccion DEFAULT 'PENDIENTE',
  created_at  TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP          DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE tarjeta (
  id               SERIAL PRIMARY KEY,
  numero           VARCHAR(16) NOT NULL UNIQUE,
  titular          VARCHAR(7) NOT NULL,
  fecha_expiracion VARCHAR(7)   NOT NULL,
  cvv              VARCHAR(4)   NOT NULL,
  dinero           INT,
  estado           estado_tarjeta,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tarjeta (numero, titular, fecha_expiracion, cvv, dinero, estado)
VALUES
  ('1111222233334444', 'TITULAR APROBADO', '01/27', '123', 100000, 'APROBADO'),
  ('4444333322221111', 'TITULAR RECHAZADO', '01/27', '123', 100000, 'RECHAZADO')
ON CONFLICT (numero) DO NOTHING;

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
  payment_method_token UUID,
  CONSTRAINT fk_detalle_transaccion 
    FOREIGN KEY (id_transaccion) REFERENCES transaccion(id) ON DELETE CASCADE
);

CREATE TABLE tarjeta_guardada (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  numero_pan       VARCHAR(19) NOT NULL,
  exp_month        INT NOT NULL,
  exp_year         INT NOT NULL,
  last4            VARCHAR(4) NOT NULL,
  brand            VARCHAR(30),
  holder_name      VARCHAR(120),
  fingerprint      VARCHAR(128),
  estado           estado_tarjeta_guardada DEFAULT 'ACTIVA',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "UQ_tarjeta_activa" ON tarjeta_guardada (user_id, numero_pan) WHERE estado = 'ACTIVA';

CREATE TABLE credencial_comercio (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_comercio  VARCHAR(150) NOT NULL UNIQUE,
  public_key       VARCHAR(128) NOT NULL UNIQUE,
  private_key      VARCHAR(128) NOT NULL UNIQUE,
  estado           estado_credencial_comercio DEFAULT 'ACTIVA',
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mandato_pago (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_credential_id UUID NOT NULL,
  payment_method_token   UUID NOT NULL,
  initial_transaction_id UUID,
  currency              CHAR(3) DEFAULT 'CLP',
  recurrence_type       VARCHAR(50),
  amount_limit          NUMERIC(18,2),
  estado                estado_mandato_pago DEFAULT 'ACTIVO',
  consent_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mandato_merchant
    FOREIGN KEY (merchant_credential_id) REFERENCES credencial_comercio(id),
  CONSTRAINT fk_mandato_tarjeta
    FOREIGN KEY (payment_method_token) REFERENCES tarjeta_guardada(id),
  CONSTRAINT fk_mandato_transaccion
    FOREIGN KEY (initial_transaction_id) REFERENCES transaccion(id)
);

ALTER TABLE transaccion
  ADD CONSTRAINT fk_transaccion_merchant
  FOREIGN KEY (merchant_credential_id) REFERENCES credencial_comercio(id),
  ADD CONSTRAINT fk_transaccion_tarjeta
  FOREIGN KEY (payment_method_token) REFERENCES tarjeta_guardada(id),
  ADD CONSTRAINT fk_transaccion_mandato
  FOREIGN KEY (mandate_id) REFERENCES mandato_pago(id);

ALTER TABLE detalle_transaccion
  ADD CONSTRAINT fk_detalle_tarjeta
  FOREIGN KEY (payment_method_token) REFERENCES tarjeta_guardada(id);

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
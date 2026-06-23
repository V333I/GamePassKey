-- ===========================================================================
-- GamePassKey — 2FA por Telegram (OTP)
-- Ejecutar UNA vez sobre la base de datos `gamepasskey`.
--
--   mysql -u root -p gamepasskey < backend/sql/otp_telegram.sql
--
-- o pegar el contenido en phpMyAdmin / MySQL Workbench.
-- ===========================================================================

-- 1) Columna para vincular el chat de Telegram de cada usuario (NULL = sin OTP).
ALTER TABLE usuarios
    ADD COLUMN telegram_chat_id VARCHAR(50) NULL AFTER password_hash;

-- 2) Tabla de códigos OTP de un solo uso (se guardan hasheados, nunca en claro).
CREATE TABLE IF NOT EXISTS codigos_otp (
    id_otp           INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario       INT NOT NULL,
    codigo_hash      VARCHAR(255) NOT NULL,
    estado           ENUM('pendiente','usado','expirado') NOT NULL DEFAULT 'pendiente',
    intentos         INT NOT NULL DEFAULT 0,
    fecha_creacion   DATETIME NOT NULL,
    fecha_expiracion DATETIME NOT NULL,
    CONSTRAINT fk_otp_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    INDEX idx_otp_usuario_estado (id_usuario, estado)
);

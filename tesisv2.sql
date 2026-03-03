-- ============================================================
-- TESIS DB v3 - SCHEMA COMPLETO FINAL
-- ============================================================
-- Cambios respecto a la BD original:
--
-- [empresas]
--   + tipo_negocio: preferencia del usuario (NO restrictivo)
--     Cualquier empresa puede usar productos Y servicios sin límite.
--     Solo sirve para personalizar la UI por defecto en el onboarding.
--   + onboarding_completado: flag para saber si ya pasó por el onboarding
--   - Eliminados índices únicos duplicados (había 9 repetidos)
--
-- [categorias_productos] NUEVA
--   Categorías propias de cada empresa para organizar su catálogo de productos.
--
-- [catalogo_items] MODIFICADA
--   - Eliminado: sku
--   - Eliminado: notas_adicionales
--   - El campo 'categoria' (enum) se reemplaza por categoria_id (FK)
--   + categoria_id → FK a categorias_productos
--
-- [categorias_servicios] NUEVA
--   Categorías propias de cada empresa para sus servicios.
--
-- [catalogo_servicios] NUEVA
--   Tabla dedicada para servicios: duración, agendamiento, disponibilidad.
--   Separada de catalogo_items para no mezclar lógicas.
--
-- [disponibilidad_servicios] NUEVA
--   Horarios disponibles por servicio (día de semana + hora inicio/fin).
--
-- [usuarios] MODIFICADA
--   - Eliminados índices únicos y FKs duplicados (había 9 repetidos)
--
-- El resto de tablas (configuraciones_chatbot, instancias_whatsapp,
-- mensajes_automaticos, pedidos, reservaciones) sin cambios de estructura.
-- ============================================================
create database tesisv2;

use tesisv2;


/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!50503 SET NAMES utf8mb4 */;


-- ============================================================
-- 1. EMPRESAS
-- ============================================================
-- tipo_negocio: preferencia visual del onboarding, NO bloquea nada.
-- Una empresa puede tener productos Y servicios simultáneamente.
-- onboarding_completado: el guard del frontend lo lee para redirigir.

DROP TABLE IF EXISTS `empresas`;
CREATE TABLE `empresas` (
  `id`                      INT           NOT NULL AUTO_INCREMENT,
  `nombre`                  VARCHAR(255)  NOT NULL,
  `correo_contacto`         VARCHAR(255)  DEFAULT NULL,
  `telefono_contacto`       VARCHAR(255)  DEFAULT NULL,
  `tipo_negocio`            ENUM('productos','servicios')
                            DEFAULT NULL
                            COMMENT 'Preferencia del onboarding. No restringe el uso de productos ni servicios.',
  `onboarding_completado`   TINYINT(1)    NOT NULL DEFAULT 0
                            COMMENT '0 = aún no ha pasado por el onboarding, 1 = ya lo completó',
  `fecha_creacion`          DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo_contacto` (`correo_contacto`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `empresas` WRITE;
INSERT INTO `empresas` VALUES
  (1,'EMPRSA1','juabngonzalez4@gmail.com','6683238444','productos',1,'2026-02-26 03:12:11');
UNLOCK TABLES;


-- ============================================================
-- 2. USUARIOS
-- ============================================================

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `empresa_id`          INT           NOT NULL,
  `nombre`              VARCHAR(255)  NOT NULL,
  `correo`              VARCHAR(255)  NOT NULL,
  `contraseña`          VARCHAR(255)  NOT NULL,
  `telefono`            VARCHAR(255)  DEFAULT NULL,
  `verificado`          TINYINT(1)    DEFAULT '0',
  `token_verificacion`  VARCHAR(255)  DEFAULT NULL,
  `fecha_creacion`      DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `usuarios_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `usuarios` WRITE;
INSERT INTO `usuarios` VALUES
  (1, 1, 'Juan Carlos de Jesus Gonzalez Lopez', 'juabngonzalez4@gmail.com',
   '$2b$10$XqZLFM65Nj1QDEM.XPNYaOA86N3q.60APWmfvZgjwsJ1qN6G/8ALi',
   '6683238444', 1, NULL, '2026-02-26 03:12:11');
UNLOCK TABLES;


-- ============================================================
-- 3. CATEGORIAS_PRODUCTOS
-- ============================================================
-- Cada empresa crea sus propias categorías para productos.
-- Sin enum fijo: la empresa escribe lo que quiera (Comida, Ropa, etc.)

DROP TABLE IF EXISTS `categorias_productos`;
CREATE TABLE `categorias_productos` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `empresa_id`     INT           NOT NULL,
  `nombre`         VARCHAR(100)  NOT NULL,
  `descripcion`    TEXT          DEFAULT NULL,
  `activa`         TINYINT(1)    DEFAULT '1',
  `fecha_creacion` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `cat_prod_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sin datos de ejemplo: cada empresa crea las suyas en el onboarding o después.


-- ============================================================
-- 4. CATALOGO_ITEMS (productos)
-- ============================================================
-- Se eliminaron: sku, notas_adicionales, el enum 'categoria'
-- Se agrega: categoria_id (FK a categorias_productos)

DROP TABLE IF EXISTS `catalogo_items`;
CREATE TABLE `catalogo_items` (
  `id`                   INT            NOT NULL AUTO_INCREMENT,
  `empresa_id`           INT            NOT NULL,
  `categoria_id`         INT            DEFAULT NULL
                         COMMENT 'FK a categorias_productos. Puede ser NULL si no tiene categoría.',
  `nombre_item`          VARCHAR(255)   NOT NULL,
  `descripcion`          TEXT           DEFAULT NULL,
  `precio`               DECIMAL(10,2)  DEFAULT NULL,
  `stock`                INT            DEFAULT NULL,
  `disponible`           TINYINT(1)     DEFAULT '1',
  `tags`                 VARCHAR(255)   DEFAULT NULL
                         COMMENT 'Palabras clave separadas por coma para búsqueda en chatbot',
  `imagen_url`           TEXT           DEFAULT NULL,
  `fecha_creacion`       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion`  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `catalogo_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `catalogo_categoria_fk` FOREIGN KEY (`categoria_id`)
    REFERENCES `categorias_productos` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `catalogo_items` WRITE;
-- categoria_id = NULL porque hay que asignarla manualmente tras crear la categoría
INSERT INTO `catalogo_items` VALUES
  (1, 1, NULL, 'producto2', 'xd', 200.00, 10, 1, 'BUEN PRODUCTO',
   'http://localhost:3000/uploads/catalogos/goku-faces-destiny-hf-1920x1080-1772224238249-849846536.jpg',
   '2026-02-27 20:30:38', '2026-02-27 20:30:38');
UNLOCK TABLES;


-- ============================================================
-- 5. CATEGORIAS_SERVICIOS
-- ============================================================
-- Igual que categorias_productos pero para servicios.
-- Sin enum: la empresa define sus propias categorías (Cortes, Masajes, etc.)

DROP TABLE IF EXISTS `categorias_servicios`;
CREATE TABLE `categorias_servicios` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `empresa_id`     INT           NOT NULL,
  `nombre`         VARCHAR(100)  NOT NULL,
  `descripcion`    TEXT          DEFAULT NULL,
  `activa`         TINYINT(1)    DEFAULT '1',
  `fecha_creacion` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `cat_serv_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 6. CATALOGO_SERVICIOS
-- ============================================================
-- Tabla separada para servicios (no mezclar con productos).
-- Una empresa puede tener ambas tablas llenas sin restricción.

DROP TABLE IF EXISTS `catalogo_servicios`;
CREATE TABLE `catalogo_servicios` (
  `id`                    INT            NOT NULL AUTO_INCREMENT,
  `empresa_id`            INT            NOT NULL,
  `categoria_id`          INT            DEFAULT NULL
                          COMMENT 'FK a categorias_servicios',
  `nombre`                VARCHAR(255)   NOT NULL,
  `descripcion`           TEXT           DEFAULT NULL,
  `precio`                DECIMAL(10,2)  DEFAULT NULL,
  `duracion_minutos`      INT            DEFAULT NULL
                          COMMENT 'Duración estimada del servicio en minutos',
  `requiere_agendamiento` TINYINT(1)     DEFAULT '1'
                          COMMENT '1 = requiere cita, 0 = sin cita previa',
  `disponible`            TINYINT(1)     DEFAULT '1',
  `imagen_url`            TEXT           DEFAULT NULL,
  `tags`                  VARCHAR(255)   DEFAULT NULL
                          COMMENT 'Palabras clave para búsqueda en chatbot',
  `fecha_creacion`        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion`   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  KEY `categoria_id` (`categoria_id`),
  CONSTRAINT `servicio_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `servicio_categoria_fk` FOREIGN KEY (`categoria_id`)
    REFERENCES `categorias_servicios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 7. DISPONIBILIDAD_SERVICIOS
-- ============================================================
-- Horarios por servicio: qué días y en qué horario está disponible.
-- dia_semana: 0=Domingo, 1=Lunes, 2=Martes, ..., 6=Sábado

DROP TABLE IF EXISTS `disponibilidad_servicios`;
CREATE TABLE `disponibilidad_servicios` (
  `id`           INT        NOT NULL AUTO_INCREMENT,
  `servicio_id`  INT        NOT NULL,
  `empresa_id`   INT        NOT NULL,
  `dia_semana`   TINYINT    NOT NULL
                 COMMENT '0=Domingo 1=Lunes 2=Martes 3=Miércoles 4=Jueves 5=Viernes 6=Sábado',
  `hora_inicio`  TIME       NOT NULL,
  `hora_fin`     TIME       NOT NULL,
  `activo`       TINYINT(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `servicio_id` (`servicio_id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `disp_servicio_fk` FOREIGN KEY (`servicio_id`)
    REFERENCES `catalogo_servicios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `disp_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================
-- 8. INSTANCIAS_WHATSAPP
-- ============================================================

DROP TABLE IF EXISTS `instancias_whatsapp`;
CREATE TABLE `instancias_whatsapp` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `empresa_id`       INT          NOT NULL,
  `nombre_sesion`    VARCHAR(255) NOT NULL,
  `codigo_qr`        TEXT         DEFAULT NULL,
  `conectado`        TINYINT(1)   DEFAULT '0',
  `ultima_conexion`  TIMESTAMP    DEFAULT NULL,
  `numero_telefono`  VARCHAR(50)  DEFAULT NULL,
  `fecha_creacion`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_empresa_instancia` (`empresa_id`),
  CONSTRAINT `whatsapp_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `instancias_whatsapp` WRITE;
INSERT INTO `instancias_whatsapp` VALUES
  (1, 1, 'empresa_1', NULL, 1, '2026-02-28 00:31:03', NULL, '2026-02-26 03:12:11');
UNLOCK TABLES;


-- ============================================================
-- 9. CONFIGURACIONES_CHATBOT
-- ============================================================

DROP TABLE IF EXISTS `configuraciones_chatbot`;
CREATE TABLE `configuraciones_chatbot` (
  `id`                    INT        NOT NULL AUTO_INCREMENT,
  `empresa_id`            INT        NOT NULL,
  `mensaje_bienvenida`    TEXT       DEFAULT NULL,
  `mensaje_fuera_horario` TEXT       DEFAULT NULL,
  `horario_inicio`        TIME       DEFAULT NULL,
  `horario_fin`           TIME       DEFAULT NULL,
  `activo`                TINYINT(1) DEFAULT '1',
  `dias_laborales`        JSON       DEFAULT NULL
                          COMMENT 'Array de días: [1,2,3,4,5] donde 1=Lunes...7=Domingo',
  `fecha_creacion`        TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `chatbot_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `configuraciones_chatbot` WRITE;
INSERT INTO `configuraciones_chatbot` VALUES
  (1, 1, 'hola bienvenido que desea??', 'lo siento ya cerramos',
   '11:00:00', '20:00:00', 1, '[1,2,3,4,5]', '2026-02-26 22:54:14');
UNLOCK TABLES;


-- ============================================================
-- 10. MENSAJES_AUTOMATICOS
-- ============================================================

DROP TABLE IF EXISTS `mensajes_automaticos`;
CREATE TABLE `mensajes_automaticos` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `empresa_id`       INT          NOT NULL,
  `texto_disparador` VARCHAR(255) NOT NULL
                     COMMENT 'Palabras clave separadas por coma que activan la respuesta automática',
  `fecha_creacion`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id` (`empresa_id`),
  CONSTRAINT `mensajes_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `mensajes_automaticos` WRITE;
INSERT INTO `mensajes_automaticos` VALUES
  (1, 1, 'producots,productos,prod', '2026-02-26 23:41:55'),
  (2, 1, 'pedidos,pedidos,ped',      '2026-02-26 23:42:20'),
  (3, 1, 'cancelar,cancelar',        '2026-02-26 23:43:15');
UNLOCK TABLES;


-- ============================================================
-- 11. PEDIDOS
-- ============================================================

DROP TABLE IF EXISTS `pedidos`;
CREATE TABLE `pedidos` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `empresa_id`       INT           NOT NULL,
  `nombre_cliente`   VARCHAR(255)  DEFAULT NULL,
  `telefono_cliente` VARCHAR(20)   NOT NULL,
  `estado`           ENUM('temporal','pendiente','en_proceso','entregado','cancelado')
                     DEFAULT 'temporal',
  `total`            DECIMAL(10,2) DEFAULT '0.00',
  `items`            JSON          DEFAULT NULL
                     COMMENT 'Array de items: [{itemId, nombre, cantidad, precioUnitario, subtotal}]',
  `fecha_creacion`   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  `jid_whatsapp`     VARCHAR(255)  DEFAULT NULL,
  `push_name`        VARCHAR(255)  DEFAULT NULL,
  `numero_real`      VARCHAR(50)   DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_empresa_telefono`        (`empresa_id`, `telefono_cliente`),
  KEY `idx_empresa_telefono_estado` (`empresa_id`, `telefono_cliente`, `estado`),
  CONSTRAINT `pedidos_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

LOCK TABLES `pedidos` WRITE;
INSERT INTO `pedidos` VALUES
  (1, 1, 'juanlineage472', '52064214372462', 'pendiente', 200.00,
   '[{"nombre":"producto2","cantidad":1,"subtotal":200,"producto_id":1,"precio_unitario":200}]',
   '2026-02-27 21:08:40', '52064214372462@lid', 'juanlineage472', NULL);
UNLOCK TABLES;


-- ============================================================
-- 12. RESERVACIONES
-- ============================================================
-- Sirve para empresas de servicios que manejan citas.
-- También puede usarla una empresa de productos si quiere agendar entregas.

DROP TABLE IF EXISTS `reservaciones`;
CREATE TABLE `reservaciones` (
  `id`                INT          NOT NULL AUTO_INCREMENT,
  `empresa_id`        INT          NOT NULL,
  `servicio_id`       INT          DEFAULT NULL
                      COMMENT 'FK opcional a catalogo_servicios si aplica',
  `nombre_cliente`    VARCHAR(255) NOT NULL,
  `telefono_cliente`  VARCHAR(20)  NOT NULL,
  `fecha_reservacion` DATETIME     NOT NULL,
  `numero_personas`   INT          DEFAULT '1',
  `estado`            ENUM('pendiente','confirmada','cancelada') DEFAULT 'pendiente',
  `notas`             TEXT         DEFAULT NULL,
  `fecha_creacion`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `empresa_id`  (`empresa_id`),
  KEY `servicio_id` (`servicio_id`),
  CONSTRAINT `reservaciones_empresa_fk` FOREIGN KEY (`empresa_id`)
    REFERENCES `empresas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservaciones_servicio_fk` FOREIGN KEY (`servicio_id`)
    REFERENCES `catalogo_servicios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;

-- Schema v3 completado - 2026-03-02
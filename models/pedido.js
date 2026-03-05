// Exportar variables de ambiente de base de datos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Definición para capturar a largo plazo datos de pagos y solicitudes
const Pedido = sequelize.define('Pedido', {
  // Llave única por base tabular
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identifica a quién hacer el pago o a dónde sumar a las ventas
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Nombre dado por parte del cliente al hacer compra
  nombre_cliente: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Obligatorio, número de contacto con o sin código
  telefono_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },

  // Campos que ayudan al formato e integración con canales de terceros de Whatsapp 
  push_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nombre interno de WhatsApp'
  },
  jid_whatsapp: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Identificador técnico original de WhatsApp'
  },
  numero_real: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Número de teléfono real decodificado'
  },

  // Condición de enrutamiento o control por pedidos listos para llevar o pagos
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_proceso', 'entregado', 'cancelado'),
    defaultValue: 'pendiente'
  },
  // Dinero consolidado sumando productos
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  // Elementos listados de forma flexible gracias al JSON
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  // Fecha exacta de registro del evento en la BD
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Convención para el esquema sql
  tableName: 'pedidos',
  // Campos de tiempo inactivos
  timestamps: false
});

// Entrega del componente exportable
module.exports = Pedido;
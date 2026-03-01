const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre_cliente: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  telefono_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  // 🔥 NUEVOS CAMPOS AGREGADOS
  push_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Nombre de WhatsApp (pushName)'
  },
  jid_whatsapp: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'JID original de WhatsApp (puede ser @lid o @s.whatsapp.net)'
  },
  numero_real: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Número de teléfono real (solo si se pudo descifrar)'
  },
  // 🔥 FIN NUEVOS CAMPOS
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_proceso', 'entregado', 'cancelado'),
    defaultValue: 'pendiente'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  items: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'pedidos',
  timestamps: false
});

module.exports = Pedido;
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
    allowNull: true  // ← Permite NULL hasta que dé su nombre
  },
  telefono_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'en_proceso', 'entregado', 'cancelado'),  // 🔥 SIN 'temporal'
    defaultValue: 'pendiente'  // ✅ Default es 'pendiente'
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
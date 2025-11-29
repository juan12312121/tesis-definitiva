// models/CatalogoItem.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CatalogoItem = sequelize.define('CatalogoItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  nombre_item: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  tipo_item: {
    type: DataTypes.ENUM('producto', 'servicio'),
    defaultValue: 'producto'
  },
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'catalogo_items',
  timestamps: false,
  indexes: [
    {
      fields: ['empresa_id']
    },
    {
      fields: ['tipo_item']
    }
  ]
});

module.exports = CatalogoItem;
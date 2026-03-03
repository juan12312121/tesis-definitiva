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
    references: { model: 'empresas', key: 'id' }
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'categorias_productos', key: 'id' }
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
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  tags: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'catalogo_items',
  timestamps: false,
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['categoria_id'] },
    { fields: ['disponible'] }
  ]
});

module.exports = CatalogoItem;
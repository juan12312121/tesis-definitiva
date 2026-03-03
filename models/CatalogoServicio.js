const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CatalogoServicio = sequelize.define('CatalogoServicio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nombre: {
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
  duracion_minutos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  requiere_agendamiento: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'catalogo_servicios',
  timestamps: false
});

module.exports = CatalogoServicio;
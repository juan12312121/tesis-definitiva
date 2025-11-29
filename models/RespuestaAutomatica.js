// models/RespuestaAutomatica.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // ← Agregar llaves destructuring

const RespuestaAutomatica = sequelize.define('RespuestaAutomatica', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'empresa_id'
  },
  texto_disparador: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'texto_disparador'
  },
  respuesta: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo_respuesta: {
    type: DataTypes.ENUM('texto', 'imagen', 'documento', 'enlace'),
    defaultValue: 'texto',
    field: 'tipo_respuesta'
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  tableName: 'mensajes_automaticos',
  timestamps: false,
  underscored: true
});

module.exports = RespuestaAutomatica;
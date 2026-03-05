// Llamado a los tipos de base de datos
const { DataTypes } = require('sequelize');
// Conexión principal
const { sequelize } = require('../config/database');

// Configuración general de respuestas predefinidas automáticas
const RespuestaAutomatica = sequelize.define('RespuestaAutomatica', {
  // Clave principal
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa que registra la respuesta
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'empresa_id'
  },
  // Palabra clave o texto que acciona la respuesta
  texto_disparador: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'texto_disparador'
  },
  // Fechas correspondientes
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'fecha_creacion'
  }
}, {
  // Ajustes de la tabla mensajes_automaticos
  tableName: 'mensajes_automaticos',
  timestamps: false,
  underscored: true
});

// Entrega del modelo final
module.exports = RespuestaAutomatica;
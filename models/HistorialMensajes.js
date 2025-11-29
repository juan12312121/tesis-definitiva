const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistorialMensajes = sequelize.define('HistorialMensajes', {
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
  numero_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  mensaje_enviado: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje que el bot envió al cliente'
  },
  mensaje_recibido: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje que el cliente envió al bot'
  },
  tipo_mensaje: {
    type: DataTypes.ENUM('texto', 'imagen', 'documento', 'enlace'),
    defaultValue: 'texto'
  },
  fecha_envio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'historial_mensajes',
  timestamps: false
});

module.exports = HistorialMensajes;
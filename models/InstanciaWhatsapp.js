const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InstanciaWhatsapp = sequelize.define('InstanciaWhatsapp', {
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
  nombre_sesion: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  codigo_qr: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  conectado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  ultima_conexion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'instancias_whatsapp',
  timestamps: false
});

module.exports = InstanciaWhatsapp;
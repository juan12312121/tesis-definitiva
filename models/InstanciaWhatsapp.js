// Importar desde sequelize los tipos de datos
const { DataTypes } = require('sequelize');
// Importar el objeto con la conexión validada
const { sequelize } = require('../config/database');

// Modelo para manejar las conexiones a Whatsapp de cada empresa
const InstanciaWhatsapp = sequelize.define('InstanciaWhatsapp', {
  // Identificador de la instancia configurada
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identificador de la empresa propietaria de la instancia
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  // Nombre identificador para la sesión interna en el gestor
  nombre_sesion: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Hash o texto del código QR generado antes de escanearlo (si aplica)
  codigo_qr: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Indicador de estado de la conexión con el servidor
  conectado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Fecha y hora en la que se estableció contacto reciente
  ultima_conexion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Momento en que se generó la instancia por primera vez
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Etiqueta para la de base de datos relacional
  tableName: 'instancias_whatsapp',
  // No se usan estampas de tiempo preestablecidas por Sequelize
  timestamps: false
});

// Exportación lista para ser consumida
module.exports = InstanciaWhatsapp;
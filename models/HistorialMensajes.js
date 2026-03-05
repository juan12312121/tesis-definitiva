// Importar tipos de datos y conexión a la base de datos
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Definir modelo para las conversaciones y mensajes
const HistorialMensajes = sequelize.define('HistorialMensajes', {
  // Identificador de cada registro o mensaje
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa que recibe o envía el mensaje
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  // Número de teléfono del cliente en la conversación
  numero_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  // Texto del mensaje que envía el chatbot al cliente
  mensaje_enviado: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje que el bot envio al cliente'
  },
  // Texto del mensaje que el cliente envió al chatbot
  mensaje_recibido: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Mensaje que el cliente envio al bot'
  },
  // Clasificación del contenido del mensaje
  tipo_mensaje: {
    type: DataTypes.ENUM('texto', 'imagen', 'documento', 'enlace'),
    defaultValue: 'texto'
  },
  // Fecha y hora exacta del envío del mensaje
  fecha_envio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre asignado a la tabla en base de datos
  tableName: 'historial_mensajes',
  // Deshabilitar fecha de actualización y creación de Sequelize
  timestamps: false
});

// Se exporta el modelo definido
module.exports = HistorialMensajes;
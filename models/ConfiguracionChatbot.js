// Importar los tipos de datos y la instancia de conexión
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Definir el modelo para la configuración del chatbot
const ConfiguracionChatbot = sequelize.define('ConfiguracionChatbot', {
  // Identificador único de la configuración
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa asociada a esta configuración
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // Cada empresa tiene una única configuración
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  // Mensaje que se envía al iniciar una conversación
  mensaje_bienvenida: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Mensaje para cuando el contacto escribe fuera del horario de atención
  mensaje_fuera_horario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Hora de inicio de atención
  horario_inicio: {
    type: DataTypes.TIME,
    allowNull: true
  },
  // Hora de fin de atención
  horario_fin: {
    type: DataTypes.TIME,
    allowNull: true
  },
  // Indicador de si el chatbot está encendido para la empresa
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Días de la semana en los que opera el chatbot
  dias_laborales: {
    type: DataTypes.JSON,
    allowNull: true,
    // Getter para establecer un valor por defecto si es nulo
    get() {
      const rawValue = this.getDataValue('dias_laborales');
      // Si es null o undefined, retornar el array por defecto (Lunes a Viernes)
      return rawValue || [1, 2, 3, 4, 5];
    }
  },
  // Fecha de creación del registro de configuración
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre de la tabla
  tableName: 'configuraciones_chatbot',
  // Sin campos de tiempo automáticos
  timestamps: false
});

// Exportar el modelo
module.exports = ConfiguracionChatbot;
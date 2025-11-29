const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConfiguracionChatbot = sequelize.define('ConfiguracionChatbot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  mensaje_bienvenida: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mensaje_fuera_horario: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  horario_inicio: {
    type: DataTypes.TIME,
    allowNull: true
  },
  horario_fin: {
    type: DataTypes.TIME,
    allowNull: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  dias_laborales: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const rawValue = this.getDataValue('dias_laborales');
      // Si es null o undefined, retornar el array por defecto (Lunes a Viernes)
      return rawValue || [1, 2, 3, 4, 5];
    }
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'configuraciones_chatbot',
  timestamps: false
});

module.exports = ConfiguracionChatbot;
// Importar tipos de datos de Sequelize
const { DataTypes } = require('sequelize');
// Importar conexión a la base de datos
const { sequelize } = require('../config/database');

// Definir el modelo para la disponibilidad de servicios
const DisponibilidadServicio = sequelize.define('DisponibilidadServicio', {
  // Identificador único del registro de disponibilidad
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Servicio al que aplica esta disponibilidad
  servicio_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Empresa que ofrece el servicio
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Día de la semana (0 a 6, donde 0 es domingo o lunes según convención)
  dia_semana: {
    type: DataTypes.TINYINT,
    allowNull: false,
    validate: { min: 0, max: 6 }
  },
  // Hora de inicio de disponibilidad en el día
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  // Hora de fin de disponibilidad en el día
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  // Indica si este bloque de tiempo está activo
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  // Nombre de la tabla
  tableName: 'disponibilidad_servicios',
  // Deshabilitar timestamps automáticos
  timestamps: false
});

// Exportar el modelo
module.exports = DisponibilidadServicio;
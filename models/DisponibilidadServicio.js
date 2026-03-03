const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DisponibilidadServicio = sequelize.define('DisponibilidadServicio', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  servicio_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  dia_semana: {
    type: DataTypes.TINYINT,
    allowNull: false,
    validate: { min: 0, max: 6 }
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'disponibilidad_servicios',
  timestamps: false
});

module.exports = DisponibilidadServicio;
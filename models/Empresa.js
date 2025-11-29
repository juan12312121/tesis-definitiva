const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Empresa = sequelize.define('Empresa', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  correo_contacto: {
    type: DataTypes.STRING(255),
    allowNull: true,  // Ahora es opcional, solo informativo
    validate: {
      isEmail: true
    }
  },
  telefono_contacto: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'empresas',
  timestamps: false
});

module.exports = Empresa;
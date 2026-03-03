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
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  telefono_contacto: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  // ── NUEVO ──────────────────────────────────────────────────
  tipo_negocio: {
    type: DataTypes.ENUM('productos', 'servicios'),
    allowNull: true,
    defaultValue: null,
    comment: 'Preferencia del onboarding. No restringe el uso de productos ni servicios.'
  },
  onboarding_completado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'false = aún no pasó por el onboarding, true = ya lo completó'
  },
  // ── FIN NUEVO ──────────────────────────────────────────────

  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'empresas',
  timestamps: false
});

module.exports = Empresa;
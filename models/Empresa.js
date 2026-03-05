// Importar los tipos de datos requeridos de Sequelize
const { DataTypes } = require('sequelize');
// Importar la instancia de base de datos
const { sequelize } = require('../config/database');

// Definir el modelo de Empresa
const Empresa = sequelize.define('Empresa', {
  // Identificador único de la empresa
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Nombre comercial de la empresa
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Correo electrónico principal de contacto
  correo_contacto: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  // Número telefónico o celular de contacto de la empresa
  telefono_contacto: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  // Campo que indica el tipo de negocio enfocado (productos o servicios)
  tipo_negocio: {
    type: DataTypes.ENUM('productos', 'servicios'),
    allowNull: true,
    defaultValue: null,
    comment: 'Preferencia del proceso de configuracion inicial. No restringe el uso de ambos tipos.'
  },
  // Bandera que indica si la empresa terminó el proceso de configuración inicial
  onboarding_completado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'falso es igual a proceso pendiente, verdadero indica proceso completado'
  },

  // Fecha en la que la cuenta de empresa fue creada
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre exacto de la tabla en base de datos
  tableName: 'empresas',
  // Se omiten los timestamps automáticos por defecto
  timestamps: false
});

// Exportar el modelo Empresa
module.exports = Empresa;
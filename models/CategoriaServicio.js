// Importar los tipos de datos de Sequelize
const { DataTypes } = require('sequelize');
// Importar la agregación a la base de datos
const { sequelize } = require('../config/database');

// Definir el modelo para las categorías de servicios
const CategoriaServicio = sequelize.define('CategoriaServicio', {
  // Identificador único de la categoría de servicio
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identificador de la empresa asociada
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Nombre de la categoría de servicio
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  // Descripción de la categoría
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Estado de la categoría (activa o inactiva)
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Fecha en que se creó la categoría
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre de la tabla en base de datos
  tableName: 'categorias_servicios',
  // Deshabilitar timestamps integrados de Sequelize
  timestamps: false
});

// Exportar modelo
module.exports = CategoriaServicio;
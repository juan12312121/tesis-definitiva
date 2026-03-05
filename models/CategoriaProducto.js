// Importar los tipos de datos de Sequelize
const { DataTypes } = require('sequelize');
// Importar la conexión a la base de datos
const { sequelize } = require('../config/database');

// Definir el modelo para las categorías de productos
const CategoriaProducto = sequelize.define('CategoriaProducto', {
  // Identificador único de la categoría
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa dueña de esta categoría
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Nombre de la categoría
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  // Descripción detallada de la categoría
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Indicador de si la categoría está activa
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Fecha de creación de la categoría
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre de la tabla en la base de datos
  tableName: 'categorias_productos',
  // Desactivar timestamps automáticos
  timestamps: false
});

// Exportar el modelo
module.exports = CategoriaProducto;
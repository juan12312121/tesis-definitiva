// Importar los tipos de datos de Sequelize
const { DataTypes } = require('sequelize');
// Importar la instancia de conexión a la base de datos
const { sequelize } = require('../config/database');

// Definir el modelo para los items del catálogo
const CatalogoItem = sequelize.define('CatalogoItem', {
  // Identificador único del item
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identificador de la empresa a la que pertenece el item
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'empresas', key: 'id' }
  },
  // Identificador de la categoría del item (opcional)
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'categorias_productos', key: 'id' }
  },
  // Nombre del item en el catálogo
  nombre_item: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Descripción detallada del item
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Precio del item
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // URL de la imagen representativa del item
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Cantidad disponible en inventario
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Indicador de si el item está disponible para la venta
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Etiquetas para facilitar la búsqueda del item
  tags: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Fecha en que se creó el registro
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // Fecha de la última actualización del registro
  fecha_actualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre de la tabla en la base de datos
  tableName: 'catalogo_items',
  // Desactivar los timestamps automáticos de Sequelize
  timestamps: false,
  // Índices para optimizar las consultas
  indexes: [
    { fields: ['empresa_id'] },
    { fields: ['categoria_id'] },
    { fields: ['disponible'] }
  ]
});

// Exportar el modelo para su uso en otras partes de la aplicación
module.exports = CatalogoItem;
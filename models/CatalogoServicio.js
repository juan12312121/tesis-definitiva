// Importar los tipos de datos de Sequelize
const { DataTypes } = require('sequelize');
// Importar la instancia de conexión a la base de datos
const { sequelize } = require('../config/database');

// Definir el modelo para los servicios del catálogo
const CatalogoServicio = sequelize.define('CatalogoServicio', {
  // Identificador único del servicio
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Identificador de la empresa que ofrece el servicio
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Identificador de la categoría del servicio
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Nombre del servicio
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Descripción del servicio ofrecido
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Precio por el servicio
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  // Duración estimada del servicio en minutos
  duracion_minutos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Indica si el servicio necesita ser agendado previamente
  requiere_agendamiento: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // Indica si el servicio está disponible actualmente
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // URL de la imagen representativa del servicio
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Etiquetas para búsqueda del servicio
  tags: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Fecha de creación del registro
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
  tableName: 'catalogo_servicios',
  // Desactivar los timestamps automáticos
  timestamps: false
});

// Exportar el modelo
module.exports = CatalogoServicio;
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CatalogoItem = sequelize.define('CatalogoItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  nombre_item: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  tipo_item: {
    type: DataTypes.ENUM('producto', 'servicio'),
    defaultValue: 'producto'
  },
  imagen_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // CAMPOS PARA PRODUCTOS
  stock: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  disponible: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // CAMPOS PARA SERVICIOS
  duracion_minutos: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  requiere_agendamiento: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  
  // CATEGORIA CON ENUM
  categoria: {
    type: DataTypes.ENUM(
      // Restaurantes/Comida
      'comida',
      'bebidas',
      'postres',
      'snacks',
      
      // Belleza/Estética
      'cortes',
      'tintes',
      'peinados',
      'manicure',
      'pedicure',
      'depilacion',
      'faciales',
      'masajes',
      
      // Barbería
      'corte_caballero',
      'barba',
      'afeitado',
      
      // Spa/Wellness
      'masaje_terapeutico',
      'masaje_relajante',
      'tratamientos_corporales',
      'aromaterapia',
      
      // Médico/Dental
      'consulta',
      'procedimiento',
      'examenes',
      'cirugia',
      
      // Tienda
      'ropa',
      'accesorios',
      'electronicos',
      'hogar',
      
      // Otros
      'otro'
    ),
    allowNull: true
  },
  
  tags: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notas_adicionales: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'catalogo_items',
  timestamps: false,
  indexes: [
    {
      fields: ['empresa_id']
    },
    {
      fields: ['tipo_item']
    },
    {
      fields: ['categoria']
    },
    {
      fields: ['disponible']
    }
  ]
});

module.exports = CatalogoItem;
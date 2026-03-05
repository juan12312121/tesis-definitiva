// Llamado a Sequelize y a la conexión inicializada
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Configuración del modelo para el agendamiento de citas y reservaciones
const Reservacion = sequelize.define('Reservacion', {
  // Se define el ID auto incremental principal
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa destino de la reserva
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Servicio específico reservado
  servicio_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // Nombre explícito de la persona que agenda
  nombre_cliente: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Contacto telefónico celular preferiblemente
  telefono_cliente: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  // Fecha designada para llevar a cabo el servicio o producto
  fecha_reservacion: {
    type: DataTypes.DATE,
    allowNull: false
  },
  // Cantidad de asistentes para la reserva realizada
  numero_personas: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  // Control de flujo para conocer el estado y validez actual de la reserva
  estado: {
    type: DataTypes.ENUM('pendiente', 'confirmada', 'cancelada'),
    defaultValue: 'pendiente'
  },
  // Espacio libre para apuntar información adicional importante o requerimientos
  notas: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  // Ajustes finales de tabla y columnas
  tableName: 'reservaciones',
  // En este caso si manejamos timestamps para creaciones
  timestamps: true,
  // Se liga al campo personalizado
  createdAt: 'fecha_creacion',
  // Y se deshabilita la escritura automática sobre actualizaciones
  updatedAt: false
});

// Queda expuesto el modelo para otras capas lógicas
module.exports = Reservacion;
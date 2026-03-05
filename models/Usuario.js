// Importación de tipos
const { DataTypes } = require('sequelize');
// Importación de instancia base
const { sequelize } = require('../config/database');
// Herramienta para encriptación de claves
const bcrypt = require('bcryptjs');

// Modelo fundamental para acceso e identidad de cuentas
const Usuario = sequelize.define('Usuario', {
  // Identificador de usuario en sistema
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // Empresa en la que el usuario puede obrar
  empresa_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id'
    }
  },
  // Nombre personal de la cuenta
  nombre: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Correo para acceso y notificaciones, debe ser único
  correo: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  // Clave encriptada para validación
  contraseña: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  // Teléfono como dato secundario
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  // Indicador de correo validado
  verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Almacenamiento temporal para comprobaciones
  token_verificacion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  // Fecha histórica de registro
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // Nombre estándar en sistema de bases
  tableName: 'usuarios',
  timestamps: false,
  // Efectos secundarios o ganchos antes de guardar registros
  hooks: {
    beforeCreate: async (usuario) => {
      // Si la cuenta tiene clave, se realiza un proceso de encriptamiento
      if (usuario.contraseña) {
        const salt = await bcrypt.genSalt(10);
        usuario.contraseña = await bcrypt.hash(usuario.contraseña, salt);
      }
    }
  }
});

// Método adjunto para poder evaluar las contraseñas que envíen por interfaz
Usuario.prototype.comparePassword = async function (candidatePassword) {
  // Compara la clave limpia enviada con la clave procesada en perfil
  return await bcrypt.compare(candidatePassword, this.contraseña);
};

// Devolver módulo Usuario
module.exports = Usuario;
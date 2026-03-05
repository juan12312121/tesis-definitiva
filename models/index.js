// Centralizador que facilita las importaciones de todos los modelos de la carpeta
const Empresa = require('./Empresa');
const Usuario = require('./Usuario');
const InstanciaWhatsapp = require('./InstanciaWhatsapp');
const ConfiguracionChatbot = require('./ConfiguracionChatbot');
const CatalogoItem = require('./CatalogoItem');
const Pedido = require('./pedido');

// Modelos específicos para categorías y administración de reservaciones
const CategoriaProducto = require('./CategoriaProducto');
const CategoriaServicio = require('./CategoriaServicio');
const CatalogoServicio = require('./CatalogoServicio');
const DisponibilidadServicio = require('./DisponibilidadServicio');
const Reservacion = require('./Reservacion');


// Definición formal de las relaciones entre todos los modelos.

// Una Empresa puede tener múltiples usuarios administrando
Empresa.hasMany(Usuario, { foreignKey: 'empresa_id', as: 'usuarios' });
Usuario.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Relación exclusiva de una a una entre una configuración de teléfono y su empresa
Empresa.hasOne(InstanciaWhatsapp, { foreignKey: 'empresa_id', as: 'instancia_whatsapp' });
InstanciaWhatsapp.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Relación exclusiva de configuraciones de un bot automático por cada entidad empresarial
Empresa.hasOne(ConfiguracionChatbot, { foreignKey: 'empresa_id', as: 'configuracion_chatbot' });
ConfiguracionChatbot.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Asociación básica de todos los productos de catálogo para una firma
Empresa.hasMany(CatalogoItem, { foreignKey: 'empresa_id', as: 'catalogo_items' });
CatalogoItem.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Las ventas o pedidos que se emiten pertenecen a los datos de la misma empresa
Empresa.hasMany(Pedido, { foreignKey: 'empresa_id', as: 'pedidos' });
Pedido.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });


// Declaración especial para las entidades relacionales nuevas añadidas con antelación

// Empresa y sus clasificaciones por producto
Empresa.hasMany(CategoriaProducto, { foreignKey: 'empresa_id', as: 'categorias_productos' });
CategoriaProducto.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// La categoría vincula internamente cuáles elementos del catálogo pertenecen
CategoriaProducto.hasMany(CatalogoItem, { foreignKey: 'categoria_id', as: 'items' });
CatalogoItem.belongsTo(CategoriaProducto, { foreignKey: 'categoria_id', as: 'categoria' });

// Empresa posee además un esquema distinto por sus servicios
Empresa.hasMany(CategoriaServicio, { foreignKey: 'empresa_id', as: 'categorias_servicios' });
CategoriaServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Relacionamos los elementos puntuales de tipos de servicio prestados para las empresas
Empresa.hasMany(CatalogoServicio, { foreignKey: 'empresa_id', as: 'catalogo_servicios' });
CatalogoServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Asociación que empaqueta distintos servicios prestables a nivel interior en categorías
CategoriaServicio.hasMany(CatalogoServicio, { foreignKey: 'categoria_id', as: 'servicios' });
CatalogoServicio.belongsTo(CategoriaServicio, { foreignKey: 'categoria_id', as: 'categoria' });

// Identificador de los horarios que rigen un único servicio
CatalogoServicio.hasMany(DisponibilidadServicio, { foreignKey: 'servicio_id', as: 'disponibilidad' });
DisponibilidadServicio.belongsTo(CatalogoServicio, { foreignKey: 'servicio_id', as: 'servicio' });

// Relación directa de todas las disponibilidades que una empresa pueda ofrecer en general
Empresa.hasMany(DisponibilidadServicio, { foreignKey: 'empresa_id', as: 'disponibilidades' });
DisponibilidadServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Las empresas albergan cada uno de los agendamientos que solicitan los usuarios externos
Empresa.hasMany(Reservacion, { foreignKey: 'empresa_id', as: 'reservaciones' });
Reservacion.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Cada reserva es específica a un elemento de tipo servicio
CatalogoServicio.hasMany(Reservacion, { foreignKey: 'servicio_id', as: 'reservaciones' });
Reservacion.belongsTo(CatalogoServicio, { foreignKey: 'servicio_id', as: 'servicio' });


// Empaquetador final 
module.exports = {
  Empresa,
  Usuario,
  InstanciaWhatsapp,
  ConfiguracionChatbot,
  CatalogoItem,
  Pedido,
  CategoriaProducto,
  CategoriaServicio,
  CatalogoServicio,
  DisponibilidadServicio,
  Reservacion
};
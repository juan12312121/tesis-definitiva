const Empresa              = require('./Empresa');
const Usuario              = require('./Usuario');
const InstanciaWhatsapp    = require('./InstanciaWhatsapp');
const ConfiguracionChatbot = require('./ConfiguracionChatbot');
const CatalogoItem         = require('./CatalogoItem');
const Pedido               = require('./Pedido');

// ── NUEVOS ────────────────────────────────────────────────────
const CategoriaProducto      = require('./CategoriaProducto');
const CategoriaServicio      = require('./CategoriaServicio');
const CatalogoServicio       = require('./CatalogoServicio');
const DisponibilidadServicio = require('./DisponibilidadServicio');
// ── FIN NUEVOS ───────────────────────────────────────────────

// ── Relaciones que ya tenías ──────────────────────────────────

Empresa.hasMany(Usuario, { foreignKey: 'empresa_id', as: 'usuarios' });
Usuario.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

Empresa.hasOne(InstanciaWhatsapp, { foreignKey: 'empresa_id', as: 'instancia_whatsapp' });
InstanciaWhatsapp.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

Empresa.hasOne(ConfiguracionChatbot, { foreignKey: 'empresa_id', as: 'configuracion_chatbot' });
ConfiguracionChatbot.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

Empresa.hasMany(CatalogoItem, { foreignKey: 'empresa_id', as: 'catalogo_items' });
CatalogoItem.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

Empresa.hasMany(Pedido, { foreignKey: 'empresa_id', as: 'pedidos' });
Pedido.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// ── Relaciones nuevas ─────────────────────────────────────────

// Empresa ↔ CategoriaProducto
Empresa.hasMany(CategoriaProducto, { foreignKey: 'empresa_id', as: 'categorias_productos' });
CategoriaProducto.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// CategoriaProducto ↔ CatalogoItem
CategoriaProducto.hasMany(CatalogoItem, { foreignKey: 'categoria_id', as: 'items' });
CatalogoItem.belongsTo(CategoriaProducto, { foreignKey: 'categoria_id', as: 'categoria' });

// Empresa ↔ CategoriaServicio
Empresa.hasMany(CategoriaServicio, { foreignKey: 'empresa_id', as: 'categorias_servicios' });
CategoriaServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// Empresa ↔ CatalogoServicio
Empresa.hasMany(CatalogoServicio, { foreignKey: 'empresa_id', as: 'catalogo_servicios' });
CatalogoServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// CategoriaServicio ↔ CatalogoServicio
CategoriaServicio.hasMany(CatalogoServicio, { foreignKey: 'categoria_id', as: 'servicios' });
CatalogoServicio.belongsTo(CategoriaServicio, { foreignKey: 'categoria_id', as: 'categoria' });

// CatalogoServicio ↔ DisponibilidadServicio
CatalogoServicio.hasMany(DisponibilidadServicio, { foreignKey: 'servicio_id', as: 'disponibilidad' });
DisponibilidadServicio.belongsTo(CatalogoServicio, { foreignKey: 'servicio_id', as: 'servicio' });

// Empresa ↔ DisponibilidadServicio
Empresa.hasMany(DisponibilidadServicio, { foreignKey: 'empresa_id', as: 'disponibilidades' });
DisponibilidadServicio.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });

// ─────────────────────────────────────────────────────────────

module.exports = {
  Empresa,
  Usuario,
  InstanciaWhatsapp,
  ConfiguracionChatbot,
  CatalogoItem,
  Pedido,
  // nuevos
  CategoriaProducto,
  CategoriaServicio,
  CatalogoServicio,
  DisponibilidadServicio
};
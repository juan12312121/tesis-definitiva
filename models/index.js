// models/index.js
const Empresa = require('./Empresa');
const Usuario = require('./Usuario');
const InstanciaWhatsapp = require('./InstanciaWhatsapp');
const ConfiguracionChatbot = require('./ConfiguracionChatbot');
const CatalogoItem = require('./CatalogoItem'); // ← AGREGAR

// Relaciones existentes...
Empresa.hasMany(Usuario, {
  foreignKey: 'empresa_id',
  as: 'usuarios'
});

Usuario.belongsTo(Empresa, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});

Empresa.hasOne(InstanciaWhatsapp, {
  foreignKey: 'empresa_id',
  as: 'instancia_whatsapp'
});

InstanciaWhatsapp.belongsTo(Empresa, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});

Empresa.hasOne(ConfiguracionChatbot, {
  foreignKey: 'empresa_id',
  as: 'configuracion_chatbot'
});

ConfiguracionChatbot.belongsTo(Empresa, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});

// ← NUEVA RELACIÓN PARA CATÁLOGO
Empresa.hasMany(CatalogoItem, {
  foreignKey: 'empresa_id',
  as: 'catalogo_items'
});

CatalogoItem.belongsTo(Empresa, {
  foreignKey: 'empresa_id',
  as: 'empresa'
});

module.exports = {
  Empresa,
  Usuario,
  InstanciaWhatsapp,
  ConfiguracionChatbot,
  CatalogoItem // ← AGREGAR
};
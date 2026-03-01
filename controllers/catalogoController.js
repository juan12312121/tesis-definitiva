// controllers/catalogoController.js
// ============================================================
// CONTROLADOR DE CATÁLOGO + STOCK BAJO INTEGRADO
// ============================================================

const { CatalogoItem } = require('../models');
const { Empresa } = require('../models'); // Asegúrate que exportas Empresa en models/index.js
const { Op } = require('sequelize');

const catalogoController = {

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/publico/:empresaId
  // ─────────────────────────────────────────────────────────
  obtenerCatalogoPublico: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const items = await CatalogoItem.findAll({
        where: {
          empresa_id: empresaId,
          disponible: true
        },
        order: [['tipo_item', 'ASC'], ['nombre_item', 'ASC']]
      });

      return res.json({
        success: true,
        total: items.length,
        data: items.map(item => ({
          id: item.id,
          nombre_item: item.nombre_item,
          descripcion: item.descripcion,
          precio: item.precio,
          tipo_item: item.tipo_item,
          imagen_url: item.imagen_url,
          categoria: item.categoria,
          stock: item.stock,
          disponible: item.disponible
        }))
      });

    } catch (error) {
      console.error('Error al obtener catálogo público:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/ (privado, requiere token)
  // ─────────────────────────────────────────────────────────
  obtenerCatalogo: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { tipo, categoria, disponible, busqueda } = req.query;

      const where = { empresa_id: empresaId };

      if (tipo) where.tipo_item = tipo;
      if (categoria) where.categoria = categoria;
      if (disponible !== undefined) where.disponible = disponible === 'true';
      if (busqueda) {
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda}%` } },
          { descripcion: { [Op.like]: `%${busqueda}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({
        where,
        order: [['tipo_item', 'ASC'], ['nombre_item', 'ASC']]
      });

      return res.json({ success: true, total: items.length, data: items });

    } catch (error) {
      console.error('Error al obtener catálogo:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // POST /api/catalogo/
  // ─────────────────────────────────────────────────────────
  crearItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const datos = req.body;

      const nuevoItem = await CatalogoItem.create({
        ...datos,
        empresa_id: empresaId,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      });

      return res.status(201).json({
        success: true,
        message: 'Item creado exitosamente',
        data: nuevoItem
      });

    } catch (error) {
      console.error('Error al crear item:', error);
      return res.status(500).json({ success: false, message: 'Error al crear item' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/:id
  // ─────────────────────────────────────────────────────────
  obtenerItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      const item = await CatalogoItem.findOne({
        where: { id, empresa_id: empresaId }
      });

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item no encontrado' });
      }

      return res.json({ success: true, data: item });

    } catch (error) {
      console.error('Error al obtener item:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener item' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // PUT /api/catalogo/:id
  // ─────────────────────────────────────────────────────────
  actualizarItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;
      const datos = req.body;

      const item = await CatalogoItem.findOne({
        where: { id, empresa_id: empresaId }
      });

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item no encontrado' });
      }

      await item.update({ ...datos, fecha_actualizacion: new Date() });

      return res.json({ success: true, message: 'Item actualizado exitosamente', data: item });

    } catch (error) {
      console.error('Error al actualizar item:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar item' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // DELETE /api/catalogo/:id
  // ─────────────────────────────────────────────────────────
  eliminarItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      const item = await CatalogoItem.findOne({
        where: { id, empresa_id: empresaId }
      });

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item no encontrado' });
      }

      await item.destroy();

      return res.json({ success: true, message: 'Item eliminado exitosamente' });

    } catch (error) {
      console.error('Error al eliminar item:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar item' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/buscar?q=...&tipo=...
  // ─────────────────────────────────────────────────────────
  buscarItems: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { busqueda, tipo } = req.query;

      const where = { empresa_id: empresaId };
      if (tipo) where.tipo_item = tipo;
      if (busqueda) {
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda}%` } },
          { descripcion: { [Op.like]: `%${busqueda}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({ where, limit: 20 });

      return res.json({ success: true, total: items.length, data: items });

    } catch (error) {
      console.error('Error al buscar items:', error);
      return res.status(500).json({ success: false, message: 'Error al buscar items' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/categorias
  // ─────────────────────────────────────────────────────────
  obtenerCategorias: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;

      const items = await CatalogoItem.findAll({
        where: { empresa_id: empresaId, categoria: { [Op.not]: null } },
        attributes: ['categoria'],
        group: ['categoria']
      });

      const categorias = items.map(i => i.categoria);
      return res.json({ success: true, data: categorias });

    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/categorias-disponibles
  // ─────────────────────────────────────────────────────────
  obtenerCategoriasDisponibles: async (req, res) => {
    const categorias = [
      { grupo: 'Restaurantes/Comida', valores: ['comida','bebidas','postres','snacks'] },
      { grupo: 'Belleza/Estética', valores: ['cortes','tintes','peinados','manicure','pedicure','depilacion','faciales','masajes'] },
      { grupo: 'Barbería', valores: ['corte_caballero','barba','afeitado'] },
      { grupo: 'Spa/Wellness', valores: ['masaje_terapeutico','masaje_relajante','tratamientos_corporales','aromaterapia'] },
      { grupo: 'Médico/Dental', valores: ['consulta','procedimiento','examenes','cirugia'] },
      { grupo: 'Tienda', valores: ['ropa','accesorios','electronicos','hogar'] },
      { grupo: 'Otros', valores: ['otro'] }
    ];
    return res.json({ success: true, data: categorias });
  },

  // ─────────────────────────────────────────────────────────
  // POST /api/catalogo/categorias (agregar categoría custom)
  // ─────────────────────────────────────────────────────────
  agregarCategoria: async (req, res) => {
    return res.json({ success: true, message: 'Funcionalidad de categorías custom próximamente' });
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/estadisticas
  // ─────────────────────────────────────────────────────────
  obtenerEstadisticas: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;

      const [totalProductos, totalServicios, sinStock, stockBajo] = await Promise.all([
        CatalogoItem.count({ where: { empresa_id: empresaId, tipo_item: 'producto' } }),
        CatalogoItem.count({ where: { empresa_id: empresaId, tipo_item: 'servicio' } }),
        CatalogoItem.count({ where: { empresa_id: empresaId, tipo_item: 'producto', stock: 0 } }),
        CatalogoItem.count({
          where: {
            empresa_id: empresaId,
            tipo_item: 'producto',
            stock: { [Op.and]: [{ [Op.not]: null }, { [Op.gt]: 0 }, { [Op.lte]: 5 }] }
          }
        })
      ]);

      return res.json({
        success: true,
        data: { totalProductos, totalServicios, sinStock, stockBajo }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 🔔 NUEVAS FUNCIONES DE STOCK BAJO PARA N8N
  // ═══════════════════════════════════════════════════════════

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/stock/bajo-todas-empresas?umbral=5
  // Usado por n8n Schedule para obtener TODAS las empresas
  // con productos en stock bajo de una sola llamada
  // ─────────────────────────────────────────────────────────
  obtenerStockBajoTodasEmpresas: async (req, res) => {
    try {
      const umbral = parseInt(req.query.umbral) || 5;

      // 1. Traer todos los productos con stock bajo
      const productosBajos = await CatalogoItem.findAll({
        where: {
          tipo_item: 'producto',
          disponible: true,
          stock: {
            [Op.and]: [
              { [Op.not]: null },
              { [Op.lte]: umbral }
            ]
          }
        },
        order: [['empresa_id', 'ASC'], ['stock', 'ASC']]
      });

      if (productosBajos.length === 0) {
        return res.json({ success: true, umbral, total_empresas: 0, data: [] });
      }

      // 2. IDs únicos de empresas afectadas
      const empresaIds = [...new Set(productosBajos.map(p => p.empresa_id))];

      // 3. Traer datos de esas empresas (email, nombre, etc.)
      const empresas = await Empresa.findAll({
        where: { id: { [Op.in]: empresaIds } },
        // ⚠️ AJUSTA estos campos según tu modelo Empresa real
        attributes: ['id', 'nombre', 'correo_contacto']
      });

      // 4. Agrupar productos por empresa
      const resultado = empresas.map(empresa => {
        const productosDeEmpresa = productosBajos
          .filter(p => p.empresa_id === empresa.id)
          .map(p => ({
            id: p.id,
            nombre: p.nombre_item,
            stock: p.stock,
            sku: p.sku || null,
            precio: p.precio ? parseFloat(p.precio) : null,
            categoria: p.categoria
          }));

        return {
          empresaId: empresa.id,
          nombreEmpresa: empresa.nombre,
          emailDestino: empresa.correo_contacto,
          nombreContacto: empresa.nombre,
          umbralUsado: umbral,
          totalProductosBajos: productosDeEmpresa.length,
          productos: productosDeEmpresa
        };
      });

      return res.json({
        success: true,
        umbral,
        total_empresas: resultado.length,
        data: resultado
      });

    } catch (error) {
      console.error('❌ Error obtenerStockBajoTodasEmpresas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener stock bajo', error: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────
  // GET /api/catalogo/stock/bajo/:empresaId?umbral=5
  // Para revisar el stock de UNA empresa específica
  // ─────────────────────────────────────────────────────────
  obtenerStockBajoPorEmpresa: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const umbral = parseInt(req.query.umbral) || 5;

      const productosBajos = await CatalogoItem.findAll({
        where: {
          empresa_id: empresaId,
          tipo_item: 'producto',
          disponible: true,
          stock: {
            [Op.and]: [
              { [Op.not]: null },
              { [Op.lte]: umbral }
            ]
          }
        },
        order: [['stock', 'ASC']]
      });

      return res.json({
        success: true,
        empresaId: parseInt(empresaId),
        umbral,
        total: productosBajos.length,
        hayStockBajo: productosBajos.length > 0,
        data: productosBajos.map(p => ({
          id: p.id,
          nombre: p.nombre_item,
          stock: p.stock,
          sku: p.sku || null,
          precio: p.precio,
          categoria: p.categoria
        }))
      });

    } catch (error) {
      console.error('❌ Error obtenerStockBajoPorEmpresa:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener stock bajo', error: error.message });
    }
  },

  // ─────────────────────────────────────────────────────────
  // PATCH /api/catalogo/:id/stock
  // Actualizar solo el stock de un producto
  // ─────────────────────────────────────────────────────────
  actualizarStock: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || stock === null) {
        return res.status(400).json({ success: false, message: 'Se requiere el campo stock' });
      }

      const item = await CatalogoItem.findOne({
        where: { id, empresa_id: empresaId, tipo_item: 'producto' }
      });

      if (!item) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }

      const stockAnterior = item.stock;
      await item.update({ stock: parseInt(stock), fecha_actualizacion: new Date() });

      return res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
          id: item.id,
          nombre: item.nombre_item,
          stockAnterior,
          stockNuevo: parseInt(stock)
        }
      });

    } catch (error) {
      console.error('❌ Error al actualizar stock:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar stock', error: error.message });
    }
  }

};

module.exports = catalogoController;
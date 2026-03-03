const { CatalogoItem, CategoriaProducto, Empresa } = require('../models');
const { Op } = require('sequelize');

const catalogoController = {

  // GET /api/catalogo/publico/:empresaId
  obtenerCatalogoPublico: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const items = await CatalogoItem.findAll({
        where: { empresa_id: empresaId, disponible: true },
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }],
        order: [['nombre_item', 'ASC']]
      });

      return res.json({
        success: true,
        total: items.length,
        data: items.map(item => ({
          id: item.id,
          nombre_item: item.nombre_item,
          descripcion: item.descripcion,
          precio: item.precio,
          imagen_url: item.imagen_url,
          categoria: item.categoria || null,
          stock: item.stock,
          disponible: item.disponible
        }))
      });

    } catch (error) {
      console.error('Error al obtener catálogo público:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
    }
  },

  // GET /api/catalogo/
  obtenerCatalogo: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { categoria_id, disponible, busqueda } = req.query;

      const where = { empresa_id: empresaId };

      if (categoria_id) where.categoria_id = categoria_id;
      if (disponible !== undefined) where.disponible = disponible === 'true';
      if (busqueda) {
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda}%` } },
          { descripcion: { [Op.like]: `%${busqueda}%` } },
          { tags: { [Op.like]: `%${busqueda}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({
        where,
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }],
        order: [['nombre_item', 'ASC']]
      });

      return res.json({ success: true, total: items.length, data: items });

    } catch (error) {
      console.error('Error al obtener catálogo:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener catálogo' });
    }
  },

  // POST /api/catalogo/
  crearItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { nombre_item, descripcion, precio, imagen_url, stock, disponible, categoria_id, tags } = req.body;

      const nuevoItem = await CatalogoItem.create({
        empresa_id: empresaId,
        nombre_item, descripcion, precio,
        imagen_url, stock,
        disponible: disponible !== undefined ? disponible : true,
        categoria_id: categoria_id || null,
        tags,
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      });

      const itemConCategoria = await CatalogoItem.findByPk(nuevoItem.id, {
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }]
      });

      return res.status(201).json({ success: true, message: 'Producto creado exitosamente', data: itemConCategoria });

    } catch (error) {
      console.error('Error al crear producto:', error);
      return res.status(500).json({ success: false, message: 'Error al crear producto' });
    }
  },

  // GET /api/catalogo/:id
  obtenerItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      const item = await CatalogoItem.findOne({
        where: { id, empresa_id: empresaId },
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }]
      });

      if (!item) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      return res.json({ success: true, data: item });

    } catch (error) {
      console.error('Error al obtener producto:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener producto' });
    }
  },

  // PUT /api/catalogo/:id
  actualizarItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;
      const { nombre_item, descripcion, precio, imagen_url, stock, disponible, categoria_id, tags } = req.body;

      const item = await CatalogoItem.findOne({ where: { id, empresa_id: empresaId } });

      if (!item) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      await item.update({
        nombre_item, descripcion, precio,
        imagen_url, stock, disponible,
        categoria_id: categoria_id ?? item.categoria_id,
        tags,
        fecha_actualizacion: new Date()
      });

      const itemActualizado = await CatalogoItem.findByPk(id, {
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }]
      });

      return res.json({ success: true, message: 'Producto actualizado exitosamente', data: itemActualizado });

    } catch (error) {
      console.error('Error al actualizar producto:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
  },

  // DELETE /api/catalogo/:id
  eliminarItem: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      const item = await CatalogoItem.findOne({ where: { id, empresa_id: empresaId } });

      if (!item) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      await item.destroy();

      return res.json({ success: true, message: 'Producto eliminado exitosamente' });

    } catch (error) {
      console.error('Error al eliminar producto:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar producto' });
    }
  },

  // GET /api/catalogo/buscar
  buscarItems: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { busqueda, categoria_id } = req.query;

      const where = { empresa_id: empresaId };
      if (categoria_id) where.categoria_id = categoria_id;
      if (busqueda) {
        where[Op.or] = [
          { nombre_item: { [Op.like]: `%${busqueda}%` } },
          { descripcion: { [Op.like]: `%${busqueda}%` } },
          { tags: { [Op.like]: `%${busqueda}%` } }
        ];
      }

      const items = await CatalogoItem.findAll({
        where,
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }],
        limit: 20
      });

      return res.json({ success: true, total: items.length, data: items });

    } catch (error) {
      console.error('Error al buscar productos:', error);
      return res.status(500).json({ success: false, message: 'Error al buscar productos' });
    }
  },

  // GET /api/catalogo/categorias
  obtenerCategorias: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;

      const categorias = await CategoriaProducto.findAll({
        where: { empresa_id: empresaId, activa: true },
        order: [['nombre', 'ASC']]
      });

      return res.json({ success: true, data: categorias });

    } catch (error) {
      console.error('Error al obtener categorías:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  },

  // POST /api/catalogo/categorias
  agregarCategoria: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { nombre, descripcion } = req.body;

      if (!nombre || !nombre.trim()) {
        return res.status(400).json({ success: false, message: 'El nombre es requerido' });
      }

      const categoria = await CategoriaProducto.create({
        empresa_id: empresaId,
        nombre: nombre.trim(),
        descripcion: descripcion || null
      });

      return res.status(201).json({ success: true, data: categoria });

    } catch (error) {
      console.error('Error al crear categoría:', error);
      return res.status(500).json({ success: false, message: 'Error al crear categoría' });
    }
  },

  // DELETE /api/catalogo/categorias/:id
  eliminarCategoria: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;

      const categoria = await CategoriaProducto.findOne({ where: { id, empresa_id: empresaId } });

      if (!categoria) return res.status(404).json({ success: false, message: 'Categoría no encontrada' });

      categoria.activa = false;
      await categoria.save();

      return res.json({ success: true, message: 'Categoría eliminada' });

    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      return res.status(500).json({ success: false, message: 'Error al eliminar categoría' });
    }
  },

  obtenerCategoriasPublico: async (req, res) => {
    try {
      const { empresaId } = req.params;

      const categorias = await CategoriaProducto.findAll({
        where: { empresa_id: empresaId, activa: true },
        include: [{
          model: CatalogoItem,
          as: 'items',
          where: { disponible: true },
          attributes: [],
          required: true  // Solo categorías que tengan al menos 1 producto disponible
        }],
        order: [['nombre', 'ASC']]
      });

      return res.json({ success: true, data: categorias });

    } catch (error) {
      console.error('Error al obtener categorías públicas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener categorías' });
    }
  },

  // GET /api/catalogo/estadisticas
  obtenerEstadisticas: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;

      const [totalProductos, sinStock, stockBajo] = await Promise.all([
        CatalogoItem.count({ where: { empresa_id: empresaId } }),
        CatalogoItem.count({ where: { empresa_id: empresaId, stock: 0 } }),
        CatalogoItem.count({
          where: {
            empresa_id: empresaId,
            stock: { [Op.and]: [{ [Op.not]: null }, { [Op.gt]: 0 }, { [Op.lte]: 5 }] }
          }
        })
      ]);

      return res.json({
        success: true,
        data: { totalProductos, sinStock, stockBajo }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  },

  // GET /api/catalogo/stock/bajo-todas-empresas
  obtenerStockBajoTodasEmpresas: async (req, res) => {
    try {
      const umbral = parseInt(req.query.umbral) || 5;

      const productosBajos = await CatalogoItem.findAll({
        where: {
          disponible: true,
          stock: { [Op.and]: [{ [Op.not]: null }, { [Op.lte]: umbral }] }
        },
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }],
        order: [['empresa_id', 'ASC'], ['stock', 'ASC']]
      });

      if (productosBajos.length === 0) {
        return res.json({ success: true, umbral, total_empresas: 0, data: [] });
      }

      const empresaIds = [...new Set(productosBajos.map(p => p.empresa_id))];
      const empresas = await Empresa.findAll({
        where: { id: { [Op.in]: empresaIds } },
        attributes: ['id', 'nombre', 'correo_contacto']
      });

      const resultado = empresas.map(empresa => {
        const productosDeEmpresa = productosBajos
          .filter(p => p.empresa_id === empresa.id)
          .map(p => ({
            id: p.id,
            nombre: p.nombre_item,
            stock: p.stock,
            precio: p.precio ? parseFloat(p.precio) : null,
            categoria: p.categoria?.nombre || null
          }));

        return {
          empresaId: empresa.id,
          nombreEmpresa: empresa.nombre,
          emailDestino: empresa.correo_contacto,
          umbralUsado: umbral,
          totalProductosBajos: productosDeEmpresa.length,
          productos: productosDeEmpresa
        };
      });

      return res.json({ success: true, umbral, total_empresas: resultado.length, data: resultado });

    } catch (error) {
      console.error('❌ Error obtenerStockBajoTodasEmpresas:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener stock bajo', error: error.message });
    }
  },

  // GET /api/catalogo/stock/bajo/:empresaId
  obtenerStockBajoPorEmpresa: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const umbral = parseInt(req.query.umbral) || 5;

      const productosBajos = await CatalogoItem.findAll({
        where: {
          empresa_id: empresaId,
          disponible: true,
          stock: { [Op.and]: [{ [Op.not]: null }, { [Op.lte]: umbral }] }
        },
        include: [{ model: CategoriaProducto, as: 'categoria', attributes: ['id', 'nombre'] }],
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
          precio: p.precio,
          categoria: p.categoria?.nombre || null
        }))
      });

    } catch (error) {
      console.error('❌ Error obtenerStockBajoPorEmpresa:', error);
      return res.status(500).json({ success: false, message: 'Error al obtener stock bajo', error: error.message });
    }
  },

  // PATCH /api/catalogo/:id/stock
  actualizarStock: async (req, res) => {
    try {
      const empresaId = req.usuario.empresa_id;
      const { id } = req.params;
      const { stock } = req.body;

      if (stock === undefined || stock === null) {
        return res.status(400).json({ success: false, message: 'Se requiere el campo stock' });
      }

      const item = await CatalogoItem.findOne({ where: { id, empresa_id: empresaId } });

      if (!item) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

      const stockAnterior = item.stock;
      await item.update({ stock: parseInt(stock), fecha_actualizacion: new Date() });

      return res.json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: { id: item.id, nombre: item.nombre_item, stockAnterior, stockNuevo: parseInt(stock) }
      });

    } catch (error) {
      console.error('❌ Error al actualizar stock:', error);
      return res.status(500).json({ success: false, message: 'Error al actualizar stock', error: error.message });
    }
  }
};

module.exports = catalogoController;
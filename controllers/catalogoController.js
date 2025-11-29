// controllers/catalogoController.js
const { CatalogoItem } = require('../models');
const { Op } = require('sequelize');

const catalogoController = {
  // Obtener todos los items del catálogo de la empresa
  obtenerCatalogo: async (req, res) => {
    try {
      const { tipo_item, orden } = req.query;
      const empresa_id = req.usuario.empresa_id;

      const where = { empresa_id };

      // Filtrar por tipo si se especifica
      if (tipo_item && ['producto', 'servicio'].includes(tipo_item)) {
        where.tipo_item = tipo_item;
      }

      // Determinar orden
      let order = [['fecha_creacion', 'DESC']];
      if (orden === 'nombre') {
        order = [['nombre_item', 'ASC']];
      } else if (orden === 'precio') {
        order = [['precio', 'ASC']];
      }

      const items = await CatalogoItem.findAll({
        where,
        order
      });

      res.json({
        success: true,
        total: items.length,
        data: items
      });

    } catch (error) {
      console.error('Error al obtener catálogo:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el catálogo',
        error: error.message
      });
    }
  },

  // Obtener un item específico
  obtenerItem: async (req, res) => {
    try {
      const { id } = req.params;
      const empresa_id = req.usuario.empresa_id;

      const item = await CatalogoItem.findOne({
        where: {
          id,
          empresa_id
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado'
        });
      }

      res.json({
        success: true,
        data: item
      });

    } catch (error) {
      console.error('Error al obtener item:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el item',
        error: error.message
      });
    }
  },

  // Crear nuevo item
  crearItem: async (req, res) => {
    try {
      const { nombre_item, descripcion, precio, tipo_item, imagen_url } = req.body;
      const empresa_id = req.usuario.empresa_id;

      // Validaciones
      if (!nombre_item || nombre_item.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del item es obligatorio'
        });
      }

      if (tipo_item && !['producto', 'servicio'].includes(tipo_item)) {
        return res.status(400).json({
          success: false,
          message: 'El tipo debe ser "producto" o "servicio"'
        });
      }

      // Crear item
      const nuevoItem = await CatalogoItem.create({
        empresa_id,
        nombre_item: nombre_item.trim(),
        descripcion: descripcion?.trim() || null,
        precio: precio || null,
        tipo_item: tipo_item || 'producto',
        imagen_url: imagen_url?.trim() || null
      });

      res.status(201).json({
        success: true,
        message: 'Item creado exitosamente',
        data: nuevoItem
      });

    } catch (error) {
      console.error('Error al crear item:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el item',
        error: error.message
      });
    }
  },

  // Actualizar item
  actualizarItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre_item, descripcion, precio, tipo_item, imagen_url } = req.body;
      const empresa_id = req.usuario.empresa_id;

      // Buscar item
      const item = await CatalogoItem.findOne({
        where: {
          id,
          empresa_id
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado'
        });
      }

      // Validaciones
      if (nombre_item !== undefined && nombre_item.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del item no puede estar vacío'
        });
      }

      if (tipo_item && !['producto', 'servicio'].includes(tipo_item)) {
        return res.status(400).json({
          success: false,
          message: 'El tipo debe ser "producto" o "servicio"'
        });
      }

      // Actualizar campos
      if (nombre_item !== undefined) item.nombre_item = nombre_item.trim();
      if (descripcion !== undefined) item.descripcion = descripcion?.trim() || null;
      if (precio !== undefined) item.precio = precio || null;
      if (tipo_item !== undefined) item.tipo_item = tipo_item;
      if (imagen_url !== undefined) item.imagen_url = imagen_url?.trim() || null;

      await item.save();

      res.json({
        success: true,
        message: 'Item actualizado exitosamente',
        data: item
      });

    } catch (error) {
      console.error('Error al actualizar item:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar el item',
        error: error.message
      });
    }
  },

  // Eliminar item
  eliminarItem: async (req, res) => {
    try {
      const { id } = req.params;
      const empresa_id = req.usuario.empresa_id;

      const item = await CatalogoItem.findOne({
        where: {
          id,
          empresa_id
        }
      });

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item no encontrado'
        });
      }

      await item.destroy();

      res.json({
        success: true,
        message: 'Item eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error al eliminar item:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar el item',
        error: error.message
      });
    }
  },

  // Buscar items
  buscarItems: async (req, res) => {
    try {
      const { q, tipo_item } = req.query;
      const empresa_id = req.usuario.empresa_id;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un término de búsqueda'
        });
      }

      const where = {
        empresa_id,
        [Op.or]: [
          { nombre_item: { [Op.like]: `%${q}%` } },
          { descripcion: { [Op.like]: `%${q}%` } }
        ]
      };

      if (tipo_item && ['producto', 'servicio'].includes(tipo_item)) {
        where.tipo_item = tipo_item;
      }

      const items = await CatalogoItem.findAll({
        where,
        order: [['nombre_item', 'ASC']]
      });

      res.json({
        success: true,
        total: items.length,
        data: items
      });

    } catch (error) {
      console.error('Error al buscar items:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar items',
        error: error.message
      });
    }
  },

  // Estadísticas del catálogo
  obtenerEstadisticas: async (req, res) => {
    try {
      const empresa_id = req.usuario.empresa_id;

      const [totalItems, totalProductos, totalServicios] = await Promise.all([
        CatalogoItem.count({ where: { empresa_id } }),
        CatalogoItem.count({ where: { empresa_id, tipo_item: 'producto' } }),
        CatalogoItem.count({ where: { empresa_id, tipo_item: 'servicio' } })
      ]);

      // Items con precio
      const itemsConPrecio = await CatalogoItem.count({
        where: {
          empresa_id,
          precio: { [Op.not]: null }
        }
      });

      // Precio promedio
      const resultado = await CatalogoItem.findOne({
        where: {
          empresa_id,
          precio: { [Op.not]: null }
        },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('precio')), 'precio_promedio'],
          [sequelize.fn('MIN', sequelize.col('precio')), 'precio_minimo'],
          [sequelize.fn('MAX', sequelize.col('precio')), 'precio_maximo']
        ],
        raw: true
      });

      res.json({
        success: true,
        data: {
          total_items: totalItems,
          total_productos: totalProductos,
          total_servicios: totalServicios,
          items_con_precio: itemsConPrecio,
          precio_promedio: resultado?.precio_promedio ? parseFloat(resultado.precio_promedio).toFixed(2) : null,
          precio_minimo: resultado?.precio_minimo ? parseFloat(resultado.precio_minimo).toFixed(2) : null,
          precio_maximo: resultado?.precio_maximo ? parseFloat(resultado.precio_maximo).toFixed(2) : null
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
};

module.exports = catalogoController;
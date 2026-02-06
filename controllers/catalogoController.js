const { CatalogoItem } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const catalogoController = {
  // ⚠️ MÉTODO PÚBLICO PARA N8N
  obtenerCatalogoPublico: async (req, res) => {
    try {
      const { empresaId } = req.params;
      const { tipo_item, categoria, disponible } = req.query;

      console.log(`
╔════════════════════════════════════════════════════════╗
║      📦 OBTENIENDO CATÁLOGO PÚBLICO                   ║
╠════════════════════════════════════════════════════════╣
║ Empresa ID:  ${empresaId}
║ Tipo Item:   ${tipo_item || 'todos'}
║ Categoría:   ${categoria || 'todas'}
╚════════════════════════════════════════════════════════╝
      `);

      if (!empresaId) {
        console.error(`❌ ERROR: empresaId no proporcionado`);
        return res.status(400).json({
          success: false,
          message: 'empresaId es requerido'
        });
      }

      const where = { empresa_id: empresaId };

      // Filtrar por disponibilidad (por defecto solo items disponibles)
      if (disponible !== 'false') {
        where.disponible = true;
      }

      if (tipo_item && ['producto', 'servicio'].includes(tipo_item)) {
        where.tipo_item = tipo_item;
      }

      if (categoria) {
        where.categoria = categoria;
      }

      console.log(`🔍 Buscando items con filtro:`, where);

      const items = await CatalogoItem.findAll({
        where,
        order: [
          ['categoria', 'ASC'],
          ['nombre_item', 'ASC']
        ]
      });

      console.log(`✅ Items encontrados: ${items.length}`);
      
      if (items.length > 0) {
        console.log(`📋 Primeros 3 items:`, items.slice(0, 3).map(i => ({
          id: i.id,
          nombre: i.nombre_item,
          precio: i.precio,
          tipo: i.tipo_item,
          disponible: i.disponible
        })));
      }

      res.json({
        success: true,
        total: items.length,
        data: items
      });

    } catch (error) {
      console.error(`
╔════════════════════════════════════════════════════════╗
║      ❌ ERROR OBTENIENDO CATÁLOGO PÚBLICO             ║
╠════════════════════════════════════════════════════════╣
║ Error:   ${error.message}
║ Stack:   ${error.stack}
╚════════════════════════════════════════════════════════╝
      `);
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener el catálogo',
        error: error.message
      });
    }
  },

  // Obtener categorías disponibles del ENUM
  obtenerCategoriasDisponibles: async (req, res) => {
    try {
      // Obtener las categorías directamente del ENUM en la BD
      const [result] = await sequelize.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${sequelize.config.database}' 
        AND TABLE_NAME = 'catalogo_items' 
        AND COLUMN_NAME = 'categoria'
      `);

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No se pudo obtener información de las categorías'
        });
      }

      const columnType = result[0].COLUMN_TYPE;
      const categoriasEnum = columnType
        .match(/enum\((.*)\)/)[1]
        .split(',')
        .map(c => c.replace(/'/g, ''));

      res.json({
        success: true,
        total: categoriasEnum.length,
        data: categoriasEnum
      });

    } catch (error) {
      console.error('Error al obtener categorías disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  },

  // Agregar nueva categoría al ENUM (requiere ALTER TABLE)
  agregarCategoria: async (req, res) => {
    try {
      const { categoria } = req.body;

      if (!categoria || categoria.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre de la categoría es obligatorio'
        });
      }

      const categoriaLimpia = categoria.trim().toLowerCase().replace(/\s+/g, '_');

      // Obtener las categorías actuales del ENUM
      const [result] = await sequelize.query(`
        SELECT COLUMN_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '${sequelize.config.database}' 
        AND TABLE_NAME = 'catalogo_items' 
        AND COLUMN_NAME = 'categoria'
      `);

      if (!result || result.length === 0) {
        return res.status(500).json({
          success: false,
          message: 'No se pudo obtener información de la columna categoria'
        });
      }

      const columnType = result[0].COLUMN_TYPE;
      const categoriasActuales = columnType
        .match(/enum\((.*)\)/)[1]
        .split(',')
        .map(c => c.replace(/'/g, ''));

      // Verificar si la categoría ya existe
      if (categoriasActuales.includes(categoriaLimpia)) {
        return res.status(400).json({
          success: false,
          message: 'Esta categoría ya existe'
        });
      }

      // Agregar la nueva categoría
      categoriasActuales.push(categoriaLimpia);
      const nuevasCategoriasEnum = categoriasActuales.map(c => `'${c}'`).join(',');

      // Ejecutar ALTER TABLE
      await sequelize.query(`
        ALTER TABLE catalogo_items 
        MODIFY COLUMN categoria ENUM(${nuevasCategoriasEnum}) NULL
      `);

      res.json({
        success: true,
        message: 'Categoría agregada exitosamente',
        data: {
          categoria: categoriaLimpia,
          total_categorias: categoriasActuales.length
        }
      });

    } catch (error) {
      console.error('Error al agregar categoría:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar la categoría',
        error: error.message
      });
    }
  },

  // Obtener categorías en uso por la empresa
  obtenerCategorias: async (req, res) => {
    try {
      const empresa_id = req.usuario.empresa_id;

      const categorias = await CatalogoItem.findAll({
        where: { 
          empresa_id, 
          categoria: { [Op.not]: null } 
        },
        attributes: [
          'categoria',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total']
        ],
        group: ['categoria'],
        order: [['categoria', 'ASC']]
      });

      res.json({
        success: true,
        data: categorias
      });

    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener categorías',
        error: error.message
      });
    }
  },

  // Obtener todos los items del catálogo de la empresa
  obtenerCatalogo: async (req, res) => {
    try {
      const { tipo_item, categoria, disponible, orden } = req.query;
      const empresa_id = req.usuario.empresa_id;

      const where = { empresa_id };

      if (tipo_item && ['producto', 'servicio'].includes(tipo_item)) {
        where.tipo_item = tipo_item;
      }

      if (categoria) {
        where.categoria = categoria;
      }

      if (disponible !== undefined) {
        where.disponible = disponible === 'true';
      }

      let order = [['fecha_creacion', 'DESC']];
      if (orden === 'nombre') {
        order = [['nombre_item', 'ASC']];
      } else if (orden === 'precio') {
        order = [['precio', 'ASC']];
      } else if (orden === 'categoria') {
        order = [['categoria', 'ASC'], ['nombre_item', 'ASC']];
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

  crearItem: async (req, res) => {
    try {
      const { 
        nombre_item, 
        descripcion, 
        precio, 
        tipo_item, 
        imagen_url,
        stock,
        sku,
        disponible,
        duracion_minutos,
        requiere_agendamiento,
        categoria,
        tags,
        notas_adicionales
      } = req.body;
      
      const empresa_id = req.usuario.empresa_id;

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

      const nuevoItem = await CatalogoItem.create({
        empresa_id,
        nombre_item: nombre_item.trim(),
        descripcion: descripcion?.trim() || null,
        precio: precio || null,
        tipo_item: tipo_item || 'producto',
        imagen_url: imagen_url?.trim() || null,
        stock: stock || null,
        sku: sku?.trim() || null,
        disponible: disponible !== undefined ? disponible : true,
        duracion_minutos: duracion_minutos || null,
        requiere_agendamiento: requiere_agendamiento || false,
        categoria: categoria?.trim() || null,
        tags: tags?.trim() || null,
        notas_adicionales: notas_adicionales?.trim() || null
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

  actualizarItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { 
        nombre_item, 
        descripcion, 
        precio, 
        tipo_item, 
        imagen_url,
        stock,
        sku,
        disponible,
        duracion_minutos,
        requiere_agendamiento,
        categoria,
        tags,
        notas_adicionales
      } = req.body;
      
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

      // Actualizar campos básicos
      if (nombre_item !== undefined) item.nombre_item = nombre_item.trim();
      if (descripcion !== undefined) item.descripcion = descripcion?.trim() || null;
      if (precio !== undefined) item.precio = precio || null;
      if (tipo_item !== undefined) item.tipo_item = tipo_item;
      if (imagen_url !== undefined) item.imagen_url = imagen_url?.trim() || null;
      
      // Actualizar nuevos campos
      if (stock !== undefined) item.stock = stock || null;
      if (sku !== undefined) item.sku = sku?.trim() || null;
      if (disponible !== undefined) item.disponible = disponible;
      if (duracion_minutos !== undefined) item.duracion_minutos = duracion_minutos || null;
      if (requiere_agendamiento !== undefined) item.requiere_agendamiento = requiere_agendamiento;
      if (categoria !== undefined) item.categoria = categoria?.trim() || null;
      if (tags !== undefined) item.tags = tags?.trim() || null;
      if (notas_adicionales !== undefined) item.notas_adicionales = notas_adicionales?.trim() || null;

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

  buscarItems: async (req, res) => {
    try {
      const { q, tipo_item, categoria } = req.query;
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
          { descripcion: { [Op.like]: `%${q}%` } },
          { tags: { [Op.like]: `%${q}%` } }
        ]
      };

      if (tipo_item && ['producto', 'servicio'].includes(tipo_item)) {
        where.tipo_item = tipo_item;
      }

      if (categoria) {
        where.categoria = categoria;
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

  obtenerEstadisticas: async (req, res) => {
    try {
      const empresa_id = req.usuario.empresa_id;

      const [
        totalItems, 
        totalProductos, 
        totalServicios,
        itemsDisponibles,
        itemsConStock
      ] = await Promise.all([
        CatalogoItem.count({ where: { empresa_id } }),
        CatalogoItem.count({ where: { empresa_id, tipo_item: 'producto' } }),
        CatalogoItem.count({ where: { empresa_id, tipo_item: 'servicio' } }),
        CatalogoItem.count({ where: { empresa_id, disponible: true } }),
        CatalogoItem.count({ 
          where: { 
            empresa_id, 
            stock: { [Op.not]: null, [Op.gt]: 0 } 
          } 
        })
      ]);

      // Obtener categorías únicas
      const categorias = await CatalogoItem.findAll({
        where: { empresa_id, categoria: { [Op.not]: null } },
        attributes: ['categoria'],
        group: ['categoria']
      });

      const itemsConPrecio = await CatalogoItem.count({
        where: {
          empresa_id,
          precio: { [Op.not]: null }
        }
      });

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
          items_disponibles: itemsDisponibles,
          items_con_stock: itemsConStock,
          categorias: categorias.map(c => c.categoria),
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
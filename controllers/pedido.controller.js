const Pedido = require('../models/Pedido');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// ========================================
// ❌ CANCELAR PEDIDO - VERSIÓN CORREGIDA
// ========================================
exports.cancelarPedidoCliente = async (req, res) => {
  try {
    // 🔥 CORREGIDO: Obtener pedidoId SOLO de params (viene en la URL)
    const pedidoId = req.params.pedidoId;
    const { telefono, empresaId } = req.body;

    console.log('❌ Cancelando pedido:');
    console.log('   pedidoId:', pedidoId);
    console.log('   telefono:', telefono);
    console.log('   empresaId:', empresaId);

    // Validar parámetros
    if (!pedidoId || !telefono || !empresaId) {
      console.log('❌ Faltan parámetros');
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos: pedidoId, telefono, empresaId'
      });
    }

    // 🔥 CORREGIDO: No convertir telefono a String, dejarlo tal cual
    const pedido = await Pedido.findOne({
      where: {
        id: parseInt(pedidoId),
        telefono_cliente: telefono,  // ← SIN String()
        empresa_id: parseInt(empresaId)
      }
    });

    if (!pedido) {
      console.log('❌ Pedido no encontrado');
      console.log('   Buscando con:');
      console.log('   - id:', parseInt(pedidoId));
      console.log('   - telefono_cliente:', telefono);
      console.log('   - empresa_id:', parseInt(empresaId));
      
      return res.status(404).json({
        success: false,
        mensaje: 'Pedido no encontrado o no pertenece a este cliente'
      });
    }

    console.log('📦 Pedido encontrado:', {
      id: pedido.id,
      estado: pedido.estado,
      nombre: pedido.nombre_cliente,
      telefono: pedido.telefono_cliente
    });

    // Verificar estado cancelable
    if (pedido.estado === 'cancelado') {
      return res.status(400).json({
        success: false,
        mensaje: 'El pedido ya está cancelado'
      });
    }

    if (pedido.estado === 'entregado') {
      return res.status(400).json({
        success: false,
        mensaje: 'No se puede cancelar un pedido entregado'
      });
    }

    // 🔥 CANCELAR PEDIDO
    await pedido.update({ estado: 'cancelado' });

    console.log(`✅ Pedido #${pedidoId} cancelado exitosamente`);

    res.json({
      success: true,
      mensaje: 'Pedido cancelado exitosamente',
      data: {
        id: pedido.id,
        nombre_cliente: pedido.nombre_cliente,
        estado: 'cancelado',
        total: parseFloat(pedido.total)
      }
    });

  } catch (error) {
    console.error('❌ Error cancelando pedido:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      mensaje: 'Error al cancelar pedido',
      error: error.message
    });
  }
};

// ========================================
// 📋 OBTENER PEDIDOS DEL CLIENTE
// ========================================
exports.consultarPedidosCliente = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    console.log('📋 Consultando pedidos:');
    console.log('   empresaId:', empresaId);
    console.log('   numeroOrigen:', numeroOrigen);

    const pedidos = await Pedido.findAll({
      where: {
        empresa_id: parseInt(empresaId),
        telefono_cliente: numeroOrigen  // ← SIN String()
      },
      order: [['fecha_creacion', 'DESC']],
      limit: 10
    });

    console.log(`✅ Se encontraron ${pedidos.length} pedidos`);

    res.json({
      success: true,
      data: pedidos.map(p => ({
        id: p.id,
        nombre_cliente: p.nombre_cliente,
        estado: p.estado,
        total: parseFloat(p.total),
        items: p.items,
        fecha_pedido: p.fecha_creacion,
        telefono_cliente: p.telefono_cliente
      })),
      total: pedidos.length
    });

  } catch (error) {
    console.error('❌ Error consultando pedidos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al consultar pedidos',
      error: error.message
    });
  }
};

// ========================================
// 📄 OBTENER DETALLE DE UN PEDIDO
// ========================================
exports.obtenerDetallePedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;

    console.log('📄 Obteniendo detalle del pedido:', pedidoId);

    const pedido = await Pedido.findByPk(parseInt(pedidoId));

    if (!pedido) {
      return res.status(404).json({
        success: false,
        mensaje: 'Pedido no encontrado'
      });
    }

    res.json({ 
      success: true, 
      data: {
        id: pedido.id,
        empresa_id: pedido.empresa_id,
        telefono_cliente: pedido.telefono_cliente,
        nombre_cliente: pedido.nombre_cliente,
        estado: pedido.estado,
        total: parseFloat(pedido.total),
        items: pedido.items,
        fecha_pedido: pedido.fecha_creacion
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo detalle:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener detalle',
      error: error.message
    });
  }
};

// ========================================
// 💾 GUARDAR PEDIDO
// ========================================
exports.guardarSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen, datosPedido, pushName } = req.body;

    console.log('💾 Guardando pedido:', { 
      empresaId, 
      numeroOrigen,
      pushName,
      items: datosPedido?.items?.length || 0
    });

    if (!empresaId || !numeroOrigen || !datosPedido?.items) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos'
      });
    }

    const nombreTemporal = pushName || `Cliente ${numeroOrigen.slice(-4)}`;

    const nuevoPedido = await Pedido.create({
      empresa_id: empresaId,
      telefono_cliente: numeroOrigen,
      nombre_cliente: nombreTemporal,
      items: datosPedido.items,
      total: datosPedido.total,
      estado: 'pendiente'
    });

    console.log('✅ Pedido creado:', nuevoPedido.id);

    res.json({
      success: true,
      mensaje: 'Pedido guardado',
      data: {
        id: nuevoPedido.id,
        nombre_cliente: nuevoPedido.nombre_cliente,
        items: nuevoPedido.items,
        total: parseFloat(nuevoPedido.total)
      }
    });

  } catch (error) {
    console.error('❌ Error guardando pedido:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al guardar pedido',
      error: error.message
    });
  }
};

// ========================================
// 📖 OBTENER ÚLTIMO PEDIDO PENDIENTE
// ========================================
exports.obtenerSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: 'pendiente'
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!pedido) {
      return res.json({
        success: false,
        mensaje: 'No hay pedido pendiente'
      });
    }

    res.json({
      success: true,
      data: {
        id: pedido.id,
        nombre_cliente: pedido.nombre_cliente,
        estado: 'esperando_nombre',
        datos_pedido: {
          items: pedido.items,
          total: parseFloat(pedido.total)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo pedido:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener pedido',
      error: error.message
    });
  }
};

// ========================================
// 🗑️ LIMPIAR PEDIDO PENDIENTE
// ========================================
exports.limpiarSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    const resultado = await Pedido.destroy({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: 'pendiente'
      }
    });

    res.json({
      success: true,
      mensaje: 'Pedido eliminado',
      eliminados: resultado
    });

  } catch (error) {
    console.error('❌ Error eliminando pedido:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al eliminar pedido',
      error: error.message
    });
  }
};

// ========================================
// 📦 CONFIRMAR PEDIDO (ACTUALIZAR NOMBRE)
// ========================================
exports.crearPedidoWhatsApp = async (req, res) => {
  try {
    const { empresaId, nombreCliente, telefonoCliente } = req.body;

    if (!empresaId || !nombreCliente || !telefonoCliente) {
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos'
      });
    }

    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: telefonoCliente,
        estado: 'pendiente'
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!pedido) {
      return res.status(404).json({
        success: false,
        mensaje: 'No se encontró pedido para confirmar'
      });
    }

    await pedido.update({
      nombre_cliente: nombreCliente
    });

    res.json({
      success: true,
      mensaje: 'Pedido confirmado',
      data: {
        id: pedido.id,
        nombre_cliente: pedido.nombre_cliente,
        total: parseFloat(pedido.total),
        items: pedido.items,
        estado: 'pendiente'
      }
    });

  } catch (error) {
    console.error('❌ Error confirmando pedido:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al confirmar pedido',
      error: error.message
    });
  }
};

// ========================================
// RESTO DE FUNCIONES (sin cambios)
// ========================================
exports.actualizarEstadoSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;
    const { estado } = req.body;

    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: 'pendiente'
      }
    });

    if (!pedido) {
      return res.status(404).json({
        success: false,
        mensaje: 'No hay pedido activo'
      });
    }

    await pedido.update({ estado });

    res.json({
      success: true,
      mensaje: 'Estado actualizado',
      data: { id: pedido.id, estado: pedido.estado }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar estado',
      error: error.message
    });
  }
};

exports.obtenerPedidos = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const pedidos = await Pedido.findAll({
      where: { empresa_id: empresaId },
      order: [['fecha_creacion', 'DESC']]
    });

    res.json({
      success: true,
      data: pedidos,
      total: pedidos.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener pedidos',
      error: error.message
    });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const { estado } = req.body;

    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        mensaje: 'Pedido no encontrado'
      });
    }

    await pedido.update({ estado });

    res.json({
      success: true,
      mensaje: 'Estado actualizado',
      data: pedido
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: 'Error al actualizar estado',
      error: error.message
    });
  }
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const stats = await Pedido.findAll({
      where: { empresa_id: empresaId },
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas']
      ],
      group: ['estado'],
      raw: true
    });

    res.json({
      success: true,
      data: { por_estado: stats }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      mensaje: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};
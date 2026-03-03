const Pedido = require('../models/Pedido');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Estados que son "sesión temporal" (no pedidos confirmados)
const ESTADOS_SESION = ['pendiente', 'seleccionando_categoria', 'esperando_nombre', 'pedir_nombre', 'confirmar_cancelacion'];
// Estados que son "pedidos finales" (no se tocan como sesión)
const ESTADOS_FINALES = ['confirmado', 'entregado', 'cancelado', 'en_proceso', 'enviado'];

// ========================================
// ❌ CANCELAR PEDIDO - VERSIÓN CORREGIDA
// ========================================
exports.cancelarPedidoCliente = async (req, res) => {
  try {
    const pedidoId = req.params.pedidoId;
    const { telefono, empresaId } = req.body;

    console.log('❌ Cancelando pedido:');
    console.log('   pedidoId:', pedidoId);
    console.log('   telefono:', telefono);
    console.log('   empresaId:', empresaId);

    if (!pedidoId || !telefono || !empresaId) {
      console.log('❌ Faltan parámetros');
      return res.status(400).json({
        success: false,
        mensaje: 'Faltan datos requeridos: pedidoId, telefono, empresaId'
      });
    }

    const pedido = await Pedido.findOne({
      where: {
        id: parseInt(pedidoId),
        telefono_cliente: telefono,
        empresa_id: parseInt(empresaId)
      }
    });

    if (!pedido) {
      console.log('❌ Pedido no encontrado');
      return res.status(404).json({
        success: false,
        mensaje: 'Pedido no encontrado o no pertenece a este cliente'
      });
    }

    if (pedido.estado === 'cancelado') {
      return res.status(400).json({ success: false, mensaje: 'El pedido ya está cancelado' });
    }

    if (pedido.estado === 'entregado') {
      return res.status(400).json({ success: false, mensaje: 'No se puede cancelar un pedido entregado' });
    }

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
    res.status(500).json({ success: false, mensaje: 'Error al cancelar pedido', error: error.message });
  }
};

// ========================================
// 📋 OBTENER PEDIDOS DEL CLIENTE
// ========================================
exports.consultarPedidosCliente = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    const pedidos = await Pedido.findAll({
      where: {
        empresa_id: parseInt(empresaId),
        telefono_cliente: numeroOrigen,
        estado: { [Op.in]: ESTADOS_FINALES }  // Solo pedidos confirmados
      },
      order: [['fecha_creacion', 'DESC']],
      limit: 10
    });

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
    res.status(500).json({ success: false, mensaje: 'Error al consultar pedidos', error: error.message });
  }
};

// ========================================
// 📄 OBTENER DETALLE DE UN PEDIDO
// ========================================
exports.obtenerDetallePedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const pedido = await Pedido.findByPk(parseInt(pedidoId));

    if (!pedido) {
      return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' });
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
    res.status(500).json({ success: false, mensaje: 'Error al obtener detalle', error: error.message });
  }
};

// ========================================
// 💾 GUARDAR SESIÓN (POST /api/pedidos/sesion)
// ✅ CORREGIDO: Ahora guarda estado y datosPedido correctamente
// ========================================
exports.guardarSesion = async (req, res) => {
  try {
    const {
      empresaId,
      numeroOrigen,
      datosPedido,
      pushName,
      jidOriginal,
      numeroDescifrado,
      estado,        // ← 🔥 AHORA SE USA
      nombreSesion
    } = req.body;

    // El estado que viene puede ser: 'seleccionando_categoria', 'pedir_nombre', 'esperando_nombre', etc.
    const estadoFinal = estado || 'pendiente';

    console.log('💾 Guardando sesión:', {
      empresaId,
      numeroOrigen,
      estado: estadoFinal,
      pushName,
      jidOriginal,
      numeroDescifrado
    });

    // Determinar qué guardar en items y total según el estado
    let itemsGuardar = null;
    let totalGuardar = 0;

    if (datosPedido) {
      if (datosPedido.items) {
        // Estado de pedido normal (tiene items)
        itemsGuardar = datosPedido.items;
        totalGuardar = datosPedido.total || 0;
      } else {
        // Estado de sesión (ej: seleccionando_categoria tiene categorias)
        // Guardamos todo datosPedido como JSON en items
        itemsGuardar = datosPedido;
        totalGuardar = 0;
      }
    }

    const nuevoPedido = await Pedido.create({
      empresa_id: empresaId,
      telefono_cliente: numeroOrigen,
      numero_real: numeroDescifrado ? numeroOrigen : null,
      nombre_cliente: pushName || `Cliente ${String(numeroOrigen).slice(-4)}`,
      push_name: pushName,
      jid_whatsapp: jidOriginal,
      items: itemsGuardar,
      total: totalGuardar,
      estado: estadoFinal   // ← 🔥 AHORA GUARDA EL ESTADO REAL
    });

    res.json({
      success: true,
      mensaje: 'Sesión guardada',
      data: nuevoPedido
    });

  } catch (error) {
    console.error('❌ Error guardando sesión:', error);
    res.status(500).json({ success: false, mensaje: 'Error al guardar sesión', error: error.message });
  }
};

// ========================================
// 📖 OBTENER SESIÓN ACTIVA (GET /api/pedidos/sesion/:empresaId/:numeroOrigen)
// ✅ CORREGIDO: Devuelve el estado real y datos_pedido correctos
// ========================================
exports.obtenerSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    console.log('📖 GET /api/pedidos/sesion/:empresaId/:numeroOrigen');
    console.log('   Params:', { empresaId, numeroOrigen });

    // Buscar sesión activa (cualquier estado que NO sea final)
    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: { [Op.notIn]: ESTADOS_FINALES }
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!pedido) {
      return res.json({ success: false, mensaje: 'No hay sesión activa' });
    }

    console.log('✅ Sesión encontrada - Estado:', pedido.estado);

    // Construir datos_pedido según el estado
    let datosPedido = null;

    if (pedido.estado === 'seleccionando_categoria') {
      // items contiene el objeto datosPedido completo (con categorias)
      datosPedido = typeof pedido.items === 'string'
        ? JSON.parse(pedido.items)
        : pedido.items;
    } else if (pedido.estado === 'esperando_nombre' || pedido.estado === 'pedir_nombre' || pedido.estado === 'pendiente') {
      // items contiene los items del pedido
      datosPedido = {
        items: typeof pedido.items === 'string' ? JSON.parse(pedido.items) : pedido.items,
        total: parseFloat(pedido.total)
      };
    } else {
      datosPedido = typeof pedido.items === 'string'
        ? JSON.parse(pedido.items)
        : pedido.items;
    }

    res.json({
      success: true,
      data: {
        id: pedido.id,
        nombre_cliente: pedido.nombre_cliente,
        estado: pedido.estado,   // ← 🔥 DEVUELVE EL ESTADO REAL
        datos_pedido: datosPedido // ← 🔥 DEVUELVE LOS DATOS CORRECTOS
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo sesión:', error);
    res.status(500).json({ success: false, mensaje: 'Error al obtener sesión', error: error.message });
  }
};

// ========================================
// 🗑️ LIMPIAR SESIÓN (DELETE /api/pedidos/sesion/:empresaId/:numeroOrigen)
// ✅ CORREGIDO: Borra cualquier estado de sesión, no solo 'pendiente'
// ========================================
exports.limpiarSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;

    console.log('🗑️ DELETE /api/pedidos/sesion/:empresaId/:numeroOrigen');
    console.log('   Params:', { empresaId, numeroOrigen });

    const resultado = await Pedido.destroy({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: { [Op.notIn]: ESTADOS_FINALES }  // ← 🔥 Borra cualquier sesión activa
      }
    });

    res.json({ success: true, mensaje: 'Sesión eliminada', eliminados: resultado });

  } catch (error) {
    console.error('❌ Error eliminando sesión:', error);
    res.status(500).json({ success: false, mensaje: 'Error al eliminar sesión', error: error.message });
  }
};

// ========================================
// 📦 CONFIRMAR PEDIDO (ACTUALIZAR NOMBRE)
// ========================================
exports.crearPedidoWhatsApp = async (req, res) => {
  try {
    const { empresaId, nombreCliente, telefonoCliente } = req.body;

    if (!empresaId || !nombreCliente || !telefonoCliente) {
      return res.status(400).json({ success: false, mensaje: 'Faltan datos requeridos' });
    }

    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: telefonoCliente,
        estado: { [Op.notIn]: ESTADOS_FINALES }
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!pedido) {
      return res.status(404).json({ success: false, mensaje: 'No se encontró pedido para confirmar' });
    }

    await pedido.update({ nombre_cliente: nombreCliente, estado: 'pendiente' });

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
    res.status(500).json({ success: false, mensaje: 'Error al confirmar pedido', error: error.message });
  }
};

// ========================================
// 🔄 ACTUALIZAR ESTADO DE SESIÓN (PUT)
// ========================================
exports.actualizarEstadoSesion = async (req, res) => {
  try {
    const { empresaId, numeroOrigen } = req.params;
    const { estado } = req.body;

    const pedido = await Pedido.findOne({
      where: {
        empresa_id: empresaId,
        telefono_cliente: numeroOrigen,
        estado: { [Op.notIn]: ESTADOS_FINALES }
      },
      order: [['fecha_creacion', 'DESC']]
    });

    if (!pedido) {
      return res.status(404).json({ success: false, mensaje: 'No hay sesión activa' });
    }

    await pedido.update({ estado });

    res.json({
      success: true,
      mensaje: 'Estado actualizado',
      data: { id: pedido.id, estado: pedido.estado }
    });

  } catch (error) {
    console.error('❌ Error actualizando estado:', error);
    res.status(500).json({ success: false, mensaje: 'Error al actualizar estado', error: error.message });
  }
};

// ========================================
// RESTO DE FUNCIONES (sin cambios)
// ========================================
exports.obtenerPedidos = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const pedidos = await Pedido.findAll({
      where: { empresa_id: empresaId },
      order: [['fecha_creacion', 'DESC']]
    });

    const pedidosFormateados = pedidos.map(pedido => {
      const pedidoJSON = pedido.toJSON();
      return {
        ...pedidoJSON,
        cliente_display: pedidoJSON.push_name || pedidoJSON.nombre_cliente || 'Cliente',
        jid_whatsapp: pedidoJSON.jid_whatsapp || pedidoJSON.telefono_cliente,
        numero_real: pedidoJSON.numero_real
      };
    });

    res.json({ success: true, data: pedidosFormateados, total: pedidosFormateados.length });

  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener pedidos', error: error.message });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const { estado } = req.body;

    const pedido = await Pedido.findByPk(pedidoId);
    if (!pedido) {
      return res.status(404).json({ success: false, mensaje: 'Pedido no encontrado' });
    }

    await pedido.update({ estado });
    res.json({ success: true, mensaje: 'Estado actualizado', data: pedido });

  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al actualizar estado', error: error.message });
  }
};

exports.obtenerEstadisticas = async (req, res) => {
  try {
    const { empresaId } = req.params;

    const stats = await Pedido.findAll({
      where: {
        empresa_id: empresaId,
        estado: { [Op.in]: ESTADOS_FINALES }  // Solo estadísticas de pedidos reales
      },
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad'],
        [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas']
      ],
      group: ['estado'],
      raw: true
    });

    res.json({ success: true, data: { por_estado: stats } });

  } catch (error) {
    res.status(500).json({ success: false, mensaje: 'Error al obtener estadísticas', error: error.message });
  }
};
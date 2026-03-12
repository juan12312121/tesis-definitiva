const whatsappService = require('../services/whatsappService');
const { InstanciaWhatsapp } = require('../models');

class WhatsAppController {

  // ✅ OBTENER QR PARA CONECTAR (CORREGIDO COMPLETAMENTE)
  async obtenerQR(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 SOLICITUD DE QR`);
      console.log(`   Empresa ID: ${empresaId}`);
      console.log(`${'='.repeat(60)}`);

      // Buscar la instancia de la empresa
      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        console.log(`❌ No se encontró instancia para empresa ${empresaId}`);
        return res.status(404).json({
          success: false,
          message: 'No tienes una instancia de WhatsApp. Contacta a soporte.'
        });
      }

      console.log(`✅ Instancia encontrada: ${instancia.nombre_sesion}`);
      console.log(`   Conectado: ${instancia.conectado}`);

      // Si ya está conectada
      if (instancia.conectado) {
        console.log(`✅ WhatsApp ya está conectado`);
        return res.status(200).json({
          success: true,
          conectado: true,
          message: 'WhatsApp ya está conectado',
          data: {
            nombre_sesion: instancia.nombre_sesion,
            ultima_conexion: instancia.ultima_conexion,
            numero_telefono: instancia.numero_telefono
          }
        });
      }

      // Obtener QR desde el servicio
      const resultadoQR = whatsappService.obtenerQR(empresaId, instancia.nombre_sesion);

      console.log(`📊 Resultado QR desde servicio:`, resultadoQR);

      if (!resultadoQR || !resultadoQR.success) {
        // Si no hay QR, intentar reiniciar la sesión
        console.log(`⚠️ No hay QR disponible, verificando estado...`);

        const estado = await whatsappService.verificarEstado(empresaId, instancia.nombre_sesion);

        console.log(`📊 Estado de sesión:`, estado);

        if (!estado.existe) {
          // La sesión no existe, crearla
          console.log(`🔄 Sesión no existe para empresa ${empresaId}, iniciando...`);
          await whatsappService.iniciarSesion(empresaId, instancia.nombre_sesion);

          return res.status(200).json({
            success: false,
            message: 'Sesión iniciándose. Espera 5 segundos y recarga la página.',
            estado
          });
        }

        return res.status(200).json({
          success: false,
          message: 'QR no disponible',
          detalles: 'La sesión está iniciándose. Espera 5-10 segundos e intenta nuevamente',
          estado
        });
      }

      // 🔥 CORRECCIÓN: Extraer el QR correctamente
      const qrCode = resultadoQR.qr; // ← Extraer el string directamente

      console.log(`✅ QR encontrado, enviando al frontend...`);
      console.log(`📦 QR length: ${qrCode?.length || 0} caracteres`);
      console.log(`📦 QR preview: ${qrCode?.substring(0, 50)}...`);

      // 🔥 RESPUESTA CORRECTA PARA EL FRONTEND
      res.status(200).json({
        success: true,
        qrCode: qrCode,  // ← Enviar el string directamente, NO un objeto
        mensaje: 'Escanea el QR en los próximos 60 segundos'
      });

      console.log(`✅ Respuesta enviada correctamente`);
      console.log(`${'='.repeat(60)}\n`);

    } catch (error) {
      console.error(`\n${'='.repeat(60)}`);
      console.error('❌ ERROR AL OBTENER QR');
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
      console.error(`${'='.repeat(60)}\n`);

      res.status(500).json({
        success: false,
        message: 'Error al obtener código QR',
        error: error.message
      });
    }
  }

  // ✅ VERIFICAR ESTADO DE CONEXIÓN
  async verificarEstado(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'No tienes una instancia de WhatsApp'
        });
      }

      const estado = await whatsappService.verificarEstado(empresaId, instancia.nombre_sesion);

      res.json({
        success: true,
        data: {
          instancia_id: instancia.id,
          nombre_sesion: instancia.nombre_sesion,
          conectado: estado.conectado,
          numero_conectado: estado.numero,
          ultima_conexion: instancia.ultima_conexion,
          existe_sesion: estado.existe
        }
      });

    } catch (error) {
      console.error('Error al verificar estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar estado de WhatsApp'
      });
    }
  }

  // ✅ PROCESAR MENSAJE DESDE N8N (RUTA PÚBLICA)
  async procesarMensajeN8N(req, res) {
    try {
      const { empresaId, nombreSesion, numeroDestino, mensaje } = req.body;

      console.log(`
╔════════════════════════════════════════════════════════╗
║        🔄 PROCESANDO MENSAJE DESDE N8N                ║
╠════════════════════════════════════════════════════════╣
║ 🏢 Empresa ID:    ${empresaId}
║ 📱 Sesión:        ${nombreSesion}
║ 📞 Destino:       ${numeroDestino}
║ 💬 Mensaje:       ${mensaje}
╚════════════════════════════════════════════════════════╝
      `);

      const resultado = await whatsappService.enviarMensaje(
        empresaId,
        nombreSesion,
        numeroDestino,
        mensaje
      );

      res.json({
        success: true,
        message: 'Mensaje procesado por N8N',
        data: resultado
      });
    } catch (error) {
      console.error('❌ Error procesando mensaje N8N:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // ✅ ENVIAR MENSAJE (desde el dashboard)
  async enviarMensaje(req, res) {
    try {
      const { numero_destino, numeroDestino, mensaje } = req.body;
      const empresaId = req.usuario.empresa_id;

      const destino = numero_destino || numeroDestino;

      if (!destino || !mensaje) {
        return res.status(400).json({
          success: false,
          message: 'Número de destino y mensaje son requeridos'
        });
      }

      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'No tienes una instancia de WhatsApp configurada'
        });
      }

      if (!instancia.conectado) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp no está conectado. Por favor escanea el QR primero.'
        });
      }

      await whatsappService.enviarMensaje(
        empresaId,
        instancia.nombre_sesion,
        destino,
        mensaje
      );

      res.status(200).json({
        success: true,
        message: 'Mensaje enviado correctamente'
      });

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      res.status(500).json({
        success: false,
        message: 'Error al enviar mensaje',
        error: error.message
      });
    }
  }

  // ✅ DESCONECTAR WHATSAPP
  async desconectarInstancia(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      if (!instancia.conectado) {
        return res.status(400).json({
          success: false,
          message: 'WhatsApp ya está desconectado'
        });
      }

      await whatsappService.cerrarSesion(empresaId, instancia.nombre_sesion);

      res.status(200).json({
        success: true,
        message: 'WhatsApp desconectado correctamente'
      });

    } catch (error) {
      console.error('Error al desconectar:', error);
      res.status(500).json({
        success: false,
        message: 'Error al desconectar WhatsApp'
      });
    }
  }

  // ✅ REINICIAR CONEXIÓN
  async reiniciarConexion(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'Instancia no encontrada'
        });
      }

      console.log(`🔄 Reiniciando conexión para empresa ${empresaId}...`);

      try {
        await whatsappService.cerrarSesion(empresaId, instancia.nombre_sesion);
      } catch (err) {
        console.log('⚠️ No había sesión activa para cerrar');
      }

      await whatsappService.iniciarSesion(empresaId, instancia.nombre_sesion);

      res.json({
        success: true,
        message: 'Conexión reiniciada. Obtén el QR para conectar nuevamente.'
      });

    } catch (error) {
      console.error('Error al reiniciar conexión:', error);
      res.status(500).json({
        success: false,
        message: 'Error al reiniciar conexión',
        error: error.message
      });
    }
  }

  async obtenerConfiguracionChatbot(req, res) {
    try {
      const { empresaId } = req.query;

      if (!empresaId) {
        return res.status(400).json({
          success: false,
          message: 'empresaId es requerido'
        });
      }

      const ConfiguracionChatbot = require('../models/ConfiguracionChatbot');
      const { InstanciaWhatsapp, Empresa } = require('../models');

      const config = await ConfiguracionChatbot.findOne({
        where: {
          empresa_id: empresaId,
          activo: true
        }
      });

      const empresa = await Empresa.findByPk(empresaId);

      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'No existe una instancia de WhatsApp configurada para esta empresa'
        });
      }

      if (!config) {
        res.json({
          nombreSesion: instancia.nombre_sesion,
          conectado: instancia.conectado,
          mensaje_horario: "¡Hola! Estamos disponibles de 9:00 AM a 6:00 PM de Lunes a Viernes",
          mensaje_fuera_horario: "Gracias por contactarnos. Nuestro horario es de 9:00 AM a 6:00 PM de Lunes a Viernes. Te responderemos pronto.",
          hora_inicio: 9,
          hora_fin: 18,
          dias_laborales: [1, 2, 3, 4, 5],
          trigger_horarios: "horario",
          trigger_productos: "productos",
          tipo_negocio: empresa?.tipo_negocio || 'productos'
        });
      }

      const horaInicio = config.horario_inicio ? parseInt(config.horario_inicio.split(':')[0]) : 9;
      const horaFin = config.horario_fin ? parseInt(config.horario_fin.split(':')[0]) : 18;

      res.json({
        nombreSesion: instancia.nombre_sesion,
        conectado: instancia.conectado,
        mensaje_horario: config.mensaje_bienvenida || "¡Hola! Estamos disponibles para atenderte",
        mensaje_fuera_horario: config.mensaje_fuera_horario || "Gracias por contactarnos. Te responderemos pronto.",
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        dias_laborales: config.dias_laborales || [1, 2, 3, 4, 5],
        trigger_horarios: "horario",
        trigger_productos: "productos",
        tipo_negocio: empresa?.tipo_negocio || 'productos'
      });

    } catch (error) {
      console.error('❌ Error obteniendo configuración chatbot:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async enviarRespuestaN8N(req, res) {
    try {
      const { empresaId, nombreSesion, numeroDestino, mensaje, botones } = req.body;

      console.log(`
╔════════════════════════════════════════════════════════╗
║         📤 ENVIANDO RESPUESTA DESDE N8N               ║
╠════════════════════════════════════════════════════════╣
║ 🏢 Empresa:    ${empresaId}
║ 📱 Sesión:     ${nombreSesion}
║ 📞 Para:       ${numeroDestino}
║ 💬 Mensaje:    ${mensaje?.substring(0, 100)}${mensaje?.length > 100 ? '...' : ''}
║ 🔘 Botones:    ${botones ? botones.length : 0}
╚════════════════════════════════════════════════════════╝
      `);

      if (!empresaId || !nombreSesion || !numeroDestino || !mensaje) {
        console.error(`❌ ERROR: Faltan parámetros`);
        return res.status(400).json({
          success: false,
          error: 'Faltan parámetros requeridos: empresaId, nombreSesion, numeroDestino, mensaje'
        });
      }

      let nombreSesionReal = nombreSesion;

      if (nombreSesion && nombreSesion.includes('_')) {
        const prefijo = `${empresaId}_`;
        if (nombreSesion.startsWith(prefijo)) {
          nombreSesionReal = nombreSesion.substring(prefijo.length);
          console.log(`✅ Nombre de sesión extraído: "${nombreSesionReal}"`);
        }
      }

      const resultado = await whatsappService.enviarMensaje(
        empresaId,
        nombreSesionReal,
        numeroDestino,
        mensaje
      );

      console.log(`✅ Respuesta enviada exitosamente desde N8N`);

      res.json({
        success: true,
        mensaje: 'Respuesta enviada correctamente',
        messageId: resultado.key?.id,
        timestamp: new Date().toISOString(),
        destinatario: numeroDestino,
        conBotones: botones ? true : false
      });

    } catch (error) {
      console.error(`❌ ERROR ENVIANDO RESPUESTA DESDE N8N:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = new WhatsAppController();
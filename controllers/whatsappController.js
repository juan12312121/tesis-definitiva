const whatsappService = require('../services/whatsappService');
const { InstanciaWhatsapp } = require('../models');

class WhatsAppController {

  // ✅ OBTENER QR PARA CONECTAR (simplificado - una instancia por empresa)
  async obtenerQR(req, res) {
    try {
      const empresaId = req.usuario.empresa_id;

      // Buscar la instancia de la empresa
      const instancia = await InstanciaWhatsapp.findOne({
        where: { empresa_id: empresaId }
      });

      if (!instancia) {
        return res.status(404).json({
          success: false,
          message: 'No tienes una instancia de WhatsApp. Contacta a soporte.'
        });
      }

      // Si ya está conectada
      if (instancia.conectado) {
        return res.status(200).json({
          success: true,
          conectado: true,
          message: 'WhatsApp ya está conectado',
          data: {
            nombre_sesion: instancia.nombre_sesion,
            ultima_conexion: instancia.ultima_conexion
          }
        });
      }

      // Obtener QR
      const qrCode = whatsappService.obtenerQR(empresaId, instancia.nombre_sesion);

      if (!qrCode) {
        // Si no hay QR, intentar reiniciar la sesión
        const estado = await whatsappService.verificarEstado(empresaId, instancia.nombre_sesion);
        
        if (!estado.existe) {
          // La sesión no existe, crearla
          console.log(`⚠️ Sesión no existe para empresa ${empresaId}, iniciando...`);
          await whatsappService.iniciarSesion(empresaId, instancia.nombre_sesion);
          
          return res.status(200).json({
            success: false,
            message: 'Sesión iniciándose. Espera 5 segundos e intenta nuevamente.',
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

      res.status(200).json({
        success: true,
        qrCode,
        mensaje: 'Escanea el QR en los próximos 60 segundos'
      });

    } catch (error) {
      console.error('Error al obtener QR:', error);
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
          numero_conectado: estado.numeroConectado,
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
      const { numero_destino, mensaje } = req.body;
      const empresaId = req.usuario.empresa_id;

      if (!numero_destino || !mensaje) {
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
        numero_destino,
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

  // ✅ REINICIAR CONEXIÓN (si se perdió o necesita nuevo QR)
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
      
      // Cerrar sesión actual si existe
      try {
        await whatsappService.cerrarSesion(empresaId, instancia.nombre_sesion);
      } catch (err) {
        console.log('⚠️ No había sesión activa para cerrar');
      }
      
      // Iniciar sesión nuevamente (generará nuevo QR)
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
}

module.exports = new WhatsAppController();
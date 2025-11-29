const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const { verificarToken } = require('../middleware/auth.middleware');

// ========================================
// 🌐 RUTA PÚBLICA PARA N8N
// ========================================
router.post('/procesar-n8n', whatsappController.procesarMensajeN8N);

// ========================================
// 🔒 RUTAS PROTEGIDAS (requieren token)
// ========================================
router.use(verificarToken);

// Gestión de WhatsApp (una instancia por empresa)
router.get('/qr', whatsappController.obtenerQR);
router.get('/estado', whatsappController.verificarEstado);
router.post('/enviar', whatsappController.enviarMensaje);
router.post('/desconectar', whatsappController.desconectarInstancia);
router.post('/reiniciar', whatsappController.reiniciarConexion);

// ========================================
// 🧪 ENDPOINTS DE DEBUG Y TESTING
// ========================================

// Ver estado detallado de todas las sesiones activas
router.get('/debug/sesiones', async (req, res) => {
  try {
    const whatsappService = require('../services/whatsappService');
    const estados = whatsappService.obtenerEstadoGeneral();
    
    const sesiones = [];
    for (const [key, sock] of whatsappService.sessions.entries()) {
      const eventListeners = sock.ev ? {
        'messages.upsert': sock.ev.listenerCount('messages.upsert'),
        'connection.update': sock.ev.listenerCount('connection.update'),
        'creds.update': sock.ev.listenerCount('creds.update'),
      } : {};

      sesiones.push({
        sessionKey: key,
        tieneEventEmitter: !!sock.ev,
        eventListeners,
        usuario: sock.user?.id || null,
        nombreUsuario: sock.user?.name || null,
        conectado: whatsappService.sessionReady.get(key),
        tieneQR: whatsappService.qrCodes.has(key)
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalSesiones: estados.length,
      sesionesActivas: sesiones.filter(s => s.conectado).length,
      sesionesConectadas: sesiones.filter(s => s.conectado),
      todasLasSesiones: sesiones,
      estadosGenerales: estados
    });
  } catch (error) {
    console.error('❌ Error en debug/sesiones:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint para enviar mensaje de prueba
router.post('/debug/test-enviar', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroDestino, mensaje } = req.body;
    
    if (!empresaId || !nombreSesion || !numeroDestino) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros: empresaId, nombreSesion, numeroDestino son requeridos'
      });
    }

    console.log('\n🧪 TEST: Enviando mensaje de prueba...');
    console.log(`   Empresa: ${empresaId}`);
    console.log(`   Sesión: ${nombreSesion}`);
    console.log(`   Destino: ${numeroDestino}`);
    
    const whatsappService = require('../services/whatsappService');
    
    // Verificar que la sesión existe
    const estado = await whatsappService.verificarEstado(empresaId, nombreSesion);
    console.log('   Estado de sesión:', estado);
    
    if (!estado.conectado) {
      return res.status(400).json({
        success: false,
        error: 'Sesión no conectada',
        estado
      });
    }

    const resultado = await whatsappService.enviarMensaje(
      empresaId, 
      nombreSesion, 
      numeroDestino, 
      mensaje || '🧪 Mensaje de prueba desde endpoint de debug'
    );
    
    console.log('✅ Mensaje enviado exitosamente desde debug');
    
    res.json({
      success: true,
      mensaje: 'Mensaje de prueba enviado',
      resultado,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error en test-enviar:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Forzar re-registro de eventos
router.post('/debug/recargar-eventos/:empresaId/:nombreSesion', async (req, res) => {
  try {
    const { empresaId, nombreSesion } = req.params;
    const whatsappService = require('../services/whatsappService');
    
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = whatsappService.sessions.get(sessionKey);
    
    if (!sock) {
      return res.status(404).json({
        success: false,
        error: 'Sesión no encontrada'
      });
    }

    console.log(`🔄 Recargando eventos para ${sessionKey}...`);
    
    // Re-registrar eventos
    whatsappService.registrarEventosMensajes(sock, parseInt(empresaId), nombreSesion, sessionKey);
    
    res.json({
      success: true,
      mensaje: 'Eventos recargados',
      sessionKey,
      listeners: {
        'messages.upsert': sock.ev.listenerCount('messages.upsert'),
        'connection.update': sock.ev.listenerCount('connection.update')
      }
    });
  } catch (error) {
    console.error('❌ Error recargando eventos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simular mensaje entrante para testing
router.post('/debug/simular-mensaje-entrante', async (req, res) => {
  try {
    const { empresaId, nombreSesion, numeroOrigen, mensaje } = req.body;
    
    console.log(`
╔════════════════════════════════════════════════════════╗
║           🎭 SIMULACIÓN DE MENSAJE ENTRANTE           ║
╠════════════════════════════════════════════════════════╣
║ 🏢 Empresa ID:    ${empresaId}
║ 📱 Sesión:        ${nombreSesion}
║ 📞 De:            ${numeroOrigen}
║ 💬 Mensaje:       ${mensaje}
╚════════════════════════════════════════════════════════╝
    `);

    // Enviar directamente a N8N
    try {
      const response = await fetch('http://localhost:5678/webhook/whatsapp-mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          nombreSesion,
          numeroOrigen,
          mensaje,
          messageId: `SIMULADO_${Date.now()}`,
          timestamp: new Date(),
          esSimulacion: true
        })
      });

      const resultado = await response.json();
      
      res.json({
        success: true,
        mensaje: 'Mensaje simulado enviado a N8N',
        respuestaN8N: resultado
      });
    } catch (n8nError) {
      res.json({
        success: true,
        mensaje: 'Mensaje simulado (N8N no respondió)',
        error: n8nError.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ver QR en el navegador (versión visual)
router.get('/qr-visual', async (req, res) => {
  try {
    const empresaId = req.usuario.empresa_id;
    const { InstanciaWhatsapp } = require('../models');
    
    const instancia = await InstanciaWhatsapp.findOne({
      where: { empresa_id: empresaId }
    });
    
    if (!instancia) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Error - WhatsApp</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
            }
            h1 { color: #dc3545; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>❌ No tienes instancia de WhatsApp</h1>
            <p>Tu empresa no tiene una instancia de WhatsApp configurada.</p>
            <p>Contacta a soporte técnico para resolver este problema.</p>
          </div>
        </body>
        </html>
      `);
    }
    
    const whatsappService = require('../services/whatsappService');
    const qr = whatsappService.obtenerQR(empresaId, instancia.nombre_sesion);
    
    if (!qr) {
      // WhatsApp ya conectado o QR no disponible
      const conectado = instancia.conectado;
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>WhatsApp - Estado</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
            }
            h1 { 
              color: ${conectado ? '#28a745' : '#ffc107'}; 
              margin-bottom: 20px; 
            }
            .status { 
              padding: 15px 20px; 
              background: ${conectado ? '#d4edda' : '#fff3cd'}; 
              color: ${conectado ? '#155724' : '#856404'};
              border-radius: 10px;
              margin: 20px 0;
              font-weight: 500;
            }
            .info {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin-top: 20px;
              text-align: left;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #dee2e6;
            }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: 600; color: #495057; }
            .value { color: #6c757d; }
            button {
              padding: 12px 24px;
              background: ${conectado ? '#dc3545' : '#007bff'};
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
              transition: background 0.3s;
            }
            button:hover { 
              background: ${conectado ? '#c82333' : '#0056b3'}; 
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${conectado ? '✅ WhatsApp Conectado' : '⚠️ QR No Disponible'}</h1>
            <div class="status">
              ${conectado 
                ? 'Tu WhatsApp está conectado y funcionando correctamente.' 
                : 'El QR no está disponible en este momento. La sesión puede estar iniciándose.'}
            </div>
            
            <div class="info">
              <div class="info-row">
                <span class="label">Sesión:</span>
                <span class="value">${instancia.nombre_sesion}</span>
              </div>
              <div class="info-row">
                <span class="label">Estado:</span>
                <span class="value">${conectado ? 'Conectado' : 'Desconectado'}</span>
              </div>
              ${instancia.ultima_conexion ? `
              <div class="info-row">
                <span class="label">Última conexión:</span>
                <span class="value">${new Date(instancia.ultima_conexion).toLocaleString('es-MX')}</span>
              </div>
              ` : ''}
            </div>
            
            <button onclick="location.reload()">
              ${conectado ? 'Recargar' : 'Intentar Nuevamente'}
            </button>
          </div>
        </body>
        </html>
      `);
    }
    
    // Mostrar QR
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR WhatsApp - ${instancia.nombre_sesion}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
            animation: fadeIn 0.5s;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          h1 { 
            color: #25D366; 
            margin-bottom: 10px;
            font-size: 28px;
          }
          .empresa {
            color: #666;
            font-size: 14px;
            margin-bottom: 20px;
          }
          img { 
            max-width: 100%; 
            border: 5px solid #25D366; 
            border-radius: 15px;
            margin: 20px 0;
            box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
          }
          .info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 10px;
            margin-top: 20px;
            text-align: left;
          }
          .info h3 { 
            margin-bottom: 15px;
            color: #333;
            font-size: 18px;
          }
          .info ol { 
            padding-left: 20px;
            margin: 0;
          }
          .info li { 
            margin: 10px 0;
            line-height: 1.6;
            color: #555;
          }
          .timer {
            margin-top: 20px;
            padding: 12px;
            background: #fff3cd;
            border-radius: 8px;
            color: #856404;
            font-weight: 500;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            background: #ffc107;
            color: white;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 15px;
            animation: pulse 2s infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="status">🔄 Esperando conexión</div>
          <h1>📱 Conecta tu WhatsApp</h1>
          <div class="empresa">Sesión: <strong>${instancia.nombre_sesion}</strong></div>
          
          <img src="${qr}" alt="QR WhatsApp" />
          
          <div class="info">
            <h3>📋 Pasos para conectar:</h3>
            <ol>
              <li>Abre <strong>WhatsApp</strong> en tu teléfono</li>
              <li>Ve a <strong>Menú ⋮</strong> o <strong>Configuración ⚙️</strong></li>
              <li>Toca <strong>Dispositivos vinculados</strong></li>
              <li>Toca <strong>Vincular un dispositivo</strong></li>
              <li>Escanea este código QR</li>
            </ol>
          </div>
          
          <div class="timer">
            ⏱️ Recargando en <span id="timer">30</span> segundos
          </div>
        </div>
        
        <script>
          let seconds = 30;
          const timer = setInterval(() => {
            seconds--;
            document.getElementById('timer').textContent = seconds;
            if (seconds <= 0) location.reload();
          }, 1000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en qr-visual:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>❌ Error</h1>
        <p>${error.message}</p>
      </body>
      </html>
    `);
  }
});

module.exports = router;
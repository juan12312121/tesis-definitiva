const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const baileys = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { InstanciaWhatsapp } = require('../models');
const pino = require('pino');

class WhatsAppService {
  constructor() {
    this.sessions = new Map();
    this.qrCodes = new Map();
    this.reconnectAttempts = new Map();
    this.sessionReady = new Map();
    this.stores = new Map();
    this.lastMessageTime = new Map(); // 🆕 Última vez que llegó un mensaje
    this.healthCheckIntervals = new Map(); // 🆕 Intervalos de health check
    console.log('✅ WhatsAppService constructor ejecutado');
  }

  registrarEventosMensajes(sock, empresaId, nombreSesion, sessionKey) {
    console.log(`
╔════════════════════════════════════════════════════════╗
║     🔍 INICIANDO REGISTRO DE EVENTOS - DIAGNÓSTICO    ║
╠════════════════════════════════════════════════════════╣
║ SessionKey: ${sessionKey}
║ Empresa ID: ${empresaId}
║ Sesión:     ${nombreSesion}
╚════════════════════════════════════════════════════════╝
    `);

    // 1. Verificar que sock existe
    console.log(`[PASO 1] ✓ sock existe: ${!!sock}`);
    console.log(`[PASO 2] ✓ sock.ev existe: ${!!sock.ev}`);
    console.log(`[PASO 3] ✓ Tipo de sock.ev: ${typeof sock.ev}`);
    console.log(`[PASO 4] ✓ sock.ev.on es función: ${typeof sock.ev.on === 'function'}`);

    // 2. Listar métodos disponibles en sock.ev
    console.log(`[PASO 5] 📋 Métodos de sock.ev:`, Object.keys(sock.ev).join(', '));

    // 3. Intentar múltiples formas de registrar el evento
    console.log(`[PASO 6] 🔄 Registrando messages.upsert con .on()...`);
    
    try {
      sock.ev.on('messages.upsert', (data) => {
        console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎉 ¡EVENTO messages.upsert CAPTURADO CON .on()!         ║
╠═══════════════════════════════════════════════════════════╣
║  Data recibida: ${JSON.stringify(Object.keys(data))}
╚═══════════════════════════════════════════════════════════╝
        `);
        this.procesarMensajes(data, empresaId, nombreSesion, sessionKey, sock);
      });
      console.log(`[PASO 6] ✅ Listener .on('messages.upsert') registrado`);
    } catch (error) {
      console.log(`[PASO 6] ❌ Error con .on(): ${error.message}`);
    }

    // 4. Intentar con process si existe
    if (typeof sock.ev.process === 'function') {
      console.log(`[PASO 7] 🔄 Registrando con .process()...`);
      try {
        sock.ev.process(async (events) => {
          // Log de TODOS los eventos recibidos
          const eventKeys = Object.keys(events);
          console.log(`
╔═══════════════════════════════════════════════════════════╗
║  🎉 ¡EVENTO CAPTURADO CON .process()!                    ║
╠═══════════════════════════════════════════════════════════╣
║  Events keys: ${JSON.stringify(eventKeys)}
╚═══════════════════════════════════════════════════════════╝
          `);
          
          // Procesar TODOS los eventos de mensajes
          if (events['messages.upsert']) {
            console.log(`✅ messages.upsert encontrado en process`);
            this.procesarMensajes(events['messages.upsert'], empresaId, nombreSesion, sessionKey, sock);
          }
          
          if (events['messages.update']) {
            console.log(`✅ messages.update encontrado`);
          }
          
          if (events['chats.upsert']) {
            console.log(`✅ chats.upsert encontrado`);
          }
        });
        
        // ✅ CRÍTICO: Forzar flush del buffer
        console.log(`[PASO 7.1] 🔄 Forzando flush de buffer...`);
        if (typeof sock.ev.flush === 'function') {
          setInterval(() => {
            sock.ev.flush();
          }, 1000);
          console.log(`[PASO 7.1] ✅ Auto-flush activado cada 1s`);
        }
        
        console.log(`[PASO 7] ✅ Listener .process() registrado`);
      } catch (error) {
        console.log(`[PASO 7] ❌ Error con .process(): ${error.message}`);
      }
    } else {
      console.log(`[PASO 7] ⚠️ sock.ev.process no existe`);
    }

    // 5. Interceptar emit para ver TODOS los eventos
    console.log(`[PASO 8] 🔄 Interceptando emit...`);
    try {
      const originalEmit = sock.ev.emit.bind(sock.ev);
      let emitCounter = 0;
      
      sock.ev.emit = function(eventName, ...args) {
        emitCounter++;
        
        // Filtrar eventos ruidosos
        const eventosRuidosos = ['creds.update', 'connection.update'];
        if (!eventosRuidosos.includes(eventName)) {
          console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🔔 EMIT INTERCEPTADO #${emitCounter}
┃  Evento: "${eventName}"
┃  Args length: ${args.length}
┃  Session: ${sessionKey}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
          `);
          
          // Si es messages.upsert, procesarlo
          if (eventName === 'messages.upsert' && args[0]) {
            console.log(`✅ Detectado messages.upsert en emit, procesando...`);
            this.procesarMensajes(args[0], empresaId, nombreSesion, sessionKey, sock);
          }
        }
        
        return originalEmit(eventName, ...args);
      }.bind(this);
      
      console.log(`[PASO 8] ✅ Interceptor de emit instalado`);
    } catch (error) {
      console.log(`[PASO 8] ❌ Error interceptando emit: ${error.message}`);
    }

    // 6. Registrar otros eventos para debug
    console.log(`[PASO 9] 🔄 Registrando eventos adicionales...`);
    
    const eventosARegistrar = [
      'messages.update',
      'message-receipt.update', 
      'chats.upsert',
      'contacts.upsert',
      'messaging-history.set'
    ];

    eventosARegistrar.forEach((evento, index) => {
      try {
        sock.ev.on(evento, (data) => {
          console.log(`📬 [${sessionKey}] Evento "${evento}" disparado`);
        });
        console.log(`[PASO 9.${index + 1}] ✅ Listener para "${evento}" registrado`);
      } catch (error) {
        console.log(`[PASO 9.${index + 1}] ❌ Error con "${evento}": ${error.message}`);
      }
    });

    console.log(`
╔════════════════════════════════════════════════════════╗
║     ✅ REGISTRO DE EVENTOS COMPLETADO                 ║
╠════════════════════════════════════════════════════════╣
║ Session: ${sessionKey}
║ Estado:  Escuchando eventos
╚════════════════════════════════════════════════════════╝
    `);

    // ⚠️ WORKAROUND: Si events no llegan, usar polling manual
    console.log(`[WORKAROUND] 🔄 Iniciando polling manual de chats cada 3s...`);
    
    const chatPolling = setInterval(async () => {
      try {
        // Obtener chats recientes
        const chats = await sock.store?.chats?.all?.() || [];
        
        if (chats.length > 0) {
          console.log(`[POLLING] 📊 ${chats.length} chats disponibles`);
        }
      } catch (error) {
        // Silencioso
      }
    }, 3000);
    
    // Guardar para limpieza
    sock._chatPolling = chatPolling;

    sock._eventosRegistrados = true;
    
    // 🆕 INICIAR HEALTH CHECK AUTOMÁTICO
    this.iniciarHealthCheck(sock, empresaId, nombreSesion, sessionKey);
  }

  // 🆕 SISTEMA DE SALUD AUTOMÁTICO
  iniciarHealthCheck(sock, empresaId, nombreSesion, sessionKey) {
    console.log(`[HEALTH] 🏥 Iniciando monitoreo de salud para ${sessionKey}`);
    
    // Limpiar health check anterior si existe
    if (this.healthCheckIntervals.has(sessionKey)) {
      clearInterval(this.healthCheckIntervals.get(sessionKey));
    }
    
    // Inicializar timestamp
    this.lastMessageTime.set(sessionKey, Date.now());
    
    // Health check cada 30 segundos
    const healthInterval = setInterval(() => {
      const ahora = Date.now();
      const ultimoMensaje = this.lastMessageTime.get(sessionKey) || ahora;
      const tiempoSinMensajes = Math.floor((ahora - ultimoMensaje) / 1000);
      
      // Si la sesión no está lista, skip
      if (!this.sessionReady.get(sessionKey)) {
        console.log(`[HEALTH] ⚠️ ${sessionKey}: Sesión no ready, esperando...`);
        return;
      }
      
      // Si han pasado más de 5 minutos sin mensajes, hacer test
      if (tiempoSinMensajes > 300) { // 5 minutos
        console.log(`[HEALTH] ⚠️ ${sessionKey}: ${Math.floor(tiempoSinMensajes/60)} min sin eventos`);
        console.log(`[HEALTH] 🔧 Aplicando fix preventivo...`);
        
        try {
          // Re-registrar eventos
          sock._eventosRegistrados = false;
          this.registrarEventosMensajes(sock, empresaId, nombreSesion, sessionKey);
          
          // Forzar flush
          if (typeof sock.ev.flush === 'function') {
            sock.ev.flush();
          }
          
          // Actualizar timestamp para no hacer esto repetidamente
          this.lastMessageTime.set(sessionKey, Date.now());
          
          console.log(`[HEALTH] ✅ Fix aplicado a ${sessionKey}`);
        } catch (error) {
          console.error(`[HEALTH] ❌ Error en fix: ${error.message}`);
        }
      } else if (tiempoSinMensajes > 60) {
        // Log cada minuto si no hay actividad
        console.log(`[HEALTH] 💚 ${sessionKey}: Activo (último evento hace ${tiempoSinMensajes}s)`);
      }
    }, 30000); // Cada 30 segundos
    
    this.healthCheckIntervals.set(sessionKey, healthInterval);
    console.log(`[HEALTH] ✅ Health check activado para ${sessionKey}`);
  }

  procesarMensajes(data, empresaId, nombreSesion, sessionKey, sock) {
    // 🆕 ACTUALIZAR timestamp de último mensaje
    this.lastMessageTime.set(sessionKey, Date.now());
    
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  📦 PROCESANDO MENSAJES                                   ║
╠═══════════════════════════════════════════════════════════╣
║  Session: ${sessionKey}
║  Data type: ${typeof data}
║  Data keys: ${JSON.stringify(Object.keys(data || {}))}
╚═══════════════════════════════════════════════════════════╝
    `);

    const { messages, type } = data;
    
    if (!messages || !Array.isArray(messages)) {
      console.log(`⚠️ No hay mensajes válidos para procesar`);
      return;
    }

    console.log(`📨 Procesando ${messages.length} mensaje(s), type: ${type}`);

    messages.forEach((msg, index) => {
      console.log(`
═══════════════════ MENSAJE #${index + 1} ═══════════════════
fromMe: ${msg.key.fromMe}
remoteJid: ${msg.key.remoteJid}
id: ${msg.key.id}
messageTimestamp: ${msg.messageTimestamp}
message exists: ${!!msg.message}
message keys: ${msg.message ? Object.keys(msg.message).join(', ') : 'N/A'}
════════════════════════════════════════════════════════════
      `);

      let textoMensaje = 'Sin texto';
      
      if (msg.message) {
        textoMensaje = msg.message?.conversation || 
                      msg.message?.extendedTextMessage?.text || 
                      msg.message?.imageMessage?.caption ||
                      (msg.message?.imageMessage ? '[Imagen]' : '') ||
                      (msg.message?.videoMessage ? '[Video]' : '') ||
                      (msg.message?.audioMessage ? '[Audio]' : '') ||
                      'Mensaje multimedia';
      }

      const esStatus = msg.key.remoteJid === 'status@broadcast';
      const esNewsletter = msg.key.remoteJid?.includes('@newsletter');
      
      // Mensaje RECIBIDO (de otros)
      if (!msg.key.fromMe && msg.message && !esStatus && !esNewsletter) {
        const numeroOrigen = msg.key.remoteJid;
        const timestamp = new Date(msg.messageTimestamp * 1000).toLocaleString('es-MX');
        
        console.log(`
╔════════════════════════════════════════════════════════╗
║           📩 MENSAJE RECIBIDO DETECTADO               ║
╠════════════════════════════════════════════════════════╣
║ De:       ${numeroOrigen}
║ Mensaje:  ${textoMensaje}
║ Hora:     ${timestamp}
╚════════════════════════════════════════════════════════╝
        `);

        // Enviar a N8N
        this.enviarAWebhook(empresaId, nombreSesion, numeroOrigen, textoMensaje, msg, sessionKey)
          .catch(err => console.error('❌ Error enviando a N8N:', err.message));
      }
      
      // Mensaje ENVIADO (propios)
      if (msg.key.fromMe && msg.message) {
        console.log(`
╔════════════════════════════════════════════════════════╗
║           📤 MENSAJE ENVIADO DETECTADO                ║
╠════════════════════════════════════════════════════════╣
║ Para:     ${msg.key.remoteJid}
║ Mensaje:  ${textoMensaje}
╚════════════════════════════════════════════════════════╝
        `);
      }
    });
  }

  async enviarAWebhook(empresaId, nombreSesion, numeroOrigen, mensaje, msg, sessionKey) {
    console.log(`🔄 Enviando a webhook N8N...`);
    
    try {
      const response = await fetch('http://localhost:5678/webhook/whatsapp-mensaje', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          nombreSesion,
          numeroOrigen,
          mensaje,
          messageId: msg.key.id,
          timestamp: new Date(msg.messageTimestamp * 1000),
          sessionKey,
          esGrupo: msg.key.remoteJid?.endsWith('@g.us'),
          participant: msg.key.participant || null
        })
      });
      
      if (response.ok) {
        console.log('✅ Mensaje enviado a N8N exitosamente');
      } else {
        console.log(`⚠️ N8N respondió con status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error enviando a N8N:', error.message);
    }
  }

  async iniciarSesion(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    
    console.log(`
╔════════════════════════════════════════════════════════╗
║     🚀 INICIANDO SESIÓN WHATSAPP                      ║
╠════════════════════════════════════════════════════════╣
║ SessionKey: ${sessionKey}
╚════════════════════════════════════════════════════════╝
    `);
    
    try {
      if (this.sessions.has(sessionKey)) {
        console.log(`⚠️ Sesión ${sessionKey} ya existe`);
        return { success: true, message: 'Sesión ya existe' };
      }

      const sessionPath = path.join(__dirname, '..', 'whatsapp-sessions', `session_${empresaId}_${nombreSesion}`);
      console.log(`[INIT-1] 📁 Session path: ${sessionPath}`);
      
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
        console.log(`[INIT-2] ✅ Carpeta creada`);
      } else {
        console.log(`[INIT-2] ✅ Carpeta ya existe`);
      }

      const credsPath = path.join(sessionPath, 'creds.json');
      const tieneCredenciales = fs.existsSync(credsPath);
      console.log(`[INIT-3] 🔐 Tiene credenciales: ${tieneCredenciales}`);

      console.log(`[INIT-4] 🔄 Cargando auth state...`);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      console.log(`[INIT-4] ✅ Auth state cargado`);
      
      console.log(`[INIT-5] 🔄 Obteniendo versión Baileys...`);
      const { version } = await fetchLatestBaileysVersion();
      console.log(`[INIT-5] ✅ Versión: ${version}`);

      // ✅ WORKAROUND: En reconexiones, forzar modo "limpio"
      if (tieneCredenciales) {
        console.log(`[INIT-5.1] 🔧 APLICANDO FIX: Modo reconexión fresca...`);
        
        // Modificar el state para forzar re-sincronización
        if (state && state.creds) {
          // Esto fuerza a Baileys a re-sincronizar mensajes
          state.creds.myAppStateKeyId = undefined;
          console.log(`[INIT-5.1] ✅ State modificado para forzar sync`);
        }
      }

      console.log(`[INIT-6] 🔄 Creando socket...`);
      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'),
        logger: pino({ level: 'silent' }),
        syncFullHistory: true,
        markOnlineOnConnect: true,
        getMessage: async (key) => undefined,
        // ✅ CRÍTICO: Forzar emisión de eventos
        emitOwnEvents: true,
        fireInitQueries: true,
        // ✅ Reducir buffer para forzar eventos inmediatos
        retryRequestDelayMs: 100,
        // ✅ Forzar que procese mensajes pendientes
        shouldSyncHistoryMessage: (msg) => true
      });
      console.log(`[INIT-6] ✅ Socket creado`);

      this.sessions.set(sessionKey, sock);
      this.sessionReady.set(sessionKey, false);
      console.log(`[INIT-7] ✅ Socket guardado en Map`);

      console.log(`[INIT-8] 🔄 Registrando eventos...`);
      this.registrarEventosMensajes(sock, empresaId, nombreSesion, sessionKey);
      console.log(`[INIT-8] ✅ Eventos registrados`);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        console.log(`[CONNECTION] Estado: ${connection}`);

        if (qr) {
          console.log(`[CONNECTION] 📱 QR generado`);
          try {
            const qrBase64 = await QRCode.toDataURL(qr);
            this.qrCodes.set(sessionKey, qrBase64);
            await InstanciaWhatsapp.update(
              { codigo_qr: qrBase64, conectado: false },
              { where: { empresa_id: empresaId, nombre_sesion: nombreSesion } }
            );
            console.log(`[CONNECTION] ✅ QR guardado`);
          } catch (qrError) {
            console.error('[CONNECTION] ❌ Error QR:', qrError);
          }
        }

        if (connection === 'open') {
          this.sessionReady.set(sessionKey, true);
          
          // ✅ CRÍTICO: RE-REGISTRAR EVENTOS DESPUÉS DE CONECTAR
          console.log(`[CONNECTION] 🔧 Aplicando fix post-conexión...`);
          
          // Esperar 2 segundos para que WhatsApp se estabilice
          setTimeout(() => {
            console.log(`[FIX] 🔄 Re-registrando todos los eventos...`);
            
            // Limpiar eventos anteriores
            sock._eventosRegistrados = false;
            
            // Re-registrar
            this.registrarEventosMensajes(sock, empresaId, nombreSesion, sessionKey);
            
            // ✅ FORZAR flush inmediato
            if (typeof sock.ev.flush === 'function') {
              sock.ev.flush();
              console.log(`[FIX] ✅ Flush forzado`);
            }
            
            // ✅ SIMULAR evento para probar
            console.log(`[FIX] 🧪 Sistema re-iniciado. Prueba enviar mensaje AHORA.`);
          }, 2000);
          
          console.log(`
╔════════════════════════════════════════════════════════╗
║        ✅ WHATSAPP CONECTADO                          ║
╠════════════════════════════════════════════════════════╣
║ Número: ${sock.user?.id}
║ Nombre: ${sock.user?.name || 'N/A'}
╚════════════════════════════════════════════════════════╝
          `);
          
          await InstanciaWhatsapp.update(
            { conectado: true, ultima_conexion: new Date(), codigo_qr: null },
            { where: { empresa_id: empresaId, nombre_sesion: nombreSesion } }
          );
          
          this.qrCodes.delete(sessionKey);
          
          // TEST: Enviar mensaje de prueba
          console.log(`
╔════════════════════════════════════════════════════════╗
║  🧪 SISTEMA LISTO PARA RECIBIR MENSAJES               ║
╠════════════════════════════════════════════════════════╣
║  Envía un mensaje desde OTRO número a:
║  ${sock.user?.id}
║  
║  Observa la consola para ver si se disparan eventos
╚════════════════════════════════════════════════════════╝
          `);
        }

        if (connection === 'close') {
          console.log(`[CONNECTION] ❌ Conexión cerrada`);
          this.sessionReady.set(sessionKey, false);
          
          // 🆕 Limpiar health check
          if (this.healthCheckIntervals.has(sessionKey)) {
            clearInterval(this.healthCheckIntervals.get(sessionKey));
            this.healthCheckIntervals.delete(sessionKey);
          }
          
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          
          if (shouldReconnect) {
            const attempts = this.reconnectAttempts.get(sessionKey) || 0;
            if (attempts < 5) {
              this.reconnectAttempts.set(sessionKey, attempts + 1);
              console.log(`[CONNECTION] 🔄 Reconectando (intento ${attempts + 1}/5)...`);
              this.sessions.delete(sessionKey);
              setTimeout(() => this.iniciarSesion(empresaId, nombreSesion), 5000);
            }
          } else {
            console.log(`[CONNECTION] 🚪 Logout manual`);
            this.sessions.delete(sessionKey);
            this.qrCodes.delete(sessionKey);
            await InstanciaWhatsapp.update(
              { conectado: false, codigo_qr: null },
              { where: { empresa_id: empresaId, nombre_sesion: nombreSesion } }
            );
          }
        }
      });

      sock.ev.on('creds.update', saveCreds);

      return { success: true, message: 'Sesión iniciada' };

    } catch (error) {
      console.error(`❌ Error en iniciarSesion:`, error);
      this.sessions.delete(sessionKey);
      throw error;
    }
  }

  async cargarSesionesGuardadas() {
    console.log('🔄 Cargando sesiones guardadas...');
    try {
      const instancias = await InstanciaWhatsapp.findAll();
      console.log(`📊 Encontradas ${instancias.length} sesiones`);

      for (const instancia of instancias) {
        console.log(`🔄 Cargando: ${instancia.empresa_id}_${instancia.nombre_sesion}`);
        await this.iniciarSesion(instancia.empresa_id, instancia.nombre_sesion);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log('✅ Sesiones cargadas');
    } catch (error) {
      console.error('❌ Error cargando sesiones:', error);
    }
  }

  obtenerSesion(empresaId, nombreSesion) {
    return this.sessions.get(`${empresaId}_${nombreSesion}`);
  }

  async verificarSesionLista(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = this.sessions.get(sessionKey);
    const esLista = this.sessionReady.get(sessionKey);
    return sock && esLista && sock.user !== undefined;
  }

  async enviarMensaje(empresaId, nombreSesion, numeroDestino, mensaje) {
    console.log(`📤 Enviando mensaje: ${mensaje.substring(0, 50)}...`);
    
    const sock = this.obtenerSesion(empresaId, nombreSesion);
    if (!sock) throw new Error('Sesión no encontrada');

    const sesionLista = await this.verificarSesionLista(empresaId, nombreSesion);
    if (!sesionLista) throw new Error('WhatsApp no conectado');

    let numero = numeroDestino.replace(/[^0-9]/g, '');
    if (!numero.startsWith('52') && numero.length === 10) {
      numero = '52' + numero;
    }

    const jid = `${numero}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text: mensaje });
    
    console.log(`✅ Mensaje enviado a ${jid}`);
    return { success: true, message: 'Mensaje enviado' };
  }

  async cerrarSesion(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = this.sessions.get(sessionKey);
    
    if (sock) {
      // 🆕 Limpiar health check
      if (this.healthCheckIntervals.has(sessionKey)) {
        clearInterval(this.healthCheckIntervals.get(sessionKey));
        this.healthCheckIntervals.delete(sessionKey);
        console.log(`[HEALTH] 🧹 Health check detenido para ${sessionKey}`);
      }
      
      // Limpiar polling si existe
      if (sock._chatPolling) {
        clearInterval(sock._chatPolling);
      }
      
      await sock.logout();
      this.sessions.delete(sessionKey);
      this.qrCodes.delete(sessionKey);
      this.lastMessageTime.delete(sessionKey);
      await InstanciaWhatsapp.update(
        { conectado: false, codigo_qr: null },
        { where: { empresa_id: empresaId, nombre_sesion: nombreSesion } }
      );
      return { success: true, message: 'Sesión cerrada' };
    }
    throw new Error('Sesión no encontrada');
  }

  obtenerQR(empresaId, nombreSesion) {
    return this.qrCodes.get(`${empresaId}_${nombreSesion}`);
  }

  async verificarEstado(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = this.sessions.get(sessionKey);
    const sesionLista = this.sessionReady.get(sessionKey);
    
    return {
      existe: !!sock,
      conectado: sesionLista && sock?.user !== undefined,
      tieneQR: this.qrCodes.has(sessionKey),
      numeroConectado: sock?.user?.id || null,
      lista: sesionLista
    };
  }

  obtenerEstadoGeneral() {
    const estados = [];
    for (const [sessionKey, sock] of this.sessions.entries()) {
      const esLista = this.sessionReady.get(sessionKey);
      estados.push({
        sessionKey,
        conectado: esLista && sock?.user !== undefined,
        numero: sock?.user?.id || null,
        nombre: sock?.user?.name || null,
        tieneQR: this.qrCodes.has(sessionKey)
      });
    }
    return estados;
  }

  getDisconnectReason(code) {
    const reasons = {
      401: 'Logout',
      408: 'Conexión perdida',
      411: 'Conflicto',
      428: 'Cerrada',
      440: 'Reemplazo',
      500: 'Error servidor',
      515: 'Reintentar',
    };
    return reasons[code] || `Desconocido (${code})`;
  }
}

module.exports = new WhatsAppService();
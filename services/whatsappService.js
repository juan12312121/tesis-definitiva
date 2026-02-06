const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion, 
  Browsers
  // NO importar makeInMemoryStore - no existe en v7
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs'); // ← AGREGADO para operaciones síncronas

class WhatsAppService {
  constructor() {
    this.sessions = new Map();
    this.sessionStartTimes = new Map();
    this.qrCodes = new Map();
    this.messageStore = new Map();
    this.contactCache = new Map();
    this.jidCache = new Map();
    this.stores = new Map();
    this.storeIntervals = new Map(); // ← AGREGADO
  }

  // ========================================
  // MÉTODO AUXILIAR: OBTENER NÚMERO REAL
  // ========================================
  async obtenerNumeroReal(sock, msg, sessionKey) {
    const remoteJid = msg.key.remoteJid;
    const pushName = msg.pushName || 'Desconocido';

    console.log(`\n🔍 OBTENIENDO NÚMERO REAL...`);
    console.log(`   RemoteJid: ${remoteJid}`);
    console.log(`   PushName: ${pushName}`);

    let numeroReal = null;
    let numeroDescifrado = false;

    // CASO 1: JID NORMAL (@s.whatsapp.net)
    if (remoteJid.endsWith('@s.whatsapp.net')) {
      numeroReal = remoteJid.replace(/@s\.whatsapp\.net$/, '');
      numeroDescifrado = true;
      console.log(`   ✅ JID estándar - Número real: ${numeroReal}`);
    }
    // CASO 2: JID CIFRADO (@lid)
    else if (remoteJid.includes('@lid')) {
      console.log(`   🔐 JID CIFRADO (@lid) detectado`);

      // 🔥 DIAGNÓSTICO 1: Verificar store de contactos
      try {
        console.log(`\n   📋 DIAGNÓSTICO 1: Store de contactos`);
        console.log(`   ================================`);
        
        if (sock.store) {
          console.log(`   ✅ sock.store existe`);
          console.log(`   Propiedades del store:`, Object.keys(sock.store));
          
          if (sock.store.contacts) {
            const contactos = Object.keys(sock.store.contacts);
            console.log(`   ✅ store.contacts existe`);
            console.log(`   Total contactos: ${contactos.length}`);
            console.log(`   Contactos (primeros 5):`, contactos.slice(0, 5));
            
            // Buscar este JID específico
            if (sock.store.contacts[remoteJid]) {
              console.log(`   ✅ Contacto encontrado en store:`, sock.store.contacts[remoteJid]);
            } else {
              console.log(`   ❌ Este JID NO está en store.contacts`);
            }
          } else {
            console.log(`   ❌ store.contacts NO existe`);
          }
        } else {
          console.log(`   ❌ sock.store NO existe`);
        }
      } catch (error) {
        console.log(`   ❌ Error verificando store:`, error.message);
      }

      // 🔥 DIAGNÓSTICO 2: Probar múltiples formatos con onWhatsApp
      const formatos = [
        { nombre: 'Original', valor: remoteJid.split('@')[0] },
        { nombre: 'Con +', valor: `+${remoteJid.split('@')[0]}` },
        { nombre: 'Sin 52', valor: remoteJid.split('@')[0].slice(2) },
        { nombre: 'Con 521', valor: `521${remoteJid.split('@')[0].slice(3)}` },
        { nombre: 'Último intento', valor: remoteJid.split('@')[0].replace(/^52/, '521') }
      ];

      console.log(`\n   🔬 DIAGNÓSTICO 2: Probando formatos`);
      console.log(`   ================================`);
      
      for (const formato of formatos) {
        try {
          console.log(`   🧪 Formato "${formato.nombre}": "${formato.valor}"`);
          const [result] = await sock.onWhatsApp(formato.valor);
          
          if (result) {
            console.log(`      exists: ${result.exists}`);
            console.log(`      jid: ${result.jid}`);
            
            if (result.jid && !result.jid.includes('@lid')) {
              numeroReal = result.jid.replace(/@.*$/, '');
              numeroDescifrado = true;
              console.log(`   ✅ ¡DESCIFRADO EXITOSO!`);
              console.log(`   🎯 Número real: ${numeroReal}`);
              console.log(`   🎯 Formato ganador: "${formato.nombre}" (${formato.valor})`);
              break;
            } else {
              console.log(`      ⚠️ Sigue cifrado (@lid)`);
            }
          } else {
            console.log(`      ❌ Sin resultado`);
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`);
        }
      }

      // Si no se pudo descifrar con ningún método
      if (!numeroReal) {
        numeroReal = remoteJid.replace(/@.*$/, '');
        numeroDescifrado = false;
        console.log(`\n   ❌ NO SE PUDO DESCIFRAR CON NINGÚN MÉTODO`);
        console.log(`   📌 Usando JID cifrado como fallback: ${numeroReal}`);
        console.log(`   📌 Nombre del contacto (pushName): ${pushName}`);
      }
    }
    // CASO 3: OTROS FORMATOS (fallback)
    else {
      numeroReal = remoteJid.replace(/@.*$/, '');
      numeroDescifrado = false;
      console.log(`   ⚠️ Formato desconocido - Extrayendo: ${numeroReal}`);
    }

    console.log(`\n📞 RESULTADO FINAL:`);
    console.log(`   JID Original: ${remoteJid}`);
    console.log(`   Número Final: ${numeroReal}`);
    console.log(`   ¿Es número real?: ${numeroDescifrado ? 'SÍ ✅' : 'NO ❌ (cifrado)'}`);
    console.log(`   Nombre (pushName): ${pushName}`);

    return {
      numeroReal,
      nombreContacto: pushName,
      jidOriginal: remoteJid,
      numeroDescifrado
    };
  }

  async iniciarSesion(empresaId, nombreSesion, forzarNuevaConexion = false) {
    const sessionKey = `${empresaId}_${nombreSesion}`;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 INICIANDO SESIÓN`);
    console.log(`   SessionKey: ${sessionKey}`);
    console.log(`   EmpresaId: ${empresaId}`);
    console.log(`   NombreSesion: ${nombreSesion}`);
    console.log(`   Forzar nueva conexión: ${forzarNuevaConexion}`);
    console.log(`   Timestamp: ${new Date().toLocaleString()}`);
    console.log(`${'='.repeat(70)}`);

    try {
      const { InstanciaWhatsapp } = require('../models');

      let instancia = await InstanciaWhatsapp.findOne({
        where: {
          empresa_id: empresaId,
          nombre_sesion: nombreSesion
        }
      });

      if (!instancia) {
        console.log(`📝 Instancia no existe en BD, creándola...`);
        instancia = await InstanciaWhatsapp.create({
          empresa_id: empresaId,
          nombre_sesion: nombreSesion,
          conectado: false,
          codigo_qr: null,
          numero_telefono: null
        });
        console.log(`✅ Instancia creada en BD con ID: ${instancia.id}`);
      } else {
        console.log(`✅ Instancia encontrada en BD con ID: ${instancia.id}`);
      }
    } catch (error) {
      console.error(`❌ Error verificando/creando instancia en BD:`, error);
      return {
        success: false,
        message: `Error en BD: ${error.message}`
      };
    }

    if (!forzarNuevaConexion && this.sessions.has(sessionKey)) {
      const sock = this.sessions.get(sessionKey);
      if (sock && sock.user) {
        console.log(`✅ Sesión ${sessionKey} ya está activa`);
        return {
          success: true,
          message: 'Sesión ya activa',
          conectado: true,
          numero: sock.user.id,
          nombre: sock.user.name
        };
      }
    }

    const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);

    try {
      await fs.mkdir(sessionPath, { recursive: true });
      console.log(`📁 Carpeta de sesión creada: ${sessionPath}`);
    } catch (error) {
      console.error('❌ Error creando carpeta de sesión:', error);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    // 🔥🔥🔥 CREAR STORE MANUAL (Compatible con Baileys 7.x) 🔥🔥🔥
    console.log(`\n💾 Creando store para sincronización de contactos...`);
    
    const store = {
      contacts: {},
      chats: {},
      messages: {},
      
      bind: function(ev) {
        console.log(`🔗 Vinculando eventos al store...`);
        
        // Escuchar actualización de contactos
        ev.on('contacts.update', (contacts) => {
          console.log(`📇 Actualizando ${contacts.length} contacto(s)...`);
          for (const contact of contacts) {
            this.contacts[contact.id] = {
              id: contact.id,
              name: contact.name || contact.notify || contact.verifiedName,
              notify: contact.notify,
              verifiedName: contact.verifiedName
            };
            console.log(`   ✅ Contacto: ${contact.id} → ${contact.name || contact.notify}`);
          }
        });
        
        // Escuchar actualización de chats
        ev.on('chats.update', (chats) => {
          for (const chat of chats) {
            this.chats[chat.id] = chat;
          }
        });
        
        // Escuchar contactos en SET (batch)
        ev.on('contacts.set', ({ contacts }) => {
          console.log(`📇 SET de ${contacts.length} contacto(s)...`);
          for (const contact of contacts) {
            this.contacts[contact.id] = {
              id: contact.id,
              name: contact.name || contact.notify || contact.verifiedName,
              notify: contact.notify,
              verifiedName: contact.verifiedName
            };
          }
          console.log(`   ✅ Total contactos en store: ${Object.keys(this.contacts).length}`);
        });
        
        console.log(`✅ Eventos vinculados correctamente`);
      },
      
      readFromFile: function(filePath) {
        try {
          if (fsSync.existsSync(filePath)) {
            const data = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
            this.contacts = data.contacts || {};
            this.chats = data.chats || {};
            console.log(`✅ Store cargado: ${Object.keys(this.contacts).length} contactos`);
            return true;
          }
        } catch (error) {
          console.log(`ℹ️  Store nuevo (sin archivo previo)`);
        }
        return false;
      },
      
      writeToFile: function(filePath) {
        try {
          const data = {
            contacts: this.contacts,
            chats: this.chats,
            timestamp: new Date().toISOString()
          };
          fsSync.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
          console.error(`⚠️  Error guardando store: ${error.message}`);
        }
      }
    };

    this.stores.set(sessionKey, store);

    // Cargar store previo si existe
    const storeFilePath = path.join(sessionPath, 'store.json');
    store.readFromFile(storeFilePath);

    // Auto-guardar cada 30 segundos
    const saveInterval = setInterval(() => {
      const currentStore = this.stores.get(sessionKey);
      if (currentStore) {
        currentStore.writeToFile(storeFilePath);
      }
    }, 30000);

    this.storeIntervals.set(sessionKey, saveInterval);

    console.log(`✅ Store manual creado para: ${sessionKey}`);

    const getMessage = async (key) => {
      const storeKey = `${key.remoteJid}_${key.id}`;
      const msg = this.messageStore.get(storeKey);
      return msg || { conversation: '' };
    };

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: true,  // ← MANTENER EN TRUE
      markOnlineOnConnect: true,
      getMessage: getMessage,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000,
    });

    // 🔥🔥🔥 CONECTAR EL STORE AL SOCKET 🔥🔥🔥
    console.log(`🔗 Conectando store al socket...`);
    store.bind(sock.ev);
    
    // 🔥🔥🔥 AGREGAR EL STORE AL SOCKET 🔥🔥🔥
    sock.store = store;
    console.log(`✅ Store vinculado exitosamente`);

    this.sessions.set(sessionKey, sock);
    this.sessionStartTimes.set(sessionKey, new Date());

    console.log(`💾 Sesión guardada en memoria: ${sessionKey}`);

    // ========================================
    // EVENT HANDLER: messages.upsert
    // ======================================== 
    sock.ev.on('messages.upsert', async ({ type, messages }) => {
      console.log('\n' + '='.repeat(60));
      console.log(`🔔 EVENTO messages.upsert DISPARADO`);
      console.log(`   Session: ${sessionKey}`);
      console.log(`   EmpresaId: ${empresaId}`);
      console.log(`   Tipo: ${type}`);
      console.log(`   Cantidad: ${messages.length}`);
      console.log('='.repeat(60));

      if (type !== 'notify') {
        console.log(`   ⏭️ Tipo "${type}" ignorado (no es "notify")`);
        return;
      }

      for (const msg of messages) {
        try {
          const storeKey = `${msg.key.remoteJid}_${msg.key.id}`;
          this.messageStore.set(storeKey, msg);

          const fromMe = msg.key.fromMe;
          const remoteJid = msg.key.remoteJid;
          const messageTimestamp = msg.messageTimestamp;
          const messageId = msg.key.id;

          console.log(`\n📩 MENSAJE DETECTADO:`);
          console.log(`   Session: ${sessionKey}`);
          console.log(`   Usuario de esta sesión: ${sock.user?.id}`);
          console.log(`   From: ${remoteJid}`);
          console.log(`   FromMe (flag): ${fromMe}`);
          console.log(`   ID: ${messageId}`);
          console.log(`   Timestamp: ${messageTimestamp}`);
          console.log(`   PushName: ${msg.pushName || 'N/A'}`);

          // ❌ IGNORAR MENSAJES PROPIOS
          if (fromMe) {
            console.log(`   ⏭️ IGNORADO (mensaje propio)`);
            continue;
          }

          // ❌ IGNORAR GRUPOS (@g.us)
          if (remoteJid.includes('@g.us')) {
            console.log(`   ⏭️ IGNORADO (mensaje de GRUPO)`);
            continue;
          }

          // ❌ IGNORAR ESTADOS Y NEWSLETTERS
          if (remoteJid === 'status@broadcast') {
            console.log(`   ⏭️ Ignorado (estado de WhatsApp)`);
            continue;
          }

          if (remoteJid && remoteJid.includes('@newsletter')) {
            console.log(`   ⏭️ Ignorado (newsletter)`);
            continue;
          }

          const sessionStartTime = this.sessionStartTimes.get(sessionKey);
          const messageDate = new Date(messageTimestamp * 1000);

          console.log(`   📅 Fecha mensaje: ${messageDate.toLocaleString()}`);
          console.log(`   📅 Fecha inicio: ${sessionStartTime.toLocaleString()}`);

          if (messageDate < sessionStartTime) {
            console.log(`   ⏭️ Ignorado (mensaje antiguo)`);
            continue;
          }

          if (!msg.message) {
            console.log(`   ⏭️ Ignorado (sin contenido de mensaje)`);
            continue;
          }

          let messageText = '';
          if (msg.message?.conversation) {
            messageText = msg.message.conversation;
          } else if (msg.message?.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text;
          } else if (msg.message?.imageMessage?.caption) {
            messageText = '[Imagen] ' + (msg.message.imageMessage.caption || '');
          } else if (msg.message?.videoMessage?.caption) {
            messageText = '[Video] ' + (msg.message.videoMessage.caption || '');
          } else if (msg.message?.imageMessage) {
            messageText = '[Imagen sin caption]';
          } else if (msg.message?.videoMessage) {
            messageText = '[Video sin caption]';
          } else if (msg.message?.audioMessage) {
            messageText = '[Audio]';
          } else if (msg.message?.documentMessage) {
            messageText = '[Documento]';
          } else if (msg.message?.stickerMessage) {
            messageText = '[Sticker]';
          } else {
            messageText = '[Mensaje multimedia]';
          }

          console.log(`   💬 Texto: "${messageText}"`);

          // OBTENER NÚMERO REAL Y NOMBRE (PUSHNAME)
          const infoContacto = await this.obtenerNumeroReal(sock, msg, sessionKey);

          // Guardar en cache con el pushName
          const cacheKey = `${sessionKey}_${infoContacto.jidOriginal}`;
          this.contactCache.set(cacheKey, {
            numero: infoContacto.numeroReal,
            nombre: infoContacto.nombreContacto,
            jidOriginal: infoContacto.jidOriginal,
            numeroDescifrado: infoContacto.numeroDescifrado,
            timestamp: Date.now()
          });

          // Cache inverso (número → JID)
          const jidCacheKey = `${sessionKey}_${infoContacto.numeroReal}`;
          this.jidCache.set(jidCacheKey, infoContacto.jidOriginal);

          console.log(`💾 Guardado en cache:`);
          console.log(`   Número: ${infoContacto.numeroReal}`);
          console.log(`   Nombre: ${infoContacto.nombreContacto}`);
          console.log(`   JID: ${infoContacto.jidOriginal}`);

          console.log(`\n🚀 ENVIANDO A N8N...`);
          await this.enviarAWebhook({
            empresaId,
            nombreSesion,
            numeroOrigen: infoContacto.numeroReal,
            mensaje: messageText,
            messageId: messageId,
            timestamp: messageDate.toISOString(),
            sessionKey: sessionKey,
            jidOriginal: infoContacto.jidOriginal,
            pushName: infoContacto.nombreContacto,
            numeroDescifrado: infoContacto.numeroDescifrado
          });

        } catch (error) {
          console.error(`❌ Error procesando mensaje:`, error);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`\n${'*'.repeat(70)}`);
        console.log(`📱 QR GENERADO`);
        console.log(`   SessionKey: ${sessionKey}`);
        console.log(`   Timestamp: ${new Date().toLocaleString()}`);
        console.log(`${'*'.repeat(70)}`);

        const qrDataUrl = await QRCode.toDataURL(qr);
        this.qrCodes.set(sessionKey, qrDataUrl);
        sock.qr = qrDataUrl;
        console.log(`✅ QR almacenado en memoria (${qrDataUrl.length} caracteres)`);

        console.log(`\n💾 Guardando QR en base de datos...`);
        try {
          const { InstanciaWhatsapp } = require('../models');
          console.log(`   Actualizando InstanciaWhatsapp para empresa_id=${empresaId}, nombre_sesion=${nombreSesion}`);

          const [instancia, created] = await InstanciaWhatsapp.upsert(
            {
              empresa_id: empresaId,
              nombre_sesion: nombreSesion,
              codigo_qr: qrDataUrl,
              conectado: false
            },
            {
              returning: true
            }
          );

          console.log(`   Operación: ${created ? 'CREATED' : 'UPDATED'}`);
          console.log(`💾 ✅ QR guardado exitosamente en BD`);
          console.log(`   Empresa: ${empresaId}`);
          console.log(`   Longitud QR: ${qrDataUrl.length} caracteres`);

          const verificacion = await InstanciaWhatsapp.findOne({
            where: { empresa_id: empresaId, nombre_sesion: nombreSesion }
          });
          console.log(`   Verificación - QR en BD: ${verificacion?.codigo_qr ? 'PRESENTE' : 'AUSENTE'}`);

        } catch (dbError) {
          console.error(`❌ Error guardando QR en BD:`);
          console.error(`   Error: ${dbError.message}`);
          console.error(`   Stack: ${dbError.stack}`);
        }
        console.log(`${'*'.repeat(70)}\n`);
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`\n❌ CONEXIÓN CERRADA`);
        console.log(`   Status Code: ${statusCode}`);
        console.log(`   Razón: ${isLoggedOut ? 'Logout manual' : 'Desconexión inesperada'}`);
        console.log(`   ¿Reintentar?: ${shouldReconnect}`);

        // Limpiar interval de auto-guardado
        if (this.storeIntervals.has(sessionKey)) {
          clearInterval(this.storeIntervals.get(sessionKey));
          this.storeIntervals.delete(sessionKey);
        }

        try {
          const { InstanciaWhatsapp } = require('../models');
          await InstanciaWhatsapp.upsert({
            empresa_id: empresaId,
            nombre_sesion: nombreSesion,
            conectado: false,
            numero_telefono: null
          });
          console.log(`💾 Estado de desconexión guardado en BD`);
        } catch (dbError) {
          console.error(`⚠️ Error actualizando BD:`, dbError.message);
        }

        if (shouldReconnect) {
          console.log(`\n🔄 RECONEXIÓN AUTOMÁTICA ACTIVADA`);
          console.log(`   📱 Se generará un nuevo QR en 5 segundos...`);

          setTimeout(async () => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`⚡ EJECUTANDO RECONEXIÓN AUTOMÁTICA`);
            console.log(`   SessionKey: ${sessionKey}`);
            console.log(`${'='.repeat(70)}`);

            console.log(`🧹 Limpiando sesión anterior de memoria...`);
            this.sessions.delete(sessionKey);
            this.sessionStartTimes.delete(sessionKey);
            this.qrCodes.delete(sessionKey);
            this.stores.delete(sessionKey);
            console.log(`   ✅ Memoria limpiada`);

            try {
              console.log(`\n📱 Llamando a iniciarSesion() con forzarNuevaConexion=true...`);
              const resultado = await this.iniciarSesion(empresaId, nombreSesion, true);
              console.log(`✅ iniciarSesion() completado`);
              console.log(`   Resultado:`, resultado);
            } catch (error) {
              console.error(`\n❌ ERROR EN RECONEXIÓN AUTOMÁTICA`);
              console.error(`   Error: ${error.message}`);
            }
          }, 5000);
        } else {
          console.log(`🔒 Sesión desconectada (logout manual)`);
          console.log(`🗑️ Limpiando sesión completamente...`);
          this.sessions.delete(sessionKey);
          this.sessionStartTimes.delete(sessionKey);
          this.qrCodes.delete(sessionKey);
          this.stores.delete(sessionKey);

          try {
            const { InstanciaWhatsapp } = require('../models');
            await InstanciaWhatsapp.update(
              {
                conectado: false,
                codigo_qr: null,
                numero_telefono: null
              },
              {
                where: {
                  empresa_id: empresaId,
                  nombre_sesion: nombreSesion
                }
              }
            );
            console.log(`💾 BD limpiada - sesión eliminada completamente`);
          } catch (dbError) {
            console.error(`⚠️ Error actualizando BD:`, dbError.message);
          }

          try {
            const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);
            await fs.rm(sessionPath, { recursive: true, force: true });
            console.log(`🗑️ Archivos de sesión eliminados del disco`);
          } catch (error) {
            console.error(`⚠️ Error eliminando archivos:`, error.message);
          }
        }
      }

      if (connection === 'open') {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ WHATSAPP CONECTADO CORRECTAMENTE`);
        console.log(`   Session: ${sessionKey}`);
        console.log(`   Usuario: ${sock.user?.id}`);
        console.log(`   Nombre: ${sock.user?.name}`);
        console.log(`   Fecha: ${new Date().toLocaleString()}`);
        console.log(`${'='.repeat(60)}\n`);

        this.sessionStartTimes.set(sessionKey, new Date());
        this.qrCodes.delete(sessionKey);

        try {
          const { InstanciaWhatsapp } = require('../models');
          await InstanciaWhatsapp.upsert({
            empresa_id: empresaId,
            nombre_sesion: nombreSesion,
            conectado: true,
            ultima_conexion: new Date(),
            codigo_qr: null,
            numero_telefono: sock.user?.id || null
          });
          console.log(`💾 Estado de conexión guardado en BD para empresa ${empresaId}`);
          console.log(`📱 Número registrado: ${sock.user?.id}`);
        } catch (dbError) {
          console.error(`⚠️ Error actualizando BD:`, dbError.message);
        }

        try {
          await sock.sendPresenceUpdate('unavailable');
          console.log(`📵 Cliente marcado como "unavailable" - recibirá mensajes en tiempo real`);
        } catch (error) {
          console.error(`⚠️ Error marcando presencia:`, error.message);
        }
      }
    });

    return {
      success: true,
      qr: sock.qr,
      message: 'Sesión iniciada - esperando conexión'
    };
  }

  async enviarAWebhook(datos) {
    const webhookUrl = 'http://localhost:5678/webhook/whatsapp-mensaje';

    const payload = {
      empresaId: datos.empresaId,
      nombreSesion: datos.nombreSesion,
      numeroOrigen: datos.numeroOrigen,
      mensaje: datos.mensaje,
      messageId: datos.messageId,
      timestamp: datos.timestamp,
      sessionKey: datos.sessionKey,
      jidOriginal: datos.jidOriginal,
      pushName: datos.pushName,
      numeroDescifrado: datos.numeroDescifrado
    };

  console.log(`📍 URL: ${webhookUrl}`);
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const data = await response.text();
      console.log(`✅ N8N respondió correctamente`);
      console.log(`📥 Respuesta:`, data);
    } else {
      console.log(`⚠️ N8N status: ${response.status}`);
      const errorText = await response.text();
      console.log(`📥 Error:`, errorText);
    }
  } catch (error) {
    console.error(`❌ Error enviando a N8N:`, error.message);
  }
}
async verificarEstado(empresaId, nombreSesion) {
const sessionKey = `${empresaId}_${nombreSesion}`;
const sock = this.sessions.get(sessionKey);
if (!sock || !sock.user) {
  const qr = this.qrCodes.get(sessionKey);
  if (qr) {
    return {
      conectado: false,
      qr: qr,
      mensaje: 'Esperando escaneo de QR',
      existe: true
    };
  }
  return {
    conectado: false,
    mensaje: 'Sesión no iniciada',
    existe: false
  };
}

return {
  conectado: true,
  numero: sock.user.id,
  nombre: sock.user.name,
  existe: true
};
}
obtenerQR(empresaId, nombreSesion) {
const sessionKey = `${empresaId}_${nombreSesion}`;
const qr = this.qrCodes.get(sessionKey);
if (qr) {
  return { success: true, qr };
}

return {
  success: false,
  message: 'QR no disponible - sesión ya conectada o no iniciada'
};
}

async enviarMensaje(empresaId, nombreSesion, numeroDestino, mensaje) {
  const sessionKey = `${empresaId}_${nombreSesion}`;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📤 ENVIANDO MENSAJE`);
  console.log(`   SessionKey: ${sessionKey}`);
  console.log(`   NumeroDestino: ${numeroDestino}`);
  console.log(`   Mensaje: ${mensaje?.substring(0, 100)}`);
  console.log(`${'='.repeat(60)}`);

  const sock = this.sessions.get(sessionKey);

  if (!sock || !sock.user) {
    console.log(`❌ Sesión no encontrada o no conectada`);
    throw new Error('Sesión no conectada');
  }

  console.log(`✅ Sesión encontrada - Usuario: ${sock.user.id}`);

  let jidFinal = null;

  // PRIORIDAD 1: Buscar JID en cache (el más confiable)
  const jidCacheKey = `${sessionKey}_${numeroDestino}`;
  if (this.jidCache.has(jidCacheKey)) {
    jidFinal = this.jidCache.get(jidCacheKey);
    console.log(`✅ JID encontrado en jidCache: ${jidFinal}`);
  }

  // PRIORIDAD 2: Buscar en contactCache
  if (!jidFinal) {
    for (const [key, value] of this.contactCache.entries()) {
      if (value.numero === numeroDestino && key.startsWith(sessionKey)) {
        jidFinal = value.jidOriginal;
        console.log(`✅ JID encontrado en contactCache: ${jidFinal}`);
        break;
      }
    }
  }

  // PRIORIDAD 3: Si ya viene con @, usarlo directamente
  if (!jidFinal && numeroDestino.includes('@')) {
    jidFinal = numeroDestino;
    console.log(`✅ JID completo recibido: ${jidFinal}`);
  }

  // FALLBACK: Formato estándar @s.whatsapp.net
  if (!jidFinal) {
    jidFinal = `${numeroDestino}@s.whatsapp.net`;
    console.log(`⚠️ JID no encontrado en cache, usando estándar: ${jidFinal}`);
  }

  console.log(`\n📱 JID FINAL PARA ENVÍO: ${jidFinal}`);

  // 🔥 FUNCIÓN CON TIMEOUT
  const enviarConTimeout = (jid, contenido, timeout = 10000) => {
    return Promise.race([
      sock.sendMessage(jid, contenido),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout enviando mensaje')), timeout)
      )
    ]);
  };

  try {
    await enviarConTimeout(jidFinal, { text: mensaje }, 10000); // 10 segundos timeout
    console.log(`✅ Mensaje enviado correctamente`);
    console.log(`${'='.repeat(60)}\n`);
    return { success: true, message: 'Mensaje enviado' };
  } catch (error) {
    console.error(`❌ Error al enviar mensaje:`, error.message);

    if (jidFinal.includes('@lid')) {
      console.log(`\n⚠️ Fallo con JID cifrado, intentando con formato estándar...`);
      const jidEstandar = `${numeroDestino.replace(/@.*$/, '')}@s.whatsapp.net`;

      try {
        await enviarConTimeout(jidEstandar, { text: mensaje }, 10000);
        console.log(`✅ Mensaje enviado con JID estándar: ${jidEstandar}`);
        console.log(`${'='.repeat(60)}\n`);
        return { success: true, message: 'Mensaje enviado (fallback)' };
      } catch (fallbackError) {
        console.error(`❌ Fallback también falló:`, fallbackError.message);
        throw new Error(`No se pudo enviar el mensaje: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Error al enviar mensaje: ${error.message}`);
    }
  }
}

// 🔥 TAMBIÉN ACTUALIZA enviarImagen con el mismo patrón
async enviarImagen(empresaId, nombreSesion, numeroDestino, imagenUrl, caption) {
  const sessionKey = `${empresaId}_${nombreSesion}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📸 ENVIANDO IMAGEN`);
  console.log(`   SessionKey: ${sessionKey}`);
  console.log(`   NumeroDestino: ${numeroDestino}`);
  console.log(`   ImagenUrl: ${imagenUrl}`);
  console.log(`   Caption: ${caption?.substring(0, 100)}`);
  console.log(`${'='.repeat(60)}`);

  const sock = this.sessions.get(sessionKey);

  if (!sock || !sock.user) {
    console.log(`❌ Sesión no encontrada o no conectada`);
    throw new Error('Sesión no conectada');
  }

  console.log(`✅ Sesión encontrada - Usuario: ${sock.user.id}`);

  let jidFinal = null;

  const jidCacheKey = `${sessionKey}_${numeroDestino}`;
  if (this.jidCache.has(jidCacheKey)) {
    jidFinal = this.jidCache.get(jidCacheKey);
    console.log(`✅ JID encontrado en jidCache: ${jidFinal}`);
  }

  if (!jidFinal) {
    for (const [key, value] of this.contactCache.entries()) {
      if (value.numero === numeroDestino && key.startsWith(sessionKey)) {
        jidFinal = value.jidOriginal;
        console.log(`✅ JID encontrado en contactCache: ${jidFinal}`);
        break;
      }
    }
  }

  if (!jidFinal && numeroDestino.includes('@')) {
    jidFinal = numeroDestino;
    console.log(`✅ JID completo recibido: ${jidFinal}`);
  }

  if (!jidFinal) {
    jidFinal = `${numeroDestino}@s.whatsapp.net`;
    console.log(`⚠️ JID no encontrado en cache, usando estándar: ${jidFinal}`);
  }

  console.log(`\n📱 JID FINAL PARA ENVÍO: ${jidFinal}`);

  // 🔥 FUNCIÓN CON TIMEOUT
  const enviarConTimeout = (jid, contenido, timeout = 10000) => {
    return Promise.race([
      sock.sendMessage(jid, contenido),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout enviando imagen')), timeout)
      )
    ]);
  };

  try {
    await enviarConTimeout(jidFinal, {
      image: { url: imagenUrl },
      caption: caption
    }, 10000);
    
    console.log(`✅ Imagen enviada correctamente`);
    console.log(`${'='.repeat(60)}\n`);
    return { success: true, message: 'Imagen enviada' };
  } catch (error) {
    console.error(`❌ Error al enviar imagen:`, error.message);

    if (jidFinal.includes('@lid')) {
      console.log(`\n⚠️ Fallo con JID cifrado, intentando con formato estándar...`);
      const jidEstandar = `${numeroDestino.replace(/@.*$/, '')}@s.whatsapp.net`;

      try {
        await enviarConTimeout(jidEstandar, {
          image: { url: imagenUrl },
          caption: caption
        }, 10000);
        console.log(`✅ Imagen enviada con JID estándar: ${jidEstandar}`);
        console.log(`${'='.repeat(60)}\n`);
        return { success: true, message: 'Imagen enviada (fallback)' };
      } catch (fallbackError) {
        console.error(`❌ Fallback también falló:`, fallbackError.message);
        throw new Error(`No se pudo enviar la imagen: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Error al enviar imagen: ${error.message}`);
    }
  }
}


async cerrarSesion(empresaId, nombreSesion) {
const sessionKey = `${empresaId}_${nombreSesion}`;
const sock = this.sessions.get(sessionKey);
if (sock) {
  await sock.logout();
  console.log(`🔒 Logout ejecutado para ${sessionKey}`);
}

// Limpiar interval de auto-guardado
if (this.storeIntervals.has(sessionKey)) {
  clearInterval(this.storeIntervals.get(sessionKey));
  this.storeIntervals.delete(sessionKey);
  console.log(`⏱️ Interval de guardado detenido`);
}

this.sessions.delete(sessionKey);
this.sessionStartTimes.delete(sessionKey);
this.qrCodes.delete(sessionKey);
this.stores.delete(sessionKey);

for (const key of this.contactCache.keys()) {
  if (key.startsWith(sessionKey)) {
    this.contactCache.delete(key);
  }
}

for (const key of this.jidCache.keys()) {
  if (key.startsWith(sessionKey)) {
    this.jidCache.delete(key);
  }
}

try {
  const { InstanciaWhatsapp } = require('../models');
  await InstanciaWhatsapp.update(
    {
      conectado: false,
      codigo_qr: null,
      numero_telefono: null
    },
    {
      where: {
        empresa_id: empresaId,
        nombre_sesion: nombreSesion
      }
    }
  );
  console.log(`💾 BD actualizada - sesión cerrada`);
} catch (dbError) {
  console.error(`⚠️ Error actualizando BD:`, dbError.message);
}

try {
  const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);
  await fs.rm(sessionPath, { recursive: true, force: true });
  console.log(`🗑️ Archivos de sesión eliminados`);
} catch (error) {
  console.error(`⚠️ Error eliminando archivos:`, error.message);
}

return { success: true, message: 'Sesión cerrada completamente' };
}
async cargarSesionesGuardadas() {
try {
const sessionsDir = path.join(__dirname, '../whatsapp-sessions');
console.log(`📂 Buscando sesiones en: ${sessionsDir}`);
try {
await fs.access(sessionsDir);
} catch {
console.log(`ℹ️  No hay carpeta de sesiones - se creará al iniciar sesión`);
return { success: true, message: 'No hay sesiones previas' };
}
  const files = await fs.readdir(sessionsDir);
  const sessionFolders = files.filter(f => f.startsWith('session_'));

  if (sessionFolders.length === 0) {
    console.log(`ℹ️  No hay sesiones guardadas`);
    return { success: true, message: 'No hay sesiones previas' };
  }

  console.log(`✅ Encontradas ${sessionFolders.length} sesión(es) guardada(s)`);
  console.log(`   ${sessionFolders.join(', ')}`);
  console.log(`ℹ️  Se reconectarán automáticamente al llamar iniciarSesion()`);

  return {
    success: true,
    sesiones: sessionFolders,
    message: `${sessionFolders.length} sesión(es) disponibles para reconexión`
  };
} catch (error) {
  console.error(`❌ Error al cargar sesiones:`, error);
  return { success: false, error: error.message };
}
}
obtenerClienteActivo(empresaId, nombreSesion) {
const sessionKey = `${empresaId}_${nombreSesion}`;
const sock = this.sessions.get(sessionKey);
if (!sock || !sock.user) {
return null;
}
return sock;
}
obtenerEstadoSesion(empresaId, nombreSesion) {
const sessionKey = `${empresaId}_${nombreSesion}`;
const sock = this.sessions.get(sessionKey);
const qr = this.qrCodes.get(sessionKey);
return {
existe: this.sessions.has(sessionKey),
conectado: sock && sock.user ? true : false,
tieneQR: !!qr,
usuario: sock?.user || null
};
}



async enviarImagen(empresaId, nombreSesion, numeroDestino, imagenUrl, caption) {
  const sessionKey = `${empresaId}_${nombreSesion}`;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📸 ENVIANDO IMAGEN`);
  console.log(`   SessionKey: ${sessionKey}`);
  console.log(`   NumeroDestino: ${numeroDestino}`);
  console.log(`   ImagenUrl: ${imagenUrl}`);
  console.log(`   Caption: ${caption?.substring(0, 100)}`);
  console.log(`${'='.repeat(60)}`);

  const sock = this.sessions.get(sessionKey);

  if (!sock || !sock.user) {
    console.log(`❌ Sesión no encontrada o no conectada`);
    throw new Error('Sesión no conectada');
  }

  console.log(`✅ Sesión encontrada - Usuario: ${sock.user.id}`);

  let jidFinal = null;

  // PRIORIDAD 1: Buscar JID en cache
  const jidCacheKey = `${sessionKey}_${numeroDestino}`;
  if (this.jidCache.has(jidCacheKey)) {
    jidFinal = this.jidCache.get(jidCacheKey);
    console.log(`✅ JID encontrado en jidCache: ${jidFinal}`);
  }

  // PRIORIDAD 2: Buscar en contactCache
  if (!jidFinal) {
    for (const [key, value] of this.contactCache.entries()) {
      if (value.numero === numeroDestino && key.startsWith(sessionKey)) {
        jidFinal = value.jidOriginal;
        console.log(`✅ JID encontrado en contactCache: ${jidFinal}`);
        break;
      }
    }
  }

  // PRIORIDAD 3: Si ya viene con @, usarlo directamente
  if (!jidFinal && numeroDestino.includes('@')) {
    jidFinal = numeroDestino;
    console.log(`✅ JID completo recibido: ${jidFinal}`);
  }

  // FALLBACK: Formato estándar
  if (!jidFinal) {
    jidFinal = `${numeroDestino}@s.whatsapp.net`;
    console.log(`⚠️ JID no encontrado en cache, usando estándar: ${jidFinal}`);
  }

  console.log(`\n📱 JID FINAL PARA ENVÍO: ${jidFinal}`);

  try {
    await sock.sendMessage(jidFinal, {
      image: { url: imagenUrl },
      caption: caption
    });
    
    console.log(`✅ Imagen enviada correctamente`);
    console.log(`${'='.repeat(60)}\n`);
    return { success: true, message: 'Imagen enviada' };
  } catch (error) {
    console.error(`❌ Error al enviar imagen:`, error.message);

    if (jidFinal.includes('@lid')) {
      console.log(`\n⚠️ Fallo con JID cifrado, intentando con formato estándar...`);
      const jidEstandar = `${numeroDestino.replace(/@.*$/, '')}@s.whatsapp.net`;

      try {
        await sock.sendMessage(jidEstandar, {
          image: { url: imagenUrl },
          caption: caption
        });
        console.log(`✅ Imagen enviada con JID estándar: ${jidEstandar}`);
        console.log(`${'='.repeat(60)}\n`);
        return { success: true, message: 'Imagen enviada (fallback)' };
      } catch (fallbackError) {
        console.error(`❌ Fallback también falló:`, fallbackError.message);
        throw new Error(`No se pudo enviar la imagen: ${fallbackError.message}`);
      }
    } else {
      throw new Error(`Error al enviar imagen: ${error.message}`);
    }
  }
}

}

module.exports = new WhatsAppService();
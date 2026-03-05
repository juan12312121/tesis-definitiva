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
const fsSync = require('fs'); // para operaciones sincronas

class WhatsAppService {
  constructor() {
    this.sessions = new Map();
    this.sessionStartTimes = new Map();
    this.qrCodes = new Map();
    this.messageStore = new Map();
    this.contactCache = new Map();
    this.jidCache = new Map();
    this.stores = new Map();
    this.storeIntervals = new Map();
  }

  // ========================================
  // METODO AUXILIAR: OBTENER NUMERO REAL
  // ========================================
  async obtenerNumeroReal(sock, msg, sessionKey) {
    const remoteJid = msg.key.remoteJid;
    const pushName = msg.pushName || 'Desconocido';

    console.log(`\n[WHATSAPP] OBTENIENDO NUMERO REAL...`);
    console.log(`   RemoteJid: ${remoteJid}`);
    console.log(`   PushName: ${pushName}`);

    let numeroReal = null;
    let numeroDescifrado = false;

    // CASO 1: JID NORMAL (@s.whatsapp.net)
    if (remoteJid.endsWith('@s.whatsapp.net')) {
      numeroReal = remoteJid.replace(/@s\.whatsapp\.net$/, '');
      numeroDescifrado = true;
      console.log(`   [WHATSAPP] JID estandar - Numero real: ${numeroReal}`);
      return {
        numeroReal,
        nombreContacto: pushName,
        jidOriginal: remoteJid,
        numeroDescifrado
      };
    }

    // CASO 2: JID CIFRADO (@lid)
    if (remoteJid.includes('@lid')) {
      console.log(`   [WHATSAPP] JID CIFRADO (@lid) detectado`);

      const numeroCifrado = remoteJid.split('@')[0];

      // METODO 1: Intentar obtener el numero del perfil del usuario
      try {
        console.log(`   [WHATSAPP] Intentando obtener perfil del usuario...`);

        // Esperar un poco para asegurar que el contacto este sincronizado
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificar si existe en onWhatsApp (a veces devuelve el numero real en user)
        const result = await sock.onWhatsApp(remoteJid);

        if (result && result.length > 0) {
          console.log(`   [WHATSAPP] Resultado onWhatsApp:`, result[0]);

          // Algunos casos el numero real viene en result[0].jid
          if (result[0].jid && !result[0].jid.includes('@lid')) {
            numeroReal = result[0].jid.replace(/@.*$/, '');
            numeroDescifrado = true;
            console.log(`   [WHATSAPP] Numero real encontrado en onWhatsApp: ${numeroReal}`);

            this.jidCache.set(`${sessionKey}_${numeroReal}`, remoteJid);

            return {
              numeroReal,
              nombreContacto: pushName,
              jidOriginal: remoteJid,
              numeroDescifrado
            };
          }

          // Intentar con el user si existe
          if (result[0].user && !result[0].user.includes('@lid')) {
            numeroReal = result[0].user;
            numeroDescifrado = true;
            console.log(`   [WHATSAPP] Numero real encontrado en user: ${numeroReal}`);

            this.jidCache.set(`${sessionKey}_${numeroReal}`, remoteJid);

            return {
              numeroReal,
              nombreContacto: pushName,
              jidOriginal: remoteJid,
              numeroDescifrado
            };
          }
        }
      } catch (error) {
        console.log(`   [WHATSAPP] Error en onWhatsApp:`, error.message);
      }

      // METODO 2: Consultar el store de contactos (mas completo)
      try {
        if (sock.store?.contacts?.[remoteJid]) {
          const contacto = sock.store.contacts[remoteJid];
          console.log(`   [WHATSAPP] Contacto en store:`, contacto);

          // Buscar numero en diferentes propiedades del contacto
          if (contacto.number) {
            numeroReal = contacto.number;
            numeroDescifrado = true;
            console.log(`   [WHATSAPP] Numero encontrado en contacto.number: ${numeroReal}`);

            this.jidCache.set(`${sessionKey}_${numeroReal}`, remoteJid);

            return {
              numeroReal,
              nombreContacto: contacto.notify || contacto.name || pushName,
              jidOriginal: remoteJid,
              numeroDescifrado
            };
          }

          // Intentar extraer del vcard si existe
          if (contacto.vcard) {
            const vcardMatch = contacto.vcard.match(/TEL[^:]*:([+\d]+)/);
            if (vcardMatch && vcardMatch[1]) {
              numeroReal = vcardMatch[1].replace(/\D/g, '');
              numeroDescifrado = true;
              console.log(`   [WHATSAPP] Numero extraido de vCard: ${numeroReal}`);

              this.jidCache.set(`${sessionKey}_${numeroReal}`, remoteJid);

              return {
                numeroReal,
                nombreContacto: contacto.notify || contacto.name || pushName,
                jidOriginal: remoteJid,
                numeroDescifrado
              };
            }
          }
        }
      } catch (error) {
        console.log(`   [WHATSAPP] Error consultando store:`, error.message);
      }

      // METODO 3: Intentar multiples formatos con onWhatsApp
      const formatos = [
        numeroCifrado,
        numeroCifrado.replace(/^52/, ''),
        `521${numeroCifrado.slice(2)}`,
        `52${numeroCifrado}`,
      ];

      for (const formato of formatos) {
        try {
          console.log(`   [WHATSAPP] Probando formato: "${formato}"`);
          const [result] = await sock.onWhatsApp(formato);

          if (result?.exists && result?.jid && !result.jid.includes('@lid')) {
            numeroReal = result.jid.replace(/@.*$/, '');
            numeroDescifrado = true;
            console.log(`   [WHATSAPP] DESCIFRADO con formato: "${formato}" -> ${numeroReal}`);

            this.jidCache.set(`${sessionKey}_${numeroReal}`, remoteJid);

            return {
              numeroReal,
              nombreContacto: pushName,
              jidOriginal: remoteJid,
              numeroDescifrado
            };
          }
        } catch (error) {
          console.log(`      [WHATSAPP] Error con formato "${formato}": ${error.message}`);
        }
      }

      // FALLBACK: No se pudo descifrar
      console.log(`\n   [WHATSAPP] NO SE PUDO DESCIFRAR - Usando JID cifrado con pushName`);
      numeroReal = numeroCifrado;
      numeroDescifrado = false;

      return {
        numeroReal,
        nombreContacto: pushName,
        jidOriginal: remoteJid,
        numeroDescifrado
      };
    }

    // CASO 3: OTROS FORMATOS
    numeroReal = remoteJid.replace(/@.*$/, '');
    return {
      numeroReal,
      nombreContacto: pushName,
      jidOriginal: remoteJid,
      numeroDescifrado: false
    };
  }

  // Despliegue de conector basico local hacia servidores de chat interactivo 
  async iniciarSesion(empresaId, nombreSesion, forzarNuevaConexion = false) {
    const sessionKey = `${empresaId}_${nombreSesion}`;

    console.log(`\n${'='.repeat(70)}`);
    console.log(`[WHATSAPP] INICIANDO SESION`);
    console.log(`   SessionKey: ${sessionKey}`);
    console.log(`   EmpresaId: ${empresaId}`);
    console.log(`   NombreSesion: ${nombreSesion}`);
    console.log(`   Forzar nueva conexion: ${forzarNuevaConexion}`);
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
        console.log(`[WHATSAPP] Instancia no existe en BD, creandola...`);
        instancia = await InstanciaWhatsapp.create({
          empresa_id: empresaId,
          nombre_sesion: nombreSesion,
          conectado: false,
          codigo_qr: null,
          numero_telefono: null
        });
        console.log(`[WHATSAPP] Instancia creada en BD con ID: ${instancia.id}`);
      } else {
        console.log(`[WHATSAPP] Instancia encontrada en BD con ID: ${instancia.id}`);
      }
    } catch (error) {
      console.error(`[WHATSAPP] Error verificando/creando instancia en BD:`, error);
      return {
        success: false,
        message: `Error en BD: ${error.message}`
      };
    }

    // Proteger sesion en ejecucion para no suplantar
    if (!forzarNuevaConexion && this.sessions.has(sessionKey)) {
      const sock = this.sessions.get(sessionKey);
      if (sock && sock.user) {
        console.log(`[WHATSAPP] Sesion ${sessionKey} ya esta activa`);
        return {
          success: true,
          message: 'Sesion ya activa',
          conectado: true,
          numero: sock.user.id,
          nombre: sock.user.name
        };
      }
    }

    const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);

    try {
      await fs.mkdir(sessionPath, { recursive: true });
      console.log(`[WHATSAPP] Carpeta de sesion creada: ${sessionPath}`);
    } catch (error) {
      console.error('[WHATSAPP] Error creando carpeta de sesion:', error);
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    // CREAR STORE MANUAL (Compatible con Baileys 7.x)
    console.log(`\n[WHATSAPP] Creando store para sincronizacion de contactos...`);

    // Objeto store configurado para retener en cache el contexto de mensajeria
    const store = {
      contacts: {},
      chats: {},
      messages: {},

      bind: function (ev) {
        console.log(`[WHATSAPP] Vinculando eventos al store...`);

        // Escuchar actualizacion de contactos
        ev.on('contacts.update', (contacts) => {
          console.log(`[WHATSAPP] Actualizando ${contacts.length} contacto(s)...`);
          for (const contact of contacts) {
            this.contacts[contact.id] = {
              id: contact.id,
              name: contact.name || contact.notify || contact.verifiedName,
              notify: contact.notify,
              verifiedName: contact.verifiedName
            };
            console.log(`   [WHATSAPP] Contacto: ${contact.id} -> ${contact.name || contact.notify}`);
          }
        });

        // Escuchar actualizacion de chats
        ev.on('chats.update', (chats) => {
          for (const chat of chats) {
            this.chats[chat.id] = chat;
          }
        });

        // Escuchar contactos en SET (batch)
        ev.on('contacts.set', ({ contacts }) => {
          console.log(`[WHATSAPP] SET de ${contacts.length} contacto(s)...`);
          for (const contact of contacts) {
            this.contacts[contact.id] = {
              id: contact.id,
              name: contact.name || contact.notify || contact.verifiedName,
              notify: contact.notify,
              verifiedName: contact.verifiedName
            };
          }
          console.log(`   [WHATSAPP] Total contactos en store: ${Object.keys(this.contacts).length}`);
        });

        console.log(`[WHATSAPP] Eventos vinculados correctamente`);
      },

      readFromFile: function (filePath) {
        try {
          if (fsSync.existsSync(filePath)) {
            const data = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
            this.contacts = data.contacts || {};
            this.chats = data.chats || {};
            console.log(`[WHATSAPP] Store cargado: ${Object.keys(this.contacts).length} contactos`);
            return true;
          }
        } catch (error) {
          console.log(`[WHATSAPP] Store nuevo (sin archivo previo)`);
        }
        return false;
      },

      writeToFile: function (filePath) {
        try {
          const data = {
            contacts: this.contacts,
            chats: this.chats,
            timestamp: new Date().toISOString()
          };
          fsSync.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (error) {
          console.error(`[WHATSAPP] Error guardando store: ${error.message}`);
        }
      }
    };

    this.stores.set(sessionKey, store);

    // Cargar store previo si existe
    const storeFilePath = path.join(sessionPath, 'store.json');
    store.readFromFile(storeFilePath);

    // Auto-guardar frecuentemente
    const saveInterval = setInterval(() => {
      const currentStore = this.stores.get(sessionKey);
      if (currentStore) {
        currentStore.writeToFile(storeFilePath);
      }
    }, 30000);

    this.storeIntervals.set(sessionKey, saveInterval);

    console.log(`[WHATSAPP] Store manual creado para: ${sessionKey}`);

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
      syncFullHistory: true,
      markOnlineOnConnect: true,
      getMessage: getMessage,
      defaultQueryTimeoutMs: undefined,
      keepAliveIntervalMs: 30000,
    });

    // CONECTAR EL STORE AL SOCKET
    console.log(`[WHATSAPP] Conectando store al socket...`);
    store.bind(sock.ev);

    // AGREGAR EL STORE AL SOCKET
    sock.store = store;
    console.log(`[WHATSAPP] Store vinculado exitosamente`);

    this.sessions.set(sessionKey, sock);
    this.sessionStartTimes.set(sessionKey, new Date());

    console.log(`[WHATSAPP] Sesion guardada en memoria: ${sessionKey}`);

    // ========================================
    // EVENT HANDLER: messages.upsert
    // ======================================== 
    sock.ev.on('messages.upsert', async ({ type, messages }) => {
      console.log('\n' + '='.repeat(60));
      console.log(`[WHATSAPP] EVENTO messages.upsert DISPARADO`);
      console.log(`   Session: ${sessionKey}`);
      console.log(`   EmpresaId: ${empresaId}`);
      console.log(`   Tipo: ${type}`);
      console.log(`   Cantidad: ${messages.length}`);
      console.log('='.repeat(60));

      if (type !== 'notify') {
        console.log(`   [WHATSAPP] Tipo "${type}" ignorado (no es "notify")`);
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

          console.log(`\n[WHATSAPP] MENSAJE DETECTADO:`);
          console.log(`   Session: ${sessionKey}`);
          console.log(`   Usuario de esta sesion: ${sock.user?.id}`);
          console.log(`   From: ${remoteJid}`);
          console.log(`   FromMe (flag): ${fromMe}`);
          console.log(`   ID: ${messageId}`);
          console.log(`   Timestamp: ${messageTimestamp}`);
          console.log(`   PushName: ${msg.pushName || 'N/A'}`);

          // IGNORAR MENSAJES PROPIOS
          if (fromMe) {
            console.log(`   [WHATSAPP] IGNORADO (mensaje propio)`);
            continue;
          }

          // IGNORAR GRUPOS (@g.us)
          if (remoteJid.includes('@g.us')) {
            console.log(`   [WHATSAPP] IGNORADO (mensaje de GRUPO)`);
            continue;
          }

          // IGNORAR ESTADOS Y NEWSLETTERS
          if (remoteJid === 'status@broadcast') {
            console.log(`   [WHATSAPP] Ignorado (estado de WhatsApp)`);
            continue;
          }

          if (remoteJid && remoteJid.includes('@newsletter')) {
            console.log(`   [WHATSAPP] Ignorado (newsletter)`);
            continue;
          }

          const sessionStartTime = this.sessionStartTimes.get(sessionKey);
          const messageDate = new Date(messageTimestamp * 1000);

          console.log(`   [WHATSAPP] Fecha mensaje: ${messageDate.toLocaleString()}`);
          console.log(`   [WHATSAPP] Fecha inicio: ${sessionStartTime.toLocaleString()}`);

          if (messageDate < sessionStartTime) {
            console.log(`   [WHATSAPP] Ignorado (mensaje antiguo)`);
            continue;
          }

          if (!msg.message) {
            console.log(`   [WHATSAPP] Ignorado (sin contenido de mensaje)`);
            continue;
          }

          // Procesamiento del tipo de formato admitido
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

          console.log(`   [WHATSAPP] Texto: "${messageText}"`);

          // OBTENER NUMERO REAL Y NOMBRE (PUSHNAME)
          const infoContacto = await this.obtenerNumeroReal(sock, msg, sessionKey);

          // Guardar temporalmente informacion identificatoria
          const cacheKey = `${sessionKey}_${infoContacto.jidOriginal}`;
          this.contactCache.set(cacheKey, {
            numero: infoContacto.numeroReal,
            nombre: infoContacto.nombreContacto,
            jidOriginal: infoContacto.jidOriginal,
            numeroDescifrado: infoContacto.numeroDescifrado,
            timestamp: Date.now()
          });

          // Cache inverso (numero -> JID)
          const jidCacheKey = `${sessionKey}_${infoContacto.numeroReal}`;
          this.jidCache.set(jidCacheKey, infoContacto.jidOriginal);

          console.log(`[WHATSAPP] Guardado en cache:`);
          console.log(`   Numero: ${infoContacto.numeroReal}`);
          console.log(`   Nombre: ${infoContacto.nombreContacto}`);
          console.log(`   JID: ${infoContacto.jidOriginal}`);

          console.log(`\n[WHATSAPP] ENVIANDO A N8N...`);
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
          console.error(`[WHATSAPP] Error procesando mensaje:`, error);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`\n${'*'.repeat(70)}`);
        console.log(`[WHATSAPP] QR GENERADO`);
        console.log(`   SessionKey: ${sessionKey}`);
        console.log(`   Timestamp: ${new Date().toLocaleString()}`);
        console.log(`${'*'.repeat(70)}`);

        // Convertir para que el dashboard consuma visualmente de panel base 64
        const qrDataUrl = await QRCode.toDataURL(qr);
        this.qrCodes.set(sessionKey, qrDataUrl);
        sock.qr = qrDataUrl;
        console.log(`[WHATSAPP] QR almacenado en memoria (${qrDataUrl.length} caracteres)`);

        console.log(`\n[WHATSAPP] Guardando QR en base de datos...`);
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

          console.log(`   Operacion: ${created ? 'CREATED' : 'UPDATED'}`);
          console.log(`[WHATSAPP] QR guardado exitosamente en BD`);
          console.log(`   Empresa: ${empresaId}`);
          console.log(`   Longitud QR: ${qrDataUrl.length} caracteres`);

          const verificacion = await InstanciaWhatsapp.findOne({
            where: { empresa_id: empresaId, nombre_sesion: nombreSesion }
          });
          console.log(`   Verificacion - QR en BD: ${verificacion?.codigo_qr ? 'PRESENTE' : 'AUSENTE'}`);

        } catch (dbError) {
          console.error(`[WHATSAPP] Error guardando QR en BD:`);
          console.error(`   Error: ${dbError.message}`);
          console.error(`   Stack: ${dbError.stack}`);
        }
        console.log(`${'*'.repeat(70)}\n`);
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;

        console.log(`\n[WHATSAPP] CONEXION CERRADA`);
        console.log(`   Status Code: ${statusCode}`);
        console.log(`   Razon: ${isLoggedOut ? 'Logout manual' : 'Desconexion inesperada'}`);
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
          console.log(`[WHATSAPP] Estado de desconexion guardado en BD`);
        } catch (dbError) {
          console.error(`[WHATSAPP] Error actualizando BD:`, dbError.message);
        }

        if (shouldReconnect) {
          console.log(`\n[WHATSAPP] RECONEXION AUTOMATICA ACTIVADA`);
          console.log(`   [WHATSAPP] Se generara un nuevo QR en 5 segundos...`);

          setTimeout(async () => {
            console.log(`\n${'='.repeat(70)}`);
            console.log(`[WHATSAPP] EJECUTANDO RECONEXION AUTOMATICA`);
            console.log(`   SessionKey: ${sessionKey}`);
            console.log(`${'='.repeat(70)}`);

            console.log(`[WHATSAPP] Limpiando sesion anterior de memoria...`);
            this.sessions.delete(sessionKey);
            this.sessionStartTimes.delete(sessionKey);
            this.qrCodes.delete(sessionKey);
            this.stores.delete(sessionKey);
            console.log(`   [WHATSAPP] Memoria limpiada`);

            try {
              console.log(`\n[WHATSAPP] Llamando a iniciarSesion() con forzarNuevaConexion=true...`);
              const resultado = await this.iniciarSesion(empresaId, nombreSesion, true);
              console.log(`[WHATSAPP] iniciarSesion() completado`);
              console.log(`   Resultado:`, resultado);
            } catch (error) {
              console.error(`\n[WHATSAPP] ERROR EN RECONEXION AUTOMATICA`);
              console.error(`   Error: ${error.message}`);
            }
          }, 5000);
        } else {
          console.log(`[WHATSAPP] Sesion desconectada (logout manual)`);
          console.log(`[WHATSAPP] Limpiando sesion completamente...`);
          this.sessions.delete(sessionKey);
          this.sessionStartTimes.delete(sessionKey);
          this.qrCodes.delete(sessionKey);
          this.stores.delete(sessionKey);

          // Actualizar registros dependientes para asegurar desenganche
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
            console.log(`[WHATSAPP] BD limpiada - sesion eliminada completamente`);
          } catch (dbError) {
            console.error(`[WHATSAPP] Error actualizando BD:`, dbError.message);
          }

          try {
            const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);
            await fs.rm(sessionPath, { recursive: true, force: true });
            console.log(`[WHATSAPP] Archivos de sesion eliminados del disco`);
          } catch (error) {
            console.error(`[WHATSAPP] Error eliminando archivos:`, error.message);
          }
        }
      }

      if (connection === 'open') {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[WHATSAPP] WHATSAPP CONECTADO CORRECTAMENTE`);
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
          console.log(`[WHATSAPP] Estado de conexion guardado en BD para empresa ${empresaId}`);
          console.log(`[WHATSAPP] Numero registrado: ${sock.user?.id}`);
        } catch (dbError) {
          console.error(`[WHATSAPP] Error actualizando BD:`, dbError.message);
        }

        try {
          await sock.sendPresenceUpdate('unavailable');
          console.log(`[WHATSAPP] Cliente marcado como "unavailable" - recibira mensajes en tiempo real sin revelar leido`);
        } catch (error) {
          console.error(`[WHATSAPP] Error marcando presencia:`, error.message);
        }
      }
    });

    return {
      success: true,
      qr: sock.qr,
      message: 'Sesion iniciada - esperando conexion'
    };
  }

  // Despliegue en red con webhook configurado que se comunica directamente con n8n
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

    console.log(`[WHATSAPP] Llamada webhook URL: ${webhookUrl}`);
    console.log(`[WHATSAPP] Payload adjunto:`, JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.text();
        console.log(`[WHATSAPP] N8N respondio correctamente`);
        console.log(`[WHATSAPP] Respuesta n8n:`, data);
      } else {
        console.log(`[WHATSAPP] N8N fallo status: ${response.status}`);
        const errorText = await response.text();
        console.log(`[WHATSAPP] Error devolucion:`, errorText);
      }
    } catch (error) {
      console.error(`[WHATSAPP] Error enviando a N8N:`, error.message);
    }
  }

  // Chequeo rapido en memoria del panel de configuracion
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
        mensaje: 'Sesion no iniciada',
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

  // Intermediacion simple
  obtenerQR(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const qr = this.qrCodes.get(sessionKey);
    if (qr) {
      return { success: true, qr };
    }

    return {
      success: false,
      message: 'QR no disponible - sesion ya conectada o no iniciada'
    };
  }

  // Herramienta de envio manual y corporativo 
  async enviarMensaje(empresaId, nombreSesion, numeroDestino, mensaje) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[WHATSAPP] ENVIANDO MENSAJE`);
    console.log(`   SessionKey: ${sessionKey}`);
    console.log(`   NumeroDestino: ${numeroDestino}`);
    console.log(`   Mensaje: ${mensaje?.substring(0, 100)}`);
    console.log(`${'='.repeat(60)}`);

    const sock = this.sessions.get(sessionKey);

    if (!sock || !sock.user) {
      console.log(`[WHATSAPP] Sesion no encontrada o no conectada`);
      throw new Error('Sesion no conectada');
    }

    console.log(`[WHATSAPP] Sesion encontrada - Usuario: ${sock.user.id}`);

    let jidFinal = null;

    // PRIORIDAD 1: Buscar JID en cache (el mas confiable)
    const jidCacheKey = `${sessionKey}_${numeroDestino}`;
    if (this.jidCache.has(jidCacheKey)) {
      jidFinal = this.jidCache.get(jidCacheKey);
      console.log(`[WHATSAPP] JID encontrado en jidCache: ${jidFinal}`);
    }

    // PRIORIDAD 2: Buscar en contactCache
    if (!jidFinal) {
      for (const [key, value] of this.contactCache.entries()) {
        if (value.numero === numeroDestino && key.startsWith(sessionKey)) {
          jidFinal = value.jidOriginal;
          console.log(`[WHATSAPP] JID encontrado en contactCache: ${jidFinal}`);
          break;
        }
      }
    }

    // PRIORIDAD 3: Si ya viene con @, usarlo directamente
    if (!jidFinal && numeroDestino.includes('@')) {
      jidFinal = numeroDestino;
      console.log(`[WHATSAPP] JID completo recibido: ${jidFinal}`);
    }

    // FALLBACK: Formato estandar @s.whatsapp.net
    if (!jidFinal) {
      jidFinal = `${numeroDestino}@s.whatsapp.net`;
      console.log(`[WHATSAPP] JID no encontrado en cache, usando estandar: ${jidFinal}`);
    }

    console.log(`\n[WHATSAPP] JID FINAL PARA ENVIO: ${jidFinal}`);

    // ENVOLTORIO PROTEGIDO PARA NO BLOQUEAR HILO PRINCIPAL SI DEMORA
    const enviarConTimeout = (jid, contenido, timeout = 10000) => {
      return Promise.race([
        sock.sendMessage(jid, contenido),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout enviando mensaje')), timeout)
        )
      ]);
    };

    try {
      await enviarConTimeout(jidFinal, { text: mensaje }, 10000);
      console.log(`[WHATSAPP] Mensaje enviado correctamente`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: true, message: 'Mensaje enviado' };
    } catch (error) {
      console.error(`[WHATSAPP] Error al enviar mensaje:`, error.message);

      if (jidFinal.includes('@lid')) {
        console.log(`\n[WHATSAPP] Fallo con JID cifrado, intentando con formato estandar...`);
        const jidEstandar = `${numeroDestino.replace(/@.*$/, '')}@s.whatsapp.net`;

        try {
          await enviarConTimeout(jidEstandar, { text: mensaje }, 10000);
          console.log(`[WHATSAPP] Mensaje enviado con JID estandar: ${jidEstandar}`);
          console.log(`${'='.repeat(60)}\n`);
          return { success: true, message: 'Mensaje enviado (fallback)' };
        } catch (fallbackError) {
          console.error(`[WHATSAPP] Fallback fallido:`, fallbackError.message);
          throw new Error(`No se pudo enviar el mensaje: ${fallbackError.message}`);
        }
      } else {
        throw new Error(`Error al enviar mensaje: ${error.message}`);
      }
    }
  }

  // Intermediario logico para subida en transacciones como reservas y catalogos interactivos
  async enviarImagen(empresaId, nombreSesion, numeroDestino, imagenUrl, caption) {
    const sessionKey = `${empresaId}_${nombreSesion}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[WHATSAPP] ENVIANDO IMAGEN`);
    console.log(`   SessionKey: ${sessionKey}`);
    console.log(`   NumeroDestino: ${numeroDestino}`);
    console.log(`   ImagenUrl: ${imagenUrl}`);
    console.log(`   Caption: ${caption?.substring(0, 100)}`);
    console.log(`${'='.repeat(60)}`);

    const sock = this.sessions.get(sessionKey);

    if (!sock || !sock.user) {
      console.log(`[WHATSAPP] Sesion no encontrada o no conectada`);
      throw new Error('Sesion no conectada');
    }

    console.log(`[WHATSAPP] Sesion encontrada - Usuario: ${sock.user.id}`);

    let jidFinal = null;

    // PRIORIDAD 1: Buscar JID en cache
    const jidCacheKey = `${sessionKey}_${numeroDestino}`;
    if (this.jidCache.has(jidCacheKey)) {
      jidFinal = this.jidCache.get(jidCacheKey);
      console.log(`[WHATSAPP] JID encontrado en jidCache: ${jidFinal}`);
    }

    // PRIORIDAD 2: Buscar en contactCache
    if (!jidFinal) {
      for (const [key, value] of this.contactCache.entries()) {
        if (value.numero === numeroDestino && key.startsWith(sessionKey)) {
          jidFinal = value.jidOriginal;
          console.log(`[WHATSAPP] JID encontrado en contactCache: ${jidFinal}`);
          break;
        }
      }
    }

    // PRIORIDAD 3: Si ya viene con @, usarlo directamente
    if (!jidFinal && numeroDestino.includes('@')) {
      jidFinal = numeroDestino;
      console.log(`[WHATSAPP] JID completo recibido: ${jidFinal}`);
    }

    // FALLBACK: Formato estandar
    if (!jidFinal) {
      jidFinal = `${numeroDestino}@s.whatsapp.net`;
      console.log(`[WHATSAPP] JID no encontrado en cache, usando estandar: ${jidFinal}`);
    }

    console.log(`\n[WHATSAPP] JID FINAL PARA ENVIO: ${jidFinal}`);

    // FUNcION CON TIMEOUT
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

      console.log(`[WHATSAPP] Imagen enviada correctamente`);
      console.log(`${'='.repeat(60)}\n`);
      return { success: true, message: 'Imagen enviada' };
    } catch (error) {
      console.error(`[WHATSAPP] Error al enviar imagen:`, error.message);

      if (jidFinal.includes('@lid')) {
        console.log(`\n[WHATSAPP] Fallo con JID cifrado, intentando con formato estandar...`);
        const jidEstandar = `${numeroDestino.replace(/@.*$/, '')}@s.whatsapp.net`;

        try {
          await enviarConTimeout(jidEstandar, {
            image: { url: imagenUrl },
            caption: caption
          }, 10000);
          console.log(`[WHATSAPP] Imagen enviada con JID estandar: ${jidEstandar}`);
          console.log(`${'='.repeat(60)}\n`);
          return { success: true, message: 'Imagen enviada (fallback)' };
        } catch (fallbackError) {
          console.error(`[WHATSAPP] Fallback fallo tambien:`, fallbackError.message);
          throw new Error(`No se pudo enviar la imagen: ${fallbackError.message}`);
        }
      } else {
        throw new Error(`Error al enviar imagen: ${error.message}`);
      }
    }
  }

  // ============================================
  // PROCEDER A TERMINOS DE EJECUCION
  // ============================================

  // Despliegue de limpieza controlada
  async cerrarSesion(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = this.sessions.get(sessionKey);
    if (sock) {
      await sock.logout();
      console.log(`[WHATSAPP] Logout ejecutado para ${sessionKey}`);
    }

    // Limpiar interval de auto-guardado
    if (this.storeIntervals.has(sessionKey)) {
      clearInterval(this.storeIntervals.get(sessionKey));
      this.storeIntervals.delete(sessionKey);
      console.log(`[WHATSAPP] Interval de guardado detenido`);
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
      console.log(`[WHATSAPP] BD actualizada - sesion cerrada`);
    } catch (dbError) {
      console.error(`[WHATSAPP] Error actualizando BD:`, dbError.message);
    }

    try {
      const sessionPath = path.join(__dirname, '../whatsapp-sessions', `session_${sessionKey}`);
      await fs.rm(sessionPath, { recursive: true, force: true });
      console.log(`[WHATSAPP] Archivos de sesion eliminados`);
    } catch (error) {
      console.error(`[WHATSAPP] Error eliminando archivos:`, error.message);
    }

    return { success: true, message: 'Sesion cerrada completamente' };
  }

  // Pre-cargar entorno desde memoria persistente si ocurrio cierre del script node
  async cargarSesionesGuardadas() {
    try {
      const sessionsDir = path.join(__dirname, '../whatsapp-sessions');
      console.log(`[WHATSAPP] Buscando sesiones en: ${sessionsDir}`);
      try {
        await fs.access(sessionsDir);
      } catch {
        console.log(`[WHATSAPP] No hay carpeta de sesiones - se creara al iniciar sesion`);
        return { success: true, message: 'No hay sesiones previas' };
      }

      const files = await fs.readdir(sessionsDir);
      const sessionFolders = files.filter(f => f.startsWith('session_'));

      if (sessionFolders.length === 0) {
        console.log(`[WHATSAPP] No hay sesiones guardadas en estructura`);
        return { success: true, message: 'No hay sesiones previas' };
      }

      console.log(`[WHATSAPP] Encontradas ${sessionFolders.length} sesion(es) recuperables`);
      console.log(`   ${sessionFolders.join(', ')}`);
      console.log(`[WHATSAPP] Se reconectaran automaticamente al invocar inicializacion`);

      return {
        success: true,
        sesiones: sessionFolders,
        message: `${sessionFolders.length} sesion(es) listas para restauracion`
      };
    } catch (error) {
      console.error(`[WHATSAPP] Error al restablecer sesiones:`, error);
      return { success: false, error: error.message };
    }
  }

  // Informacion de contacto
  obtenerClienteActivo(empresaId, nombreSesion) {
    const sessionKey = `${empresaId}_${nombreSesion}`;
    const sock = this.sessions.get(sessionKey);
    if (!sock || !sock.user) {
      return null;
    }
    return sock;
  }

  // Resumen del entorno por sesion consultada
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

}

module.exports = new WhatsAppService();
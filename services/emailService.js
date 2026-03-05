const transporter = require('../config/email');
require('dotenv').config();

class EmailService {

  // ===========================================
  // ENVIO DE CORREO DE VERIFICACION (REGISTRO)
  // ===========================================
  async enviarEmailVerificacion(destinatario, token, tipo = 'usuario') {
    const baseUrl = process.env.BASE_URL;
    // Construir la direccion resolutiva para validacion via click
    const enlaceVerificacion = `${baseUrl}/api/auth/verificar-email?token=${token}`;

    // Plantilla en codigo estatico html embebido enviando interfaz rica
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: 'Verificacion de Cuenta - Chatbot Empresarial',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          
          <!-- Encabezado corporativo -->
          <div style="background-color: #1a1a2e; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">Chatbot Empresarial</h1>
            <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">SISTEMA DE GESTION EMPRESARIAL</p>
          </div>

          <!-- Linea de corte elegante -->
          <div style="height: 4px; background: linear-gradient(90deg, #2d6a9f, #1a1a2e, #2d6a9f);"></div>
          
          <!-- Contenido central de bienvenida -->
          <div style="padding: 40px 35px; background: #ffffff;">
            <h2 style="color: #1a1a2e; font-size: 20px; margin-top: 0;">Verificacion de Correo Electronico</h2>
            <p style="color: #555555; line-height: 1.7; font-size: 15px;">
              Gracias por registrarte. Para activar tu cuenta y acceder al sistema, es necesario verificar tu correo electronico.
            </p>
            
            <!-- Boton en formato bloque para navegacion -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${enlaceVerificacion}" 
                 style="background-color: #2d6a9f; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 15px; letter-spacing: 0.5px;">
                Verificar mi Correo
              </a>
            </div>

            <!-- Fallback para gestores que bloquean botones formales -->
            <div style="background: #f4f6f9; padding: 16px 20px; border-radius: 6px; border-left: 4px solid #2d6a9f; margin-top: 25px;">
              <p style="color: #555555; font-size: 13px; margin: 0 0 8px 0;">
                <strong>¿No puedes hacer clic en el boton?</strong> Copia y pega este enlace en tu navegador:
              </p>
              <p style="background: #ffffff; border: 1px solid #dde2ea; padding: 10px 12px; border-radius: 4px; word-break: break-all; font-size: 12px; color: #2d6a9f; margin: 0;">
                ${enlaceVerificacion}
              </p>
            </div>

            <!-- Aviso de expiracion transaccional -->
            <div style="margin-top: 25px; padding: 14px 18px; background: #fff8e1; border-radius: 6px; border-left: 4px solid #f0a500;">
              <p style="color: #7a5c00; font-size: 13px; margin: 0;">
                <strong>Este enlace expirara en 24 horas.</strong> Si no solicitaste esta verificacion, puedes ignorar este correo.
              </p>
            </div>
          </div>

          <!-- Pie infererior de la organizacion -->
          <div style="background-color: #f4f6f9; padding: 20px 35px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              Chatbot Empresarial © ${new Date().getFullYear()} — Todos los derechos reservados
            </p>
            <p style="color: #bbbbbb; font-size: 11px; margin: 5px 0 0 0;">
              Este es un correo automatico, por favor no respondas a este mensaje.
            </p>
          </div>

        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Verificacion enviada a ${destinatario}`);
      return true;
    } catch (error) {
      console.error('[EMAIL] Fallo durante la verificacion:', error);
      throw new Error('Error al enviar email de verificacion');
    }
  }

  // ===========================================
  // ENVIO DE CORREO DE CONFIRMACION EXITOSA
  // ===========================================
  async enviarEmailBienvenida(destinatario, nombreUsuario) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: '¡Cuenta Verificada! Ya puedes acceder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">

          <!-- Encabezado corporativo -->
          <div style="background-color: #1a1a2e; padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px;">Chatbot Empresarial</h1>
            <p style="color: #a0a0b0; margin: 8px 0 0 0; font-size: 13px; letter-spacing: 0.5px;">SISTEMA DE GESTION EMPRESARIAL</p>
          </div>

          <!-- Linea de corte elegante -->
          <div style="height: 4px; background: linear-gradient(90deg, #2d6a9f, #1a1a2e, #2d6a9f);"></div>

          <!-- Contenido central de confirmacion de onboarding -->
          <div style="padding: 40px 35px; background: #ffffff;">
            <h2 style="color: #1a1a2e; font-size: 20px; margin-top: 0;">¡Cuenta Verificada Exitosamente!</h2>
            <p style="font-size: 15px; color: #333333;">
              Hola <strong>${nombreUsuario}</strong>,
            </p>
            <p style="color: #555555; line-height: 1.7; font-size: 15px;">
              Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesion y comenzar a usar el sistema.
            </p>
            
            <!-- Bloque de guia sobre la arquitectura -->
            <div style="background: #f4f6f9; padding: 20px 24px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #2d6a9f;">
              <h3 style="color: #1a1a2e; margin-top: 0; font-size: 15px;">Proximos pasos:</h3>
              <ul style="color: #555555; line-height: 2; font-size: 14px; margin: 0; padding-left: 18px;">
                <li>Inicia sesion con tu correo y contraseña</li>
                <li>Configura tu instancia de WhatsApp</li>
                <li>Crea mensajes automaticos personalizados</li>
                <li>Gestiona tu catalogo de productos y servicios</li>
              </ul>
            </div>

            <!-- Boton de accion (CTA) -->
            <div style="text-align: center; margin: 35px 0;">
              <a href="${frontendUrl}" 
                 style="background-color: #2d6a9f; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 15px; letter-spacing: 0.5px;">
                Iniciar Sesion
              </a>
            </div>

            <p style="color: #999999; font-size: 13px; margin-top: 30px;">
              ¿Necesitas ayuda? Contactanos y con gusto te asistiremos.
            </p>
          </div>

          <!-- Pie infererior corporativo -->
          <div style="background-color: #f4f6f9; padding: 20px 35px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              Chatbot Empresarial © ${new Date().getFullYear()} — Todos los derechos reservados
            </p>
            <p style="color: #bbbbbb; font-size: 11px; margin: 5px 0 0 0;">
              Este es un correo automatico, por favor no respondas a este mensaje.
            </p>
          </div>

        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Bienvenida enviada a ${destinatario}`);
    } catch (error) {
      console.error('[EMAIL] Fallo durante la bienvenida:', error);
    }
  }
}

module.exports = new EmailService();
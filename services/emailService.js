const transporter = require('../config/email');
require('dotenv').config();

class EmailService {
  
  async enviarEmailVerificacion(destinatario, token, tipo = 'usuario') {
    const baseUrl = process.env.BASE_URL;
    const enlaceVerificacion = `${baseUrl}/api/auth/verificar-email?token=${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: 'Verificación de Cuenta - Chatbot Empresarial',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🤖 Chatbot Empresarial</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: #667eea;">¡Bienvenido!</h2>
            <p style="color: #666; line-height: 1.6;">
              Gracias por registrarte. Para activar tu cuenta y poder iniciar sesión, necesitas verificar tu correo electrónico.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${enlaceVerificacion}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                ✅ Verificar mi Correo
              </a>
            </div>

            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="color: #666; font-size: 14px; margin: 0;">
                <strong>¿No puedes hacer clic en el botón?</strong><br>
                Copia y pega este enlace en tu navegador:
              </p>
              <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all; font-size: 12px; margin-top: 10px;">
                ${enlaceVerificacion}
              </p>
            </div>
          </div>

          <div style="padding: 20px; background: #e9ecef; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Si no creaste esta cuenta, puedes ignorar este correo.
            </p>
            <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">
              Este enlace expirará en 24 horas.
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de verificación enviado a ${destinatario}`);
      return true;
    } catch (error) {
      console.error('❌ Error al enviar email:', error);
      throw new Error('Error al enviar email de verificación');
    }
  }

  async enviarEmailBienvenida(destinatario, nombreUsuario) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: destinatario,
      subject: '✅ ¡Cuenta Verificada! Ya puedes acceder',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0;">🎉 ¡Cuenta Verificada!</h1>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <p style="font-size: 18px; color: #333;">
              Hola <strong>${nombreUsuario}</strong>,
            </p>
            <p style="color: #666; line-height: 1.6;">
              ¡Excelentes noticias! Tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión y comenzar a usar todas las funcionalidades de nuestro sistema de chatbot empresarial.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #667eea; margin-top: 0;">📋 Próximos pasos:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Inicia sesión con tu correo y contraseña</li>
                <li>Configura tu primera instancia de WhatsApp</li>
                <li>Crea mensajes automáticos personalizados</li>
                <li>Gestiona tu catálogo de productos/servicios</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${frontendUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                🚀 Iniciar Sesión Ahora
              </a>
            </div>

            <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; border-radius: 4px; margin-top: 20px;">
              <p style="color: #0c5460; margin: 0; font-size: 14px;">
                <strong>💡 Consejo:</strong> Configura tu instancia de WhatsApp lo antes posible para empezar a recibir y responder mensajes automáticamente.
              </p>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              ¿Necesitas ayuda? Responde este correo y con gusto te asistiremos.
            </p>
          </div>

          <div style="background: #333; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Chatbot Empresarial © ${new Date().getFullYear()} - Todos los derechos reservados
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Email de bienvenida enviado a ${destinatario}`);
    } catch (error) {
      console.error('❌ Error al enviar email de bienvenida:', error);
    }
  }
}

module.exports = new EmailService();
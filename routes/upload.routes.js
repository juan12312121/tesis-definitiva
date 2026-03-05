// routes/upload.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verificarToken } = require('../middleware/auth.middleware');

// Validar y confirmar via logica de servidor espacio para deposito
const uploadsDir = path.join(__dirname, '../uploads/catalogos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Interfaz basica orientada al archivo plano localizando un identificador robusto con date actual adjuntado
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Mecanismo preventivo de compatibilidad
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten imagenes (JPG, PNG, GIF, WEBP)'), false);
  }
};

// Capacidad en bytes para evitar saturar el ancho de banda del server backend o el cliente a menos de 5 mb optimizados
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

// Metodo conector hacia un catalogo item de subir fotografias adjuntas de productos nuevos o existentes
router.post('/imagen', verificarToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporciono ningun archivo'
      });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/uploads/catalogos/${req.file.filename}`;

    res.json({
      success: true,
      message: 'Imagen subida exitosamente',
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Error al subir imagen:', error);

    // Validacion cruzada que antepuesta de error intente no retener espacio extra y suprimir del dir
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Error al subir la imagen',
      error: error.message
    });
  }
});

// Borrado manual logico del archivo grafico particular 
router.delete('/imagen/:filename', verificarToken, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Suprimirlo
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar la imagen',
      error: error.message
    });
  }
});

// Disparador manual por si salta un error de biblioteca como file size o en mime format extra para presentarlo limpiamente 
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Maximo 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Error al procesar el archivo',
      error: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next();
});

module.exports = router;
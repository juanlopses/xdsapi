const express = require('express');
const ytdl_han = require("@ytdl-han");
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Almacenamiento temporal de archivos
const archivosTemporales = {};

// Configuración de middleware
app.use(express.json());

// Ruta principal de bienvenida
app.get('/', (req, res) => {
    res.send('API de Descarga de YouTube - newton');
});

// Ruta para procesar descargas
app.get('/descargar', async (req, res) => {
    try {
        const { url, calidad } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                estado: 'error',
                mensaje: 'Se requiere el parámetro URL' 
            });
        }

        const opcionCalidad = calidad || '128kbps';
        const resultado = await ytdl_han(url, opcionCalidad);
        
        // Generar ID único para el archivo
        const idArchivo = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Determinar tipo de archivo
        const esVideo = resultado.data.format.includes('video');
        const extension = esVideo ? '.mp4' : '.mp3';
        const nombreArchivo = `${idArchivo}${extension}`;
        const rutaArchivo = path.join(__dirname, 'temporal', nombreArchivo);
        
        // Crear directorio temporal si no existe
        if (!fs.existsSync(path.join(__dirname, 'temporal'))) {
            fs.mkdirSync(path.join(__dirname, 'temporal'));
        }
        
        // Guardar archivo temporal
        fs.writeFileSync(rutaArchivo, resultado.data.format);
        
        // Registrar archivo temporal
        archivosTemporales[idArchivo] = {
            ruta: rutaArchivo,
            expira: Date.now() + 30000 // 30 segundos
        };
        
        // Programar eliminación automática
        setTimeout(() => {
            if (fs.existsSync(rutaArchivo)) {
                fs.unlinkSync(rutaArchivo);
                delete archivosTemporales[idArchivo];
                console.log(`Archivo temporal ${idArchivo} eliminado`);
            }
        }, 30000);
        
        // Generar URL de descarga
        const urlDescarga = `${req.protocol}://${req.get('host')}/descargar/${idArchivo}`;
        
        // Preparar respuesta
        const respuesta = {
            estado: 'éxito',
            creador: 'newton',
            datos: {
                titulo: resultado.data.title,
                tamaño: resultado.data.size,
                miniatura: resultado.data.thumbnail,
                id: resultado.data.id,
                urlDescarga: urlDescarga,
                expiraEn: '30 segundos',
                tipo: esVideo ? 'video/mp4' : 'audio/mpeg',
                formato: esVideo ? 'video' : 'audio'
            }
        };
        
        res.json(respuesta);
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            estado: 'error',
            mensaje: 'Error al procesar la solicitud',
            error: error.message 
        });
    }
});

// Ruta para descargar archivos temporales
app.get('/descargar/:idArchivo', (req, res) => {
    const idArchivo = req.params.idArchivo;
    const infoArchivo = archivosTemporales[idArchivo];
    
    if (!infoArchivo || !fs.existsSync(infoArchivo.ruta)) {
        return res.status(404).json({ 
            estado: 'error',
            mensaje: 'Archivo no encontrado o enlace expirado' 
        });
    }
    
    // Configurar tipo de contenido y nombre de archivo
    const esVideo = infoArchivo.ruta.endsWith('.mp4');
    const tipoContenido = esVideo ? 'video/mp4' : 'audio/mpeg';
    const nombreDescarga = esVideo ? 'video.mp4' : 'audio.mp3';
    
    // Enviar archivo para descarga
    res.download(infoArchivo.ruta, nombreDescarga, (err) => {
        if (err) {
            console.error('Error al descargar:', err);
        }
    });
});

// Limpieza periódica de archivos temporales
setInterval(() => {
    const ahora = Date.now();
    Object.keys(archivosTemporales).forEach(idArchivo => {
        if (archivosTemporales[idArchivo].expira < ahora) {
            if (fs.existsSync(archivosTemporales[idArchivo].ruta)) {
                fs.unlinkSync(archivosTemporales[idArchivo].ruta);
                delete archivosTemporales[idArchivo];
                console.log(`Archivo temporal ${idArchivo} eliminado por limpieza automática`);
            }
        }
    });
}, 60000); // Cada minuto

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor funcionando en el puerto ${PORT}`);
});

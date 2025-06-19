const express = require('express');
const bodyParser = require('body-parser');
const { getFbVideoInfo } = require('fb-downloader-scrapper');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Ruta para obtener detalles del video
app.post('/download', async (req, res) => {
  const { url } = req.body;
  try {
    const result = await getFbVideoInfo(url);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo obtener la información del video.' });
  }
});

// Servir el HTML en la raíz
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Arrancar el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});

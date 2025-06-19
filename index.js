const express = require('express');
const ytdl_han = require('@ytdl-han');
const axios = require('axios');
const ytSearch = require('yt-search');
const FormData = require('form-data');
const app = express();
const port = 3000;

// Función para subir el archivo al servidor de tmpfiles.org
const uploadToTmpFiles = async (fileBuffer, fileName) => {
  const formData = new FormData();
  formData.append('file', fileBuffer, fileName);

  try {
    const response = await axios.post('https://tmpfiles.org/api/v1/upload', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error al subir el archivo:', error);
    throw new Error('No se pudo subir el archivo');
  }
};

// Función para obtener información y descargar MP3
const downloadAudio = async (url, quality = '128kbps') => {
  // Obtener información del video/audio
  const videoInfo = await ytdl_han(url, quality);

  // Obtener el buffer del archivo de audio (en formato MP3)
  const fileBuffer = videoInfo.data.format;
  const fileName = `${videoInfo.data.title}.mp3`;

  // Subir a tmpfiles.org
  const uploadResponse = await uploadToTmpFiles(fileBuffer, fileName);

  return {
    title: videoInfo.data.title,
    size: videoInfo.data.size,
    thumbnail: videoInfo.data.thumbnail,
    id: videoInfo.data.id,
    uploaded_url: uploadResponse.data.url,
    expires_in: uploadResponse.data.expires_in,
  };
};

// Función para obtener información y descargar MP4
const downloadVideo = async (url) => {
  // Obtener información del video
  const videoInfo = await ytdl_han(url, '1080p');

  // Obtener el buffer del archivo de video (en formato MP4)
  const fileBuffer = videoInfo.data.format;
  const fileName = `${videoInfo.data.title}.mp4`;

  // Subir a tmpfiles.org
  const uploadResponse = await uploadToTmpFiles(fileBuffer, fileName);

  return {
    title: videoInfo.data.title,
    size: videoInfo.data.size,
    thumbnail: videoInfo.data.thumbnail,
    id: videoInfo.data.id,
    uploaded_url: uploadResponse.data.url,
    expires_in: uploadResponse.data.expires_in,
  };
};

// Función para verificar si el query es un enlace de YouTube
const isYouTubeUrl = (url) => {
  const regex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.be)\/.+$/;
  return regex.test(url);
};

// Endpoint para buscar y descargar solo audio (MP3) por nombre o enlace
app.get('/download/audio', async (req, res) => {
  const { query, quality } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'El parámetro "query" es obligatorio.' });
  }

  try {
    let downloadResponse;

    // Verificamos si el query es un enlace de YouTube
    if (isYouTubeUrl(query)) {
      console.log(`Descargando directamente desde URL de YouTube: ${query}`);
      // Si es un enlace, descargamos directamente el audio
      downloadResponse = await downloadAudio(query, quality);
    } else {
      // Si es texto, buscamos el video en YouTube
      const results = await ytSearch(query);
      if (results.videos.length === 0) {
        return res.status(404).json({ error: 'No se encontraron resultados.' });
      }

      const firstVideo = results.videos[0]; // Obtener el primer video encontrado
      console.log(`Buscando: ${firstVideo.title}`);
      console.log(`URL: ${firstVideo.url}`);

      // Descargar solo el audio (MP3)
      downloadResponse = await downloadAudio(firstVideo.url, quality);
    }

    res.json(downloadResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error al realizar la búsqueda o descargar el archivo de audio.' });
  }
});

// Endpoint para buscar y descargar solo video (MP4) por nombre o enlace
app.get('/download/video', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'El parámetro "query" es obligatorio.' });
  }

  try {
    let downloadResponse;

    // Verificamos si el query es un enlace de YouTube
    if (isYouTubeUrl(query)) {
      console.log(`Descargando directamente desde URL de YouTube: ${query}`);
      // Si es un enlace, descargamos directamente el video
      downloadResponse = await downloadVideo(query);
    } else {
      // Si es texto, buscamos el video en YouTube
      const results = await ytSearch(query);
      if (results.videos.length === 0) {
        return res.status(404).json({ error: 'No se encontraron resultados.' });
      }

      const firstVideo = results.videos[0]; // Obtener el primer video encontrado
      console.log(`Buscando: ${firstVideo.title}`);
      console.log(`URL: ${firstVideo.url}`);

      // Descargar solo el video (MP4)
      downloadResponse = await downloadVideo(firstVideo.url);
    }

    res.json(downloadResponse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ocurrió un error al realizar la búsqueda o descargar el archivo de video.' });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`API corriendo en http://localhost:${port}`);
});

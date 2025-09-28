const axios = require("axios");
const yts = require("yt-search");
const Jimp = require("jimp");
const { ytdlvid, ytdlaud } = require("../scraper/ytdl");

module.exports = async (msg, { conn, text, command, args }) => {
  if (command === "play") {
    if (!text) {
      return conn.sendMessage(msg.key.remoteJid, { 
        text: "❌ Ingresa el nombre de la canción o el enlace de YouTube.\n\nEjemplo:\n.play Despacito" 
      }, { quoted: msg });
    }

    try {
      await conn.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

      const search = await yts(text);
      if (!search.videos.length) {
        return conn.sendMessage(msg.key.remoteJid, { text: "No se encontraron resultados." }, { quoted: msg });
      }

      const video = search.videos[0];
      const { url: videoUrl, title, timestamp: duration, views, author, thumbnail } = video;

      const videoInfo = `
╭  \`\`\`Resultado Encontrado\`\`\`  ╮

✿  *Título* : ${title}
✿  *Duración* : ${duration}
✿  *Vistas* : ${views.toLocaleString()}
✿  *Canal* : ${author.name}
✿  *Link* : ${videoUrl}

╰───────────────╯

📥 Opciones de Descarga:
`;

      await conn.sendMessage(msg.key.remoteJid, {
        image: { url: thumbnail },
        caption: videoInfo,
        footer: "by Niko 🧡",
        buttons: [
          {
            buttonId: `.playaudio ${videoUrl}`,
            buttonText: { displayText: "⇣ AUDIO MP3 ⇣" },
            type: 1
          },
          {
            buttonId: `.playvideo ${videoUrl}`,
            buttonText: { displayText: "⇣ VIDEO MP4 ⇣" },
            type: 1
          }
        ],
        headerType: 4,
        viewOnce: true,
      }, { quoted: msg });

      await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

    } catch (err) {
      console.error(err);
      conn.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error:\n\`\`\`${err.message}\`\`\`` }, { quoted: msg });
    }
  }

  if (command === "playaudio") {
    const videoUrl = args[0];
    await conn.sendMessage(msg.key.remoteJid, { text: `⏳ Preparando audio...` }, { quoted: msg });
    const apiRes = await ytdlaud(videoUrl);
    if (!apiRes.status) return conn.sendMessage(msg.key.remoteJid, { text: `❌ No se pudo obtener el audio.\nRazón: ${apiRes.message || "Desconocida"}` }, { quoted: msg });

    let thumbBuffer = null;
    try {
      const videoInfo = await yts(videoUrl);
      const thumbnail = videoInfo.videos[0].thumbnail;
      const buffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
      const img = await Jimp.read(buffer);
      img.resize(200, 150);
      thumbBuffer = await img.getBufferAsync(Jimp.MIME_JPEG);
    } catch {}

    await conn.sendMessage(msg.key.remoteJid, {
      document: { url: apiRes.url },
      mimetype: "audio/mpeg",
      fileName: `audio.mp3`,
      jpegThumbnail: thumbBuffer
    }, { quoted: msg });
  }

  if (command === "playvideo") {
    const videoUrl = args[0];
    await conn.sendMessage(msg.key.remoteJid, { text: `⏳ Preparando video...` }, { quoted: msg });
    const apiRes = await ytdlvid(videoUrl);
    if (!apiRes.status) return conn.sendMessage(msg.key.remoteJid, { text: `❌ No se pudo obtener el video.\nRazón: ${apiRes.message || "Desconocida"}` }, { quoted: msg });

    let thumbBuffer = null;
    try {
      const videoInfo = await yts(videoUrl);
      const thumbnail = videoInfo.videos[0].thumbnail;
      const buffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
      const img = await Jimp.read(buffer);
      img.resize(200, 150);
      thumbBuffer = await img.getBufferAsync(Jimp.MIME_JPEG);
    } catch {}

    await conn.sendMessage(msg.key.remoteJid, {
      document: { url: apiRes.url },
      mimetype: "video/mp4",
      fileName: `video.mp4`,
      jpegThumbnail: thumbBuffer
    }, { quoted: msg });
  }
};

module.exports.command = ["play", "playaudio", "playvideo"];
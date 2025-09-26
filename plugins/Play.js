const axios = require("axios");
const yts = require("yt-search");
const Jimp = require("jimp");
const { ytdlvid, ytdlaud } = require("../scraper/ytdl");

const pending = {};

module.exports = async (msg, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(msg.key.remoteJid, { text: "❌ Ingresa el nombre de la canción o el enlace de YouTube.\n\nEjemplo:\n.play Despacito" }, { quoted: msg });
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

˖✿  *Título* : ${title}
˖✿  *Duración* : ${duration}
˖✿  *Vistas* : ${views.toLocaleString()}
˖✿  *Canal* : ${author.name}
˖✿  *Link* : ${videoUrl}

╰───────────────╯

📥 Opciones de Descarga:
1️⃣ Audio MP3 (Documento)
2️⃣ Video MP4 (Documento)

> by Niko 🧡
`;

    const preview = await conn.sendMessage(msg.key.remoteJid, { image: { url: thumbnail }, caption: videoInfo }, { quoted: msg });
    pending[preview.key.id] = { chatId: msg.key.remoteJid, videoUrl, title, thumbnail, commandMsg: msg };
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });

    if (!conn._playListener) {
      conn._playListener = true;
      conn.ev.on("messages.upsert", async ev => {
        for (const m of ev.messages) {
          try {
            const context = m.message?.extendedTextMessage?.contextInfo;
            const cited = context?.stanzaId;
            const texto = (
              m.message?.conversation?.toLowerCase() ||
              m.message?.extendedTextMessage?.text?.toLowerCase() ||
              ""
            ).trim();

            const job = pending[cited];
            if (cited && job) {
              if (["1", "audio", "mp3"].includes(texto)) await sendAudio(job, m);
              else if (["2", "video", "mp4"].includes(texto)) await sendVideo(job, m);
              delete pending[cited];
            }
          } catch {}
        }
      });
    }

    async function sendAudio(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Preparando audio...` }, { quoted: quotedMsg });

      const apiRes = await ytdlaud(videoUrl);
      if (!apiRes.status) {
        return conn.sendMessage(chatId, { text: "No se pudo obtener el audio." }, { quoted: quotedMsg });
      }

      let editedThumbBuffer = null;
      try {
        const thumbBuffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      } catch {}

      await conn.sendMessage(chatId, {
        document: { url: apiRes.url },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });
    }

    async function sendVideo(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Preparando video...` }, { quoted: quotedMsg });

      const apiRes = await ytdlvid(videoUrl);
      if (!apiRes.status) {
        return conn.sendMessage(chatId, { text: "No se pudo obtener el video." }, { quoted: quotedMsg });
      }

      let editedThumbBuffer = null;
      try {
        const thumbBuffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      } catch {}

      await conn.sendMessage(chatId, {
        document: { url: apiRes.url },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });
    }

  } catch (err) {
    console.error(err);
    conn.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error:\n\`\`\`${err.message}\`\`\`` }, { quoted: msg });
  }
};

module.exports.command = ["play"];
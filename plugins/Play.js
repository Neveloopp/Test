const axios = require("axios");
const yts = require("yt-search");
const Jimp = require("jimp");

const pending = {};

module.exports = async (msg, { conn, text }) => {
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
    const { url: videoUrl, title, timestamp: duration, views, author, thumbnail, ago, description } = video;

    let editedThumbBuffer = null;
    try {
      const thumbBuffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
      const editedThumb = await Jimp.read(thumbBuffer);
      editedThumb.resize(200, 150);
      editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
    } catch {}

    const videoInfo = `
╭  \`\`\`Resultado Encontrado\`\`\`  ╮

˖✿  *Título* : ${title}
˖✿  *Duración* : ${duration}
˖✿  *Vistas* : ${views.toLocaleString()}
˖✿  *Canal* : ${author.name}
˖✿  *Publicado* : ${ago}
˖✿  *Link* : ${videoUrl}

╰───────────────╯

📥 Opciones de Descarga:
1️⃣ Audio MP3 (Documento)
2️⃣ Video MP4 (Documento)
3️⃣ Audio MP3 (Reproductor)
4️⃣ Video MP4 (Reproductor)

> by Niko 🧡
`;

    const preview = await conn.sendMessage(msg.key.remoteJid, { image: { url: thumbnail }, caption: videoInfo, jpegThumbnail: editedThumbBuffer }, { quoted: msg });
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
              if (["1", "audio", "mp3"].includes(texto)) await sendAudioDoc(job, m);
              else if (["2", "video", "mp4"].includes(texto)) await sendVideoDoc(job, m);
              else if (["3", "audio play"].includes(texto)) await sendAudioPlay(job, m);
              else if (["4", "video play"].includes(texto)) await sendVideoPlay(job, m);
              delete pending[cited];
            }
          } catch {}
        }
      });
    }

    async function sendAudioDoc(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Preparando audio...` }, { quoted: quotedMsg });
      const fileUrl = `https://api-nv.eliasaryt.pro/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}&type=audio&key=Neveloopp`;
      let editedThumbBuffer = null;
      try {
        const thumbBuffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      } catch {}
      await conn.sendMessage(chatId, {
        document: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });
    }

    async function sendVideoDoc(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Preparando video...` }, { quoted: quotedMsg });
      const fileUrl = `https://api-nv.eliasaryt.pro/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}&type=video&key=Neveloopp`;
      let editedThumbBuffer = null;
      try {
        const thumbBuffer = await axios.get(thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      } catch {}
      await conn.sendMessage(chatId, {
        document: { url: fileUrl },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });
    }

    async function sendAudioPlay(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Reproduciendo audio...` }, { quoted: quotedMsg });
      const fileUrl = `https://api-nv.eliasaryt.pro/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}&type=audio&key=Neveloopp`;
      await conn.sendMessage(chatId, {
        audio: { url: fileUrl },
        mimetype: "audio/mpeg",
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: quotedMsg });
    }

    async function sendVideoPlay(job, quotedMsg) {
      const { chatId, videoUrl, title, thumbnail } = job;
      await conn.sendMessage(chatId, { text: `⏳ Reproduciendo video...` }, { quoted: quotedMsg });
      const fileUrl = `https://api-nv.eliasaryt.pro/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}&type=video&key=Neveloopp`;
      await conn.sendMessage(chatId, {
        video: { url: fileUrl },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`
      }, { quoted: quotedMsg });
    }

  } catch (err) {
    console.error(err);
    conn.sendMessage(msg.key.remoteJid, { text: `Ocurrió un error:\n\`\`\`${err.message}\`\`\`` }, { quoted: msg });
  }
};

module.exports.command = ["play"];
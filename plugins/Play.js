const axios = require("axios");
const yts = require("yt-search");
const Jimp = require("jimp");

const pending = {};

module.exports = async (msg, { conn, text }) => {
  if (!text) return msg.reply("Ingresa el nombre de la canción o el enlace de YouTube.");

  try {
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

    const search = await yts(text);
    if (!search.videos.length) return msg.reply("No se encontraron resultados.");

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
1️⃣ Documento (MP4)
2️⃣ Video MP4 normal

> by Niko 🧡
`;

    const preview = await conn.sendMessage(msg.key.remoteJid, {
      image: { url: thumbnail },
      caption: videoInfo
    }, { quoted: msg });

    pending[preview.key.id] = { chatId: msg.key.remoteJid, videoUrl, title, commandMsg: msg };

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
            const chatId = m.key.remoteJid;

            if (cited && job) {
              if (["1", "documento", "doc"].includes(texto)) await sendVideo(job, true, m);
              else if (["2", "video", "mp4"].includes(texto)) await sendVideo(job, false, m);
            }
          } catch {}
        }
      });
    }

    async function sendVideo(job, asDocument, quotedMsg) {
      const { chatId, videoUrl, title } = job;

      await conn.sendMessage(chatId, { text: `⏳ Preparando video...` }, { quoted: quotedMsg });

      const apiURL = `https://neveloopp-api.vercel.app/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}`;
      const apiRes = await axios.get(apiURL);
      if (!apiRes.data?.url) return conn.sendMessage(chatId, { text: "No se pudo obtener el video." }, { quoted: quotedMsg });

      let editedThumbBuffer = null;
      try {
        const thumbBuffer = await axios.get(video.thumbnail, { responseType: "arraybuffer" }).then(r => r.data);
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      } catch {}

      await conn.sendMessage(chatId, {
        [asDocument ? "document" : "video"]: { url: apiRes.data.url },
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        caption: asDocument ? undefined : `🎬 Aquí tienes tu video`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });
    }

  } catch (err) {
    console.error(err);
    msg.reply(`Ocurrió un error:\n\`\`\`${err.stack}\`\`\``);
  }
};

module.exports.command = ["play"];
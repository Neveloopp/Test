const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const Jimp = require("jimp");
const { promisify } = require("util");
const { pipeline } = require("stream");
const streamPipe = promisify(pipeline);

const pending = {};

module.exports = async (msg, { conn, text }) => {
  if (!text) return m.reply("Ingresa el nombre de la canción o el enlace de YouTube.");

  try {
    await conn.sendMessage(msg.key.remoteJid, { react: { text: "⏳", key: msg.key } });

    const search = await yts(text);
    if (!search.videos.length) return m.reply("No se encontraron resultados.");

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

      await conn.sendMessage(chatId, { text: `⏳ Descargando video...` }, { quoted: quotedMsg });

      const apiURL = `https://neveloopp-api.vercel.app/api/dl/yt-direct?url=${encodeURIComponent(videoUrl)}`;
      const apiRes = await axios.get(apiURL);
      if (!apiRes.data?.url) return conn.sendMessage(chatId, { text: "No se pudo obtener el video." }, { quoted: quotedMsg });

      const tmpDir = path.join(__dirname, "../tmp");
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
      const filePath = path.join(tmpDir, `${Date.now()}_video.mp4`);

      const dl = await axios.get(apiRes.data.url, { responseType: "stream" });
      await streamPipe(dl.data, fs.createWriteStream(filePath));

      const thumbBuffer = await axios.get(video.thumbnail, { responseType: "arraybuffer" }).then(r => r.data).catch(() => null);
      let editedThumbBuffer = null;
      if (thumbBuffer) {
        const editedThumb = await Jimp.read(thumbBuffer);
        editedThumb.resize(200, 150);
        editedThumbBuffer = await editedThumb.getBufferAsync(Jimp.MIME_JPEG);
      }

      await conn.sendMessage(chatId, {
        [asDocument ? "document" : "video"]: fs.readFileSync(filePath),
        mimetype: "video/mp4",
        fileName: `${title}.mp4`,
        caption: asDocument ? undefined : `🎬 Aquí tienes tu video`,
        jpegThumbnail: editedThumbBuffer
      }, { quoted: quotedMsg });

      fs.unlinkSync(filePath);
    }

  } catch (err) {
    console.error(err);
    m.reply(`Ocurrió un error:\n\`\`\`${err.stack}\`\`\``);
  }
};

module.exports.command = ["play"];
const axios = require('axios');

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  await conn.sendMessage(chatId, {
    react: { text: '🔄', key: msg.key }
  });

  try {
    const res = await axios.get('https://api.waifu.pics/sfw/waifu');
    const imageUrl = res.data.url;

    await conn.sendMessage(chatId, {
      image: { url: imageUrl },
      caption: `_💖 ¡Aquí tienes tu Waifu, cortesía de Niko! 💖_\n\n` +
               `*✨ Disfrútala como se merece ✨*`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '✅', key: msg.key }
    });
  } catch (err) {
    console.error('❌ Error en comando waifu:', err);
    await conn.sendMessage(chatId, {
      text: `_❌ No se pudo invocar a tu Waifu en este momento._\n\n` +
            `*🔄 Inténtalo más tarde, Niko estará trabajando en ello.*`
    }, { quoted: msg });

    await conn.sendMessage(chatId, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['waifu'];
handler.tags = ['sfw'];
handler.help = ['waifu'];
handler.reaction = '🔄';

module.exports = handler;
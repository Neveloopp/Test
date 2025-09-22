const fs = require('fs');
const path = require('path');

const handler = async (msg, { conn, text, usedPrefix }) => {
const chatId = msg.key.remoteJid;

if (!chatId.endsWith('@g.us')) {
return conn.sendMessage(chatId, {
text: `_❌ Este comando solo puede usarse en grupos._`
}, { quoted: msg });
}

if (!text) {
return conn.sendMessage(chatId, {
text: `_⚡ Uso correcto del comando:_\n\n` +
`*📌 Ejemplo:* ${usedPrefix}setwelcome Bienvenido al grupo de *Niko* 🚀`
}, { quoted: msg });
}

try {
const metadata = await conn.groupMetadata(chatId);
const senderId = msg.key.participant || msg.key.remoteJid;
const senderClean = senderId.replace(/[^0-9]/g, '');
const participant = metadata.participants.find(p => p.id.includes(senderClean));
const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin';
const isOwner = global.owner.includes(senderClean);

if (!isAdmin && !isOwner) {
return conn.sendMessage(chatId, {
text: `_❌ Solo los administradores del grupo o el owner del bot pueden usar este comando._`
}, { quoted: msg });
}
} catch (e) {
console.error('❌ Error obteniendo metadata del grupo:', e);
return conn.sendMessage(chatId, {
text: `_❌ No se pudo verificar si eres administrador._`
}, { quoted: msg });
}

await conn.sendMessage(chatId, {
react: { text: '⏳', key: msg.key }
});

try {
const filePath = path.resolve('./welcome.json');

if (!fs.existsSync(filePath)) {
fs.writeFileSync(filePath, JSON.stringify({}, null, 2));
}

const welcomeData = JSON.parse(fs.readFileSync(filePath));
welcomeData[chatId] = text;
fs.writeFileSync(filePath, JSON.stringify(welcomeData, null, 2));

await conn.sendMessage(chatId, {
text: `_🚀 ¡Niko ha configurado un nuevo mensaje de bienvenida!_\n\n` +
`*📝 Mensaje guardado:*\n> ${text}\n\n` +
`*_✨ Ahora cada nuevo miembro verá este mensaje al entrar._*`
}, { quoted: msg });

await conn.sendMessage(chatId, {
react: { text: '✅', key: msg.key }
});

} catch (err) {
console.error('❌ Error guardando welcome.json:', err);

await conn.sendMessage(chatId, {
text: `_❌ Hubo un error al guardar el mensaje de bienvenida._`
}, { quoted: msg });

await conn.sendMessage(chatId, {
react: { text: '❌', key: msg.key }
});
}
};

handler.command = ['setwelcome'];
module.exports = handler;
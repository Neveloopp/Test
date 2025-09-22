const os = require('os');
const si = require('systeminformation');
const moment = require('moment-timezone');
const fetch = require('node-fetch');
const process = require('process');

const handler = async (msg, { conn }) => {
  const chatId = msg.key.remoteJid;

  await conn.sendMessage(chatId, {
    react: { text: '🧡', key: msg.key }
  });

  try {
    const osInfo = await si.osInfo();
    const mem = await si.mem();
    const cpu = await si.cpu();
    const disks = await si.fsSize();
    const uptime = moment.duration(os.uptime(), 'seconds').humanize();
    const cpuLoad = await si.currentLoad();
    let locationData = await fetch('http://ip-api.com/json');
    let location = await locationData.json();

    let cpuUsage = cpuLoad.cpus
      .map((core, i) => ` *◦ Core ${i + 1}* : ${core.load.toFixed(2)}%`)
      .join('\n');

    let message = `
╭  🧡 \`\`\`Check Server\`\`\` 🧡 ╮  

*◦ OS* : ${osInfo.distro} ${osInfo.release}  
*◦ RAM* : ${(mem.used / 1073741824).toFixed(2)} GB / ${(mem.total / 1073741824).toFixed(2)} GB  
*◦ CPU* : ${cpu.manufacturer} ${cpu.brand} ${cpu.speed}GHz  
*◦ Cores* : ${cpu.cores}  
*◦ Storage* : ${(disks.reduce((a, b) => a + b.size, 0) / 1073741824).toFixed(2)} GB  
*◦ Current Path* : ${process.cwd()}  
*◦ Country* : ${location.country}  
*◦ Country Code* : ${location.countryCode}  
*◦ Region* : ${location.region}  
*◦ Region Name* : ${location.regionName}  
*◦ City* : ${location.city}  
*◦ Latitude* : ${location.lat}  
*◦ Longitude* : ${location.lon}  
*◦ Timezone* : ${location.timezone}  
*◦ Uptime* : ${uptime}  

${cpuUsage}  
`;

    await conn.sendMessage(chatId, {
      text: message,
      linkPreview: true,
      contextInfo: {
        mentionedJid: [],
        forwardingScore: 0,
        isForwarded: false,
        remoteJid: null,
        externalAdReply: {
          title: 'ටᴘ┋Nikoㅤ!',
          body: null,
          mediaType: 1,
          previewType: 0,
          showAdAttribution: false,
          renderLargerThumbnail: true,
          thumbnailUrl: 'https://cdn.russellxz.click/a189053c.jpg',
        },
      },
    }, { quoted: msg });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(chatId, {
      text: '❌ Error retrieving system information.'
    }, { quoted: msg });
  }
};
handler.command = ['check', 'run', 'runtime'];
module.exports = handler;
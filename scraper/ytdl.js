const axios = require("axios");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const FormData = require("form-data");

async function waitForFile(url, attempts = 20, delay = 3000) {
  for (let i = 0; i < attempts; i++) {
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.data && res.data.fileUrl && res.data.fileUrl !== "In Processing...") {
      return res.data.fileUrl;
    }
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error("El archivo aún está procesándose");
}

async function fetchMedia(u) {
  const r = await axios.post(
    "https://ytdown.io/proxy.php",
    new URLSearchParams({ url: u }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0" } }
  );

  const d = r.data;
  if (!d.api || d.api.status !== "OK") throw new Error("API error: " + JSON.stringify(d));

  const items = d.api.mediaItems || [];
  if (!items.length) throw new Error("No se encontraron opciones");

  const best = items.sort((a, b) => {
    const getRes = x => {
      if (!x.mediaRes) return 0;
      const m = x.mediaRes.match(/(\d+)/);
      return m ? parseInt(m[1]) : 0;
    };
    return getRes(b) - getRes(a);
  })[0];

  const fileUrl = await waitForFile(best.mediaUrl);
  return fileUrl;
}

async function ytdlvid(u) {
  try {
    const fileUrl = await fetchMedia(u);
    return {
      status: true,
      creator: "neveloopp",
      url: fileUrl
    };
  } catch (err) {
    return {
      status: false,
      creator: "neveloopp",
      message: err.message
    };
  }
}

async function ytdlaud(u) {
  try {
    const videoUrl = await fetchMedia(u);
    const videoPath = `../tmp/input-${Date.now()}.mp4`;
    const output = `../tmp/${Date.now()}.mp3`;
    const writer = fs.createWriteStream(videoPath);

    const response = await axios.get(videoUrl, { responseType: "stream" });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(output)
        .audioCodec("libmp3lame")
        .format("mp3")
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    const form = new FormData();
    form.append("file", fs.createReadStream(output));
    form.append("expiry", 120);

    const upload = await axios.post("https://cdn.russellxz.click/upload.php", form, {
      headers: form.getHeaders()
    });

    if (!upload.data || !upload.data.url) throw new Error("Error al subir a Russell.");

    fs.unlinkSync(videoPath);
    fs.unlinkSync(output);

    return {
      status: true,
      creator: "neveloopp",
      url: upload.data.url
    };
  } catch (err) {
    return {
      status: false,
      creator: "neveloopp",
      message: err.message
    };
  }
}

module.exports = { ytdlvid, ytdlaud };
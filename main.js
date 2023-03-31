const torrentHandler = await import("./modules/torrent.js");
const encodingHandler = await import("./modules/encoding.js");

async function processRequest(options, id) {
  process[id] = {
    finished: false,
    error: false,
    step:"Not started",
    download: {
      running: false,
      success: false,
      progress: { progress: 0 },
    },
    encoding: {
      running: false,
      success: false,
      progress: { progress: 0 },
    },
  };

  await torrentHandler.downloadTorrent(options.torrent, id);
}

processRequest(
  {
    torrent: {
      input: "", //TORRENT PATH OR MAGNET URI
      allowSubtitles: false,
    },
    encoding: {
      resolutions: ["1280x720", "1920x1080", "640x480"],
      encodingOptions: ["-crf 15", "-tune film"],
      codec: "libx264",
      bypassParameters: {
        enabled: true,
        codecs: ["h264", "vp9"],
        maxBitRate: 4000000,
      },
    },
  },
  "test"
);

function logProgress(id) {
  let data = process[id];
  if(data.step == "Not started") {
  process.stdout.write(`[${id}] --> ${data.step}\r`);
  } else if(data.step == "Downloading") {
    process.stdout.write(`[${id}] --> ${data.step} | Progress: ${data.download.progress.progress.toFixed(3)}%, Eta: ${data.download.progress.eta.toFixed(3)}s, Speed:${(data.download.progress.downloadSpeed/1000).toFixed(3)}kb/s\r`);
  } else if(data.step == "Encoding") {
    process.stdout.write(`[${id}] --> ${data.step} | Progress: ${data.encoding.progress.percent.toFixed(4)}%, currentFPS: ${data.encoding.progress.currentFps}, Timemark:${data.encoding.progress.timemark}\r`);
  }
}

process.update = (id) => {
    logProgress(id);
}
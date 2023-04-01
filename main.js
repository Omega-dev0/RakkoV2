const torrentHandler = await import("./modules/torrent.js");
const encodingHandler = await import("./modules/encoding.js");
const path = await import("path");

process.settings = {
  temporaryFolder: "./temp",
  encodingTemporaryFolder: "./encodingTemp",
  allowedExtension: ["mp4", "webm", "mov", "avi", "flv", "js"],
};

async function processRequest(options, id) {
  process.workloads[id] = {
    finished: false,
    error: false,
    step: "Not started",
    download: {
      running: false,
      success: false,
      progress: { progress: 0 },
    },
    encoding: {
      running: false,
      success: false,
    },
  };

  await torrentHandler.downloadTorrent(options.torrent, id);
  console.log(`Download finished`);

  let elements = fs.readdirSync(process.settings.temporaryFolder);
  process.workloads[id].encodingFiles = {};

  for (let element of elements) {
    //FOR EACH VIDEO FILE
    if (process.settings.allowedExtensions.includes(element.split(".")[element.split(".").length - 1])) {
      let metadata = await encodingHandler.getMetadata(`${process.settings.temporaryFolder}/${element}`);
      if (bypassParameters.enabled == true && bypassParameters.codecs.includes(metadata.streams[0].codec_name) && metadata.streams[0].bit_rate <= bypassParameters.maxBitrate && metadata.streams[0].bit_rate <= bypassParameters.maxBitRate) {
        console.log(`Bypassing encoding for ${element}, codec: ${metadata.streams[0].codec_name}, bitrate: ${metadata.streams[0].bit_rate}`);
        //JUST RESIZING SO LATER
      } else {
        //LET'S START ENCODING
        process.workloads[id].encodingFiles[element] = {
          id: element,
          started: false,
        };
        await encodingHandler.encode(
          {
            file: path.resolve(`${process.settings.temporaryFolder}/${element}`),
            output: path.resolve(`${process.settings.encodingTemporaryFolder}/${element}`),
            options: options.encoding.encodingOptions,
            resolution: options.encoding.resolutions[0],
            codec: options.encoding.codec,
          },
          id,
          element
        );
      }
    }
  }
}

processRequest(
  {
    torrent: {
      input: "", //TORRENT PATH OR MAGNET URI
      allowSubtitles: false,
    },
    encoding: {
      resolutions: ["1920x1080", "1280x720", "640x480"],
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
  if (data.step == "Not started") {
    process.stdout.write(`[${id}] --> ${data.step}\r`);
  } else if (data.step == "Downloading") {
    process.stdout.write(`[${id}] --> ${data.step} | Progress: ${data.download.progress.progress.toFixed(3)}%, Eta: ${data.download.progress.eta.toFixed(3)}s, Speed:${(data.download.progress.downloadSpeed / 1000).toFixed(3)}kb/s\r`);
  } else if (data.step == "Encoding") {
    let progress = data.encoding.progress.progress;

    process.stdout.write(`[${id}]/[${fielId}] --> ${data.step} | Progress: ${progress.percent.toFixed(4)}%, currentFPS: ${progress.currentFps}, Timemark:${progress.timemark}\r`);
  }
}

process.update = (id) => {
  logProgress(id);
};

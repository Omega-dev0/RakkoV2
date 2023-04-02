const torrentHandler = await import("./modules/torrent.js");
const encodingHandler = await import("./modules/encoding.js");
const path = await import("path");
const fs = await import("fs");

process.settings = {
  temporaryFolder: "./temp",
  encodingTemporaryFolder: "./encodingTemp",
  encodingLogsTemporaryFolder: "./encodingLogs",
  allowedExtension: ["mp4", "webm", "mov", "avi", "flv", "js"],
};
process.workloads = {};

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

  /*
  process.workloads[id].step = "Downloading"
  await torrentHandler.downloadTorrent(options.torrent, id);
  */
  process.workloads[id].step = "Encoding";

  let elements = fs.readdirSync(process.settings.temporaryFolder);
  process.workloads[id].encodingFiles = {};

  for (let element of elements) {
    //FOR EACH VIDEO FILE
    if (process.settings.allowedExtension.includes(element.split(".")[element.split(".").length - 1])) {
      let metadata = await encodingHandler.getMetadata(`${process.settings.temporaryFolder}/${element}`);
      if (
        options.encoding.bypassParameters.enabled == true &&
        options.encoding.bypassParameters.codecs.includes(metadata.streams[0].codec_name) &&
        metadata.streams[0].bit_rate <= options.encoding.bypassParameters.maxBitrate &&
        metadata.streams[0].bit_rate <= options.encoding.bypassParameters.maxBitRate
      ) {
        console.log(`Bypassing encoding for ${element}, codec: ${metadata.streams[0].codec_name}, bitrate: ${metadata.streams[0].bit_rate}`);
        //JUST RESIZING SO LATER JUST MOVING THE FILE TO THE TEMPORARY FOLDER
        fs.rename(`${process.settings.temporaryFolder}/${element}`, `${process.settings.encodingTemporaryFolder}/${element}`);
      } else {
        //LET'S START ENCODING
        process.workloads[id].encodingFiles[element] = {
          id: element,
          started: false,
        };
        try {
        await encodingHandler.encode(
          {
            file: path.resolve(`${process.settings.temporaryFolder}/${element}`),
            output: path.resolve(`${process.settings.encodingTemporaryFolder}/${element}`),
            options: options.encoding.encodingOptions,
            codec: options.encoding.codec,
            maxBitrate: options.encoding.maxBitRate,
          },
          id,
          element
        );
        }catch(e){
          console.error("An error occured while encoding the file", element);
        }
      }
    }
  }

  console.log("================================")
  console.log("Encoding finished");
  process.workloads[id].step = "Splitting";
  process.update(id);
  //CLEAR TEMPORARY FOLDER

  //ENCODING FINISHED LET'S GET THE RESOLUTIONS
}

processRequest(
  {
    torrent: {
      input:
        "magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fcosmos-laundromat.torrent", //TORRENT PATH OR MAGNET URI
      allowSubtitles: false,
    },
    encoding: {
      resolutions: ["1920x1080", "1280x720", "640x480"],
      encodingOptions: [],
      codec: "libx264",
      maxBitRate: 4000000,
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
  let data = process.workloads[id];
 process.stdout.write("\u001b[2J\u001b[0;0H");
  if (data.step == "Not started") {
    process.stdout.write(`[${id}] --> ${data.step}\r`);
  } else if (data.step == "Downloading") {
    process.stdout.write(
      `[${id}] --> ${data.step} | Progress: ${(data.download.progress.progress * 100).toFixed(0)}%, Eta: ${(data.download.progress.eta / 1000).toFixed(0)}s, Speed:${(data.download.progress.downloadSpeed / 10e3).toFixed(
        0
      )}kb/s, Ratio:${data.download.progress.ratio.toFixed(4)}\r`
    );
  } else if (data.step == "Encoding") {
    let currentFile = Object.values(data.encodingFiles).filter((data) => {
      return data.stopped == false && data.started != false;
    });

    let currentProgress = currentFile[0].progress;
    process.stdout.write(`[${id}]/[${currentFile[0].id}](pass: ${currentFile[0].pass}) --> ${data.step} | Progress: ${currentProgress.percent.toFixed(2)}%, currentFPS: ${currentProgress.currentFps}\r`);
  } else if (data.step == "Splitting") {
  }
}

process.update = (id) => {
  logProgress(id);
};

const torrentHandler = await import("./modules/torrent.js");
const encodingHandler = await import("./modules/encoding.js");
const path = await import("path");
const fs = await import("fs");

process.settings = {
  temporaryFolder: "./temp",
  encodingTemporaryFolder: "./encodingTemp",
  encodingLogsTemporaryFolder: "./encodingLogs",
  versionsTemporaryFolder: "./versionsTemp",
  allowedExtension: ["mp4", "webm", "mov", "avi", "flv", "js"],
};
process.workloads = {};

async function processRequest(options, id, testFile) {

  console.log(id,testFile)

  process.workloads[id] = {
    finished: false,
    logging: options.logging,
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
  process.workloads[id].timeline = [];
  process.workloads[id].timeline.push({
    name: "Processing started",
    date: new Date(),
  });
  process.update(id)
  if (options.steps.download == true) {
    process.workloads[id].timeline.push({
      name: "Download started",
      date: new Date(),
    });
    if (testFile == true) {
      fs.copyFileSync(path.resolve("./Cosmos Laundromat2.mp4"),path.resolve(`./${process.settings.temporaryFolder}/Cosmos Laundromat2.mp4`));
    } else {
      process.workloads[id].step = "Downloading";
      await torrentHandler.downloadTorrent(options.torrent, id);
    }

    process.workloads[id].timeline.push({
      name: "Download finished",
      date: new Date(),
    });
  }

  //ENCODING

  if (options.steps.encoding == true) {
    process.workloads[id].step = "Encoding";
    process.workloads[id].timeline.push({
      name: "Encoding started",
      date: new Date(),
    });
    let elements = fs.readdirSync(process.settings.temporaryFolder);
    process.workloads[id].encodingFiles = {};
    for (let element of elements) {
      //FOR EACH VIDEO FILE
      if (process.settings.allowedExtension.includes(element.split(".")[element.split(".").length - 1])) {
        let metadata = await encodingHandler.getMetadata(`${process.settings.temporaryFolder}/${element}`);
        if (options.encoding.bypassParameters.enabled == true && options.encoding.bypassParameters.codecs.includes(metadata.streams[0].codec_name) && metadata.format.bit_rate <= options.encoding.bypassParameters.maxBitrate) {
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
          } catch (e) {
            console.error("An error occured while encoding the file", element);
          }
        }
      }
    }
    process.workloads[id].timeline.push({
      name: "Encoding finished",
      date: new Date(),
    });
  }

  if (options.steps.clean == true) {
    process.workloads[id].timeline.push({
      name: "Cleaning up temporary folders...",
      date: new Date(),
    });
    clear("./temp");
    clear("./encodingLogs");
  }

  //Uploading for each quality at the end of the split to save disk space
  if (options.steps.split == true) {
    process.workloads[id].timeline.push({
      name: "Splitting started",
      date: new Date(),
    });
    process.workloads[id].step = "Splitting";
    process.workloads[id].splittingFiles = {};
    const elements2 = fs.readdirSync(process.settings.encodingTemporaryFolder);
    for (let element of elements2) {
      process.workloads[id].splittingFiles[element] = {
        id: element,
        started: true,
        finished: false,
      };
      for (let index = 1; index < options.encoding.resolutions.length; index++) {
        let res = options.encoding.resolutions[index];
        try {
          process.workloads[id].splittingFiles[element][res] = {
            id: element,
            started: true,
            finished: false,
          };
          await encodingHandler.changeResolution(path.resolve(`${process.settings.encodingTemporaryFolder}/${element}`), path.resolve(`${process.settings.versionsTemporaryFolder}/${res}-${element}`), res, id, element);
          process.workloads[id].splittingFiles[element][res] = {
            id: element,
            started: true,
            finished: true,
          };
        } catch (e) {
          console.error("An error occured while splitting the file", element);
          process.workloads[id].splittingFiles[element][res] = {
            id: element,
            started: true,
            finished: true,
          };
        }
      }
      fs.renameSync(path.resolve(`${process.settings.encodingTemporaryFolder}/${element}`), path.resolve(`${process.settings.versionsTemporaryFolder}/${options.encoding.resolutions[0]}-${element}`));
      process.workloads[id].splittingFiles[element] = {
        id: element,
        started: true,
        finished: true,
      };
    }
  }


  //SEND THING TO SEND LINKS
  process.logMethod("Processing finished for order: " + id);
}

function clearFolder(directory) {
  fs.readdir(directory, (err, files) => {
    if (err) throw err;

    for (const file of files) {
      if (fs.statSync(path.join(directory, file)).isDirectory()) {
        clearFolder(path.join(directory, file));
      } else {
        fs.unlink(path.join(directory, file), (err) => {});
      }
    }
  });
}

function clear(directory) {
  clearFolder(directory);
  fs.readdir(directory, (err, files) => {
    for (const file of files) {
      try {
        if (fs.statSync(path.join(directory, file)).isDirectory()) {
          fs.rmdirSync(path.join(directory, file), { recursive: true });
        }
      } catch (e) {}
    }
  });
}

function logProgress(id) {
  if (process.workloads[id].logging == false) {
    return;
  }
  let data = process.workloads[id];
  //process.stdout.write("\u001b[2J\u001b[0;0H");
  if (data.step == "Not started") {
    process.logMethod(`[${id}] --> ${data.step}\r`);
  } else if (data.step == "Downloading") {
    pprocess.logMethod(
      `[${id}] --> ${data.step} | Progress: ${(data.download.progress.progress * 100).toFixed(0)}%, Eta: ${(data.download.progress.eta / 1000).toFixed(0)}s, Speed:${(data.download.progress.downloadSpeed / 10e3).toFixed(
        0
      )}kb/s, Ratio:${data.download.progress.ratio.toFixed(4)}\r`
    );
  } else if (data.step == "Encoding") {
    let currentFile = Object.values(data.encodingFiles).filter((data) => {
      return data.stopped == false && data.started != false;
    });

    let currentProgress = currentFile[0].progress;
    process.logMethod(`[${id}]/[${currentFile[0].id}](pass: ${currentFile[0].pass}) --> ${data.step} | Progress: ${currentProgress.percent.toFixed(2)}%, currentFPS: ${currentProgress.currentFps}\r`);
  } else if (data.step == "Splitting") {
    let currentFile = Object.values(data.splittingFiles).filter((data) => {
      return data.finished == false && data.started != false;
    });

    let currentRes = Object.values(currentFile[0]).filter((data) => {
      return data.finished == false && data.started != false;
    });
    let currentProgress = currentRes[0].progress;
    process.logMethod(`[${id}]/[${currentRes[0].id}](res: ${currentRes[0].res}) --> ${data.step} | Progress: ${currentProgress.percent.toFixed(2)}%, currentFPS: ${currentProgress.currentFps}\r`);
  }
}

process.update = (id) => {
  logProgress(id);
};
/*
processRequest(
  {
    logging:true,
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
    steps: {
      download: false,
      encoding: false,
      split: true,
      clean: true,
    },
  },
  "test"
);
*/

export { processRequest };

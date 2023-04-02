const WebTorrent = (await import("webtorrent")).default;
const fs = await import("fs");
const path = await import("path");

/*

{
    input:"<path> or <magnet>",
}
*/

function downloadTorrent(options, id) {
  return new Promise((resolve, reject) => {
    const client = new WebTorrent();
    let torrentLink = getTorrent(options.input);

    client.add(torrentLink, { path: process.settings.temporaryFolder }, (torrent) => {
      torrent.on("done", async () => {
        process.workloads[id].download.running = false;
        process.workloads[id].download.success = true;
        await cleanUpFiles({ path: process.settings.temporaryFolder, allowSubtitles: options.allowSubtitles });
        torrent.destroy(); //No seeding after we are done downloading
        resolve(id);
      });
      torrent.on("error", function (err) {
        process.workloads[id].error = err;
        process.workloads[id].finished = true;
        process.workloads[id].download.running = false;
        process.workloads[id].download.success = false;
        reject(err);
      });
      torrent.on("download", () => {
        process.workloads[id].download.progress = {
          eta: torrent.timeRemaining,
          received: torrent.received,
          downloaded: torrent.downloaded,
          downloadSpeed: torrent.downloadSpeed,
          progress: torrent.progress,
          ratio: torrent.ratio,
        };
        process.update(id);
      });
      process.workloads[id].download.success = false;
      process.workloads[id].download.running = true;
    });
  });
}

function getTorrent(input) {
  if (input.startsWith("magnet:?")) {
    return input;
  } else {
    return fs.readFileSync(input);
  }
}

function cleanUpFiles(options) {
  function timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return new Promise(async (resolve, reject) => {
    let allowedExtensions = process.settings.allowedExtension;
    if (options.allowSubtitles) {
      allowedExtensions.push("srt");
    }

    const getFilesRecursively = (directory) => {
      const filesInDirectory = fs.readdirSync(directory);
      for (const file of filesInDirectory) {
        const absolute = path.join(directory, file);
        if (fs.existsSync(absolute)) {
          if (fs.statSync(absolute).isDirectory()) {
            getFilesRecursively(absolute);
          } else {
            files.push(absolute.replaceAll("\\", "/"));
          }
        }
      }
      return files;
    };

    let files = [];
    let bin = []
    getFilesRecursively(options.path);
    for (let file of files) {
      if (!allowedExtensions.includes(file.split(".")[file.split(".").length - 1])) {
        bin.push(file)
      } else {
        fs.renameSync(file, options.path + "/" + file.split("/")[file.split("/").length - 1]);
      }
    }

    //cleaning up folders
    let elements = fs.readdirSync(options.path);
    for (let element of elements) {
      if (fs.existsSync(`${options.path}/${element}`)) {
        if (!element.includes(".")) {
          //fs.removeSync(`${options.path}/${element}`, { recursive: true});
        }
      }
    }

    resolve();
  });
}

export { downloadTorrent };

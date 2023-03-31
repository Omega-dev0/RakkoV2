const WebTorrent = (await import("webtorrent")).default;
const fs = await import("fs");
const path = await import("path");


const settings = {
  temporaryFolder: "./temp",
  allowedExtension:["mp4", "webm", "mov", "avi", "flv","js"]
};
/*

{
    input:"<path> or <magnet>",
}
*/

function downloadTorrent(options, id) {
  return new Promise((resolve, reject) => {
    const client = new WebTorrent();
    let torrentLink = getTorrent(options.input);

    client.add(torrentLink, { path: settings.temporaryFolder }, (torrent) => {
      torrent.on("done", async () => {
        process[id].download.running = false;
        process[id].download.success = true;
        await cleanUpFiles({ path: settings.temporaryFolder,allowSubtitles:options.allowSubtitles });
        torrent.destroy() //No seeding after we are done downloading
        resolve(id);
      });
      torrent.on("error", function (err) {
        process[id].error = err;
        process[id].finished = true;
        process[id].download.running = false;
        process[id].download.success = false;
        reject(err);
      });
      torrent.on("download", () => {
        process[id].download.progress = {
          eta: torrent.timeRemaining,
          received: torrent.received,
          downloaded: torrent.downloaded,
          downloadSpeed: torrent.downloadSpeed,
          progress: torrent.progress,
          ratio: torrent.ratio,
        };
        process.update(id)
      });
      process[id].download.success = false;
      process[id].download.running = true;
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
  return new Promise((resolve, reject) => {
    let allowedExtensions = settings.allowedExtension
    if(options.allowSubtitles){
        allowedExtensions.push("srt");
    }

    const getFilesRecursively = (directory) => {
      const filesInDirectory = fs.readdirSync(directory);
      for (const file of filesInDirectory) {
        const absolute = path.join(directory, file);
        if (fs.statSync(absolute).isDirectory()) {
          getFilesRecursively(absolute);
        } else {
          files.push(absolute.replaceAll('\\', '/'));
        }
      }
      return files;
    };

    let files = [];
    getFilesRecursively(options.path);
    files.forEach(file => {
        if(!allowedExtensions.includes(file.split('.')[file.split('.').length - 1])){
            fs.unlinkSync(file);
        }else{
            fs.renameSync(file,options.path+"/"+file.split("/")[file.split("/").length - 1]);
        }
    })
    //cleaning up folders
    let elements = fs.readdirSync(options.path);
    for (let element of elements) {
        if(fs.statSync(`${options.path}/${element}`).isDirectory()){
            fs.rmSync(`${options.path}/${element}`, { recursive: true, force: true });
        };
    }

    resolve()
  });
}

export { downloadTorrent };
const ffmpeg = (await import("fluent-ffmpeg")).default;
const fs = await import("fs");

//WINDOWS ONLY
ffmpeg.setFfmpegPath("./bin/ffmpeg.exe");
ffmpeg.setFfprobePath("./bin/ffprobe.exe");

/*
{
    file:<absolute path>,
    output:<absolute path> 
    options:parameters <string>, 
    resolution:res <string>, 
    codec: <string>
}
*/
async function encode(options, id, fileid) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(options.file)
      .videoCodec(options.codec)
      .outputOptions(["-pass", "1", "-passlogfile", `${process.settings.encodingLogsTemporaryFolder}/${id}-${fileid.split(".")[0].replaceAll(" ", "_")}`])
      .videoBitrate(options.maxBitrate / 1000);

    cmd.on("progress", function (progress) {
      process.workloads[id].encodingFiles[fileid] = {
        progress: progress,
        id: fileid,
        stopped: false,
        error: null,
        pass: 1,
      };
      process.update(id);
    });
    cmd.on("error", function (err, stdout, stderr) {
      process.workloads[id].encodingFiles[fileid] = {
        progress: process.workloads[id].encodingFiles[fileid].progress,
        id: fileid,
        stopped: true,
        error: err,
        pass: 1,
      };
      reject({
        error: err,
        stdout: stdout,
        stderr: stderr,
        id: id,
        pass: 1,
      });
    });
    cmd.on("end", function (stdout, stderr) {
      process.workloads[id].encodingFiles[fileid] = {
        progress: process.workloads[id].encodingFiles[fileid].progress,
        id: fileid,
        stopped: true,
        error: null,
        pass: 1,
      };
      let cmd2 = ffmpeg(options.file)
        .videoCodec(options.codec)
        .outputOptions(["-pass", "2", "-passlogfile", `${process.settings.encodingLogsTemporaryFolder}/${id}-${fileid.split(".")[0].replaceAll(" ", "_")}`])
        .videoBitrate(options.maxBitrate / 1000);
      cmd2.on("progress", function (progress) {
        process.workloads[id].encodingFiles[fileid] = {
          progress: progress,
          id: fileid,
          stopped: false,
          error: null,
          pass: 2,
        };
        process.update(id);
      });
      cmd2.on("error", function (err, stdout, stderr) {
        process.workloads[id].encodingFiles[fileid] = {
          progress: process.workloads[id].encodingFiles[fileid].progress,
          id: fileid,
          stopped: true,
          error: err,
          pass: 2,
        };
        reject({
          error: err,
          stdout: stdout,
          stderr: stderr,
          id: id,
          pass: 2,
        });
      });
      cmd2.on("end", function (stdout, stderr) {
        process.workloads[id].encodingFiles[fileid] = {
          progress: process.workloads[id].encodingFiles[fileid].progress,
          id: fileid,
          stopped: true,
          error: null,
          pass: 2,
        };
        resolve(id);
      });

      cmd2.save(options.output);
    });

    cmd.save(options.output);
  });
}

async function getMetadata(path) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, function (err, metadata) {
      resolve(metadata);
    });
  });
}

async function changeResolution(path,output, res, id, fileid) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(path).size(res); //ffmpeg -i input.mp4 -vf scale=$w:$h <encoding-parameters> output.mp4
    cmd.on("progress", function (progress) {
      process.workloads[id].splittingFiles[fileid][res] = {
        progress: progress,
        id: fileid,
        stopped: false,
        error: null,
        res:res
      };
      process.update(id);
    });
    cmd.on("error", function (err, stdout, stderr) {
      process.workloads[id].splittingFiles[fileid][res] = {
        progress: process.workloads[id].splittingFiles[fileid][res].progress,
        id: fileid,
        stopped: true,
        error: err,
        res:res
      };
      reject({
        error: err,
        stdout: stdout,
        stderr: stderr,
        id: id,
      });
    });
    cmd.on("end", function (stdout, stderr) {
      process.workloads[id].encodingFiles[fileid][res] = {
        progress: process.workloads[id].splittingFiles[fileid][res].progress,
        id: fileid,
        stopped: true,
        error: null,
        res:res
      };
      resolve(id);
    });

    cmd.save(output);
  });
}

export { encode, getMetadata, changeResolution };

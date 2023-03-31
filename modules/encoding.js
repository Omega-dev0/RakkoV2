const ffmpeg = (await import("fluent-ffmpeg")).default;
const fs = await import("fs");

/*
{
    file:<absolute path>,
    output:<absolute path> 
    options:parameters <string>, 
    resolution:res <string>, 
    codec: <string>
}
*/
async function encode(options, id) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(options.file).autopad().size(options.resolution).videoCodec(options.codec).outputOptions(options.options);

    cmd.on("progress", function (progress) {
      process[id].encoding.progress = progress;
      process[id].encoding.running = true;
      process[id].encoding.success = false;
      process.update(id)
    });
    cmd.on("error", function (err, stdout, stderr) {
      process[id].error = err;
      process[id].finished = true;
      process[id].encoding.running = false;
      process[id].encoding.success = false;
      reject(process[id]);
    });
    cmd.on("end", function (stdout, stderr) {
      process[id].encoding.progress = {
        percent: 100,
      };
      process[id].encoding.running = false;
      process[id].encoding.success = true;
      resolve(process[id]);
    });

    cmd.save(options.output);
  });
}

async function probe(path) {
  ffmpeg.ffprobe(path, function (err, metadata) {
    return metadata;
  });
}

export { encode, probe };

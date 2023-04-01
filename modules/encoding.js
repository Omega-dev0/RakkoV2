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
async function encode(options, id, fileid) {
  return new Promise((resolve, reject) => {
    let cmd = ffmpeg(options.file).autopad().size(options.resolution).videoCodec(options.codec).outputOptions(options.options);

    cmd.on("progress", function (progress) {
      process.workloads[id].encodingFiles[fileid] = {
        progress:progress,
        id:fileid,
        stopped:false,
        error:null
      }
      process.update(id);
    });
    cmd.on("error", function (err, stdout, stderr) {
      process.workloads[id].encodingFiles[fileid] = {
        progress:process.workloads[id].encodingFiles[fileid].progress,
        id:fileid,
        stopped:true,
        error:err
      }
      reject(id);
    });
    cmd.on("end", function (stdout, stderr) {
      process.workloads[id].encodingFiles[fileid] = {
        progress:process.workloads[id].encodingFiles[fileid].progress,
        id:fileid,
        stopped:true,
        error:null
      }
      resolve(id);
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

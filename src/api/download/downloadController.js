'use strict'
const fs = require('fs')

const log = require('../../services/logService')

const DOWNLOADS_PATH = __dirname + '/../../../downloads/'

function getInfo(req, res) {
  const filename = req.params.file
  const filepath = DOWNLOADS_PATH + filename

  fs.lstat(filepath, (err, stats) => {
    if (err) {
      return void res.sendStatus(404)
    }
    res.json({
      size: stats.size,
      mtime: stats.mtime
    })
  })
}

function getFile(req, res) {

  const filename = req.params.file
  const filepath = DOWNLOADS_PATH + filename

  res.download(filepath, filename, err => {
    if (err) {
      log.error(`file download failed: ${filename}, error: ${err.message}`, req.user)
    } else {
      log.info(`file ${filename} downloaded successfully`, req.user)
    }
  })
}

module.exports = {
  getInfo,
  getFile
}

import * as fs from 'fs'
import {Request, Response} from 'express'

const log = require('../../services/logService')

const DOWNLOADS_PATH = __dirname + '/../../../downloads/'

export function getInfo(req: Request, res: Response) {
  const filename = req.params.file
  const filePath = DOWNLOADS_PATH + filename

  fs.lstat(filePath, (err, stats) => {
    if (err) {
      return void res.sendStatus(404)
    }
    res.json({
      size: stats.size,
      mtime: stats.mtime
    })
  })
}

export function getFile(req: Request, res: Response) {

  const filename = req.params.file
  const filePath = DOWNLOADS_PATH + filename

  res.download(filePath, filename, err => {
    if (err) {
      log.error(`file download failed: ${filename}, error: ${err.message}`, req.user)
    } else {
      log.info(`file ${filename} downloaded successfully`, req.user)
    }
  })
}

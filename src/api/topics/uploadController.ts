'use strict'

import { Form } from 'multiparty'
import * as fs from 'fs'
import * as util from 'util'
import * as path from 'path'
import { Dictionary } from 'lodash'
import { Request, Response } from 'express'

import TopicModel, { TopicDocument } from './topicModel'
import * as articleLoader from '../article/articleLoader'
import * as dictLoader from '../search/dictLoader'
const log = require('../../services/logService')
import TaskQueue from '../../components/utils/taskQueue'

const readFile = util.promisify(fs.readFile)
const unlink = util.promisify(fs.unlink)

const CONCURRENCY = 2
const taskQueue = new TaskQueue(CONCURRENCY)

interface ContentLoaderData {
  props: Dictionary<string>
  payload: {}
}

interface ContentLoader {
  createData: (topic: TopicDocument, payload: {}) => Promise<void>
  removeData: (topic: TopicDocument) => Promise<void>
  parseFile: (content: string, fileName: string) => ContentLoaderData
}

function getLoader(originalFilename: string): ContentLoader {
  if (/\.dict\.json$/.test(originalFilename)) {
    return dictLoader
  }
  if (/\.md$/.test(originalFilename)) {
    return articleLoader
  }
  throw new Error('unsupported file extension')
}

async function updateTopic(props: Dictionary<string>) {
  const { fileName } = props
  let topic = await TopicModel.findOne({ fileName }).exec()
  if (topic) {
    delete topic.targetLang
    delete topic.baseLang
    delete topic.title
    delete topic.sortIndex
    delete topic.subtitle
    delete topic.author
    delete topic.copyright
    delete topic.publisher
    delete topic.publicationDate
    delete topic.isbn
  } else {
    topic = new TopicModel()
  }
  Object.assign(topic, props)
  topic.lastModified = new Date()
  return topic.save()
}

function importFile(filePath: string, originalFilename: string) {
  if (!/(.+)\.(.+)\./.test(originalFilename)) {
    throw new Error(`ill-formed filename: ${originalFilename}`)
  }

  const loader = getLoader(originalFilename)
  return readFile(filePath, 'utf-8')
    .then(content => {
      const { props, payload } = loader.parseFile(content, originalFilename)
      return TopicModel.findOne({ fileName: originalFilename })
        .then(oldTopic => {
          return loader.removeData(oldTopic)
        })
        .then(() => updateTopic(props))
        .then(topic => loader.createData(topic, payload))
    })
}

export function removeTopic(req: Request, res: Response) {
  const { fileName } = req.params
  TopicModel.findOne({ fileName }).exec()
    .then(topic => {
      if (topic) {
        const loader = topic.type === 'dict' ? dictLoader : articleLoader
        return loader.removeData(topic)
          .then(() => res.sendStatus(204))
      } else {
        res.sendStatus(404)
      }
    })
    .catch(err => res.status(500).send(err.message))
}

export function uploadFile(req: Request, res: Response) {
  const formParse = (form: Form) => {
    return new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          return reject(err)
        }
        resolve(files.file[0])
      })
    })
  }

  try {
    const uploadDir = path.join(__dirname, '../../../upload')
    const form = new Form({
      uploadDir: uploadDir,
      maxFilesSize: 10 * 1024 * 1024
    })
    formParse(form)
      .then(file => {
        taskQueue.pushTask(() => importFileTask(req, res, file))
      })
  } catch (err) {
    const status = err.message.indexOf('maxFilesSize') !== -1 ? 413 : 400
    res.writeHead(status, { 'content-type': 'text/plain', connection: 'close' })
    const response = status === 413 ? 'Request Entity Too Large' : 'Bad Request'
    res.end(response)
  }
}

function importFileTask(req: Request, res: Response, file: any) {
  return importFile(file.path, file.originalFilename)
    .then(() => {
      log.info(`file '${file.originalFilename}' uploaded successfully`, req.user)
      res.json({ fileName: file.originalFilename })

    })
    .catch(err => {
      let message
      if (err.name === 'ValidationError') {
        message = err.toString()
      } else {
        message = err.message
      }
      log.error(
        `error uploading file '${file.originalFilename}': ${message}`,
        req.user
      )
      res.status(400).send(
        JSON.stringify({
          fileName: file.originalFilename,
          message: message
        })
      )
    })
    .then(() => unlink(file.path))
    .catch(err => {
      console.log(`unlink failed: {err.message`)
    })
}

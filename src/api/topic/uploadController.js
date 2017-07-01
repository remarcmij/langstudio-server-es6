'use strict'

const multiparty = require('multiparty')
const fs = require('fs')
const util = require('util')
const path = require('path')

const TopicModel = require('./topicModel')
const articleLoader = require('../article/articleLoader')
const dictLoader = require('../search/dictLoader')
const log = require('../../services/logService')
const TaskQueue = require('../../components/utils/taskQueue')

const readFile = util.promisify(fs.readFile)
const unlink = util.promisify(fs.unlink)

const CONCURRENCY = 2
const taskQueue = new TaskQueue(CONCURRENCY)

function getLoader(originalFilename) {
  if (/\.dict\.json$/.test(originalFilename)) {
    return dictLoader
  }
  if (/\.md$/.test(originalFilename)) {
    return articleLoader
  }
  throw new Error('unsupported file extension')
}

async function updateTopic(props) {
  const { fileName } = props
  let topic = await TopicModel.findOne({ fileName }).exec()
  if (topic) {
    delete topic.targetLang
    delete topic.baseLang
    delete topic.part
    delete topic.title
    delete topic.sortIndex
    delete topic.subtitle
    delete topic.author
    delete topic.copyright
    delete topic.publisher
    delete topic.pubDate
    delete topic.isbn
  } else {
    topic = new TopicModel()
  }
  Object.assign(topic, props)
  topic.lastModified = Date.now()
  return topic.save()
}

async function importFile(filePath, originalFilename) {
  if (!/(.+)\.(.+)\./.test(originalFilename)) {
    throw new Error(`ill-formed filename: ${originalFilename}`)
  }

  const loader = getLoader(originalFilename)
  const content = await readFile(filePath, 'utf-8')
  const { props, payload } = loader.parseFile(content, originalFilename)
  const oldTopic = await TopicModel.findOne({ fileName: originalFilename })
  if (oldTopic) {
    await loader.removeData(oldTopic)
  }
  const topic = await updateTopic(props)
  await loader.createData(topic, payload)
}

async function removeTopic(req, res) {
  try {
    const { fileName } = req.params
    const topic = await TopicModel.findOne({ fileName }).exec()
    const loader = topic.type === 'dict' ? dictLoader : articleLoader
    await topic ? loader.removeData(topic) : Promise.resolve()
    await TopicModel.remove({ _id: topic._id }).exec()
    res.sendStatus(204)
  }
  catch (err) {
    res.status(404).send(err.message)
  }
}

async function uploadFile(req, res) {

  const formParse = form => {
    return new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) { return reject(err) }
        resolve(files.file[0])
      })
    })
  }

  try {
    const uploadDir = path.join(__dirname, '../../../upload')
    const form = new multiparty.Form({ uploadDir: uploadDir, maxFilesSize: 10 * 1024 * 1024 })
    const file = await formParse(form)
    taskQueue.pushTask(() => importFileTask(req, res, file))
  }
  catch (err) {
    const status = err.message.indexOf('maxFilesSize') !== -1 ? 413 : 400
    res.writeHead(status, { 'content-type': 'text/plain', connection: 'close' })
    const response = status === 413 ? 'Request Entity Too Large' : 'Bad Request'
    res.end(response)
  }
}

async function importFileTask(req, res, file) {
  try {
    await importFile(file.path, file.originalFilename)
    log.info(`file '${file.originalFilename}' uploaded successfully`, req.user)
    res.json({ fileName: file.originalFilename })
  }
  catch (err) {
    let message
    if (err.name === 'ValidationError') {
      message = err.toString()
    } else {
      message = err.message
    }
    log.error(`error uploading file '${file.originalFilename}': ${message}`, req.user)
    res.status(400).send(JSON.stringify({
      fileName: file.originalFilename,
      message: message
    }))
  }
  finally {
    try {
      await unlink(file.path)
    }
    catch (err) {
      console.log('unlink failed')
    }
  }
}

module.exports = {
  removeTopic,
  uploadFile
}

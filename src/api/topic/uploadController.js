'use strict'

const _ = require('lodash')
const multiparty = require('multiparty')
const fs = require('fs')
const path = require('path')
const PubSub = require('pubsub-js')

const TopicModel = require('./topicModel')
const articleLoader = require('../article/articleLoader')
const dictLoader = require('../search/dictLoader')
const log = require('../../services/logService')
const TaskQueue = require('../../components/utils/taskQueue')
const AppConstants = require('../../config/appConstants')

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

function updateTopic(data) {

  return Promise.resolve(TopicModel.findOne({ fileName: data.topic.fileName }).exec())
    .then(topic => {
      // create a new Topic if no existing one found
      if (topic) {
        topic.groupName = 'public'
        topic.foreignLang = undefined
        topic.baseLang = undefined
        topic.part = undefined
        topic.title = undefined
        topic.sortIndex = undefined
        topic.subtitle = undefined
        topic.author = undefined
        topic.copyright = undefined
        topic.publisher = undefined
        topic.pubDate = undefined
        topic.isbn = undefined
        topic.hash = undefined
      } else {
        topic = new TopicModel()
      }

      _.assign(topic, data.topic)

      topic.lastModified = Date.now()

      return new Promise((resolve, reject) => {
        topic.save((err, savedTopic) => {
          if (err) {
            reject(err)
          } else {
            resolve(savedTopic)
          }
        })
      })
    })
}

function createData(loader, topic, data) {
  return loader.createData(topic, data)
}

function importFile(filePath, originalFilename) {

  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, content) => {
      if (err) {
        reject(err)
      } else {
        resolve(content)
      }
    })
  }).then(content => {
    const loader = getLoader(originalFilename)
    const uploadData = loader.parseFile(content, originalFilename)

    return TopicModel.findOne({ fileName: originalFilename })
      .then(topic => loader.removeData(topic))
      .then(() => updateTopic(uploadData))
      .then(updatedTopic => createData(loader, updatedTopic, uploadData))

  })

}

function removeTopic(req, res) {
  const fileName = req.params.filename

  Promise.resolve(TopicModel.findOne({ fileName }).exec())
    .then(topic => {
      const loader = topic.type === 'dict' ? dictLoader : articleLoader

      return loader.removeData(topic)
        .then(() => {
          return Promise.resolve(TopicModel.remove({ _id: topic._id }).exec())
        })
        .then(() => {
          res.status(200).end()
        })
    })
    .catch(err => {
      res.status(404).send(err.message)
    })
}

function uploadFile(req, res) {
  new Promise((resolve, reject) => {
    const uploadDir = path.join(__dirname, '../../../upload')
    const form = new multiparty.Form({ uploadDir: uploadDir, maxFilesSize: 10 * 1024 * 1024 })
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err)
      } else {
        resolve(files.file[0])
      }
    })
  }).then(file => {
    taskQueue.pushTask(() => {
      return importFile(file.path, file.originalFilename)
        .then(() => {
          log.info(`file '${file.originalFilename}' uploaded succesfully`, req.user)
          PubSub.publish(AppConstants.INVALIDATE_CACHES, null)
          res.json({ fileName: file.originalFilename })
        })
        .catch(err => {
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
        })
        .then(() => {
          fs.unlinkSync(file.path)
        })
    })
  }).catch(err => {
    const status = err.message.indexOf('maxFilesSize') !== -1 ? 413 : 400
    res.writeHead(status, { 'content-type': 'text/plain', connection: 'close' })
    const response = status === 413 ? 'Request Entity Too Large' : 'Bad Request'
    res.end(response)

  })
}

module.exports = {
  removeTopic,
  uploadFile
}

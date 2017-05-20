'use strict'
const _ = require('lodash')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const search = require('../search/search')
const log = require('../../services/logService')

const REBUILD_DELAY = 10000  // 10 secs
const debouncedRebuildWordCollection = _.debounce(rebuildWordCollection, REBUILD_DELAY)

function createData(topic, uploadData) {
  const collection = LemmaModel.collection
  const bulk = collection.initializeUnorderedBulkOp()
  const json = uploadData.payload

  for (const lemmaDef of uploadData.payload.lemmas) {
    for (const wordDef of lemmaDef.words) {
      bulk.insert({
        baseWord: lemmaDef.base,
        homonym: lemmaDef.homonym,
        text: lemmaDef.text,
        word: wordDef.word,
        attr: wordDef.attr,
        order: wordDef.order,
        lang: wordDef.lang,
        baseLang: json.baseLang,
        groupName: uploadData.topic.groupName,
        _topic: topic._id
      })
    }
  }

  return new Promise((resolve, reject) => {
    bulk.execute(err => {
      if (err) {
        reject(err)
      } else {
        debouncedRebuildWordCollection()
        resolve()
      }
    })
  })
}

function removeData(topic) {
  if (topic) {
    return Promise.resolve(LemmaModel.remove({ _topic: topic._id }).exec())
  }
  return Promise.resolve()
}

function parseFile(content, fileName) {
  const data= JSON.parse(content)

  const match = fileName.match(/(.+)\.(.+)\./)
  if (!match) {
    throw new Error(`ill-formed filename: ${fileName}`)
  }

  return {
    topic: {
      fileName: fileName,
      type: 'dict',
      groupName: data.groupName
    },
    payload: data
  }
}

function rebuildWordCollection() {
  const collection = WordModel.collection
  WordModel.remove({})
    .then(() => {
      return LemmaModel.distinct('lang')
    })
    .then(languages => {
      const promises = languages.map(lang => {
        return LemmaModel.distinct('word', { lang })
          .then(words => {
            return { lang, words }
          })
      })
      return Promise.all(promises)
    })
    .then(results => {

      search.clearAutoCompleteCache()

      const bulk = collection.initializeUnorderedBulkOp()

      results.forEach(result => result.words.reduce((acc, word) => {
        acc.insert({ word, lang: result.lang })
        return acc
      }, bulk))

      bulk.execute(err => {
        if (err) {
          log.error(`auto-complete collection bulk insert error: ${err.message}`)
        } else {
          log.info(`auto-complete collection rebuilt`)
        }
      })
    })
}

module.exports = {
  createData,
  removeData,
  parseFile
}


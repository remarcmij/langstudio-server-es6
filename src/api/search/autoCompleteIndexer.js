'use strict'
const _ = require('lodash')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')
const search = require('../search/search')

const REBUILD_DELAY = 20000  // 20 secs

async function rebuildForLang(lang) {
  const lemmaWords = await LemmaModel.distinct('word', { lang }).exec()
  const paraWords = await ParagraphModel.distinct('word', { wordLang: lang }).exec()
  return new Set([...lemmaWords, ...paraWords])
}

async function rebuildAutoCompleteCollection() {
  try {
    await WordModel.remove({}).exec()
    const lemmaLangs = await LemmaModel.distinct('lang').exec()
    const paraLangs = await ParagraphModel.distinct('wordLang').exec()
    const langs = _.uniq([...lemmaLangs, ...paraLangs])

    const promises = langs.map(async function (lang) {
      const wordSet = await rebuildForLang(lang)
      return { lang, wordSet }
    })
    const results = await Promise.all(promises)

    const bulkOps = results.reduce((acc, result) => {
      const { lang, wordSet } = result
      const ops = [...wordSet].map(word => ({
        insertOne: { document: { word, lang } }
      }))
      return [...acc, ...ops]
    }, [])
    await WordModel.collection.bulkWrite(bulkOps)

    search.clearAutoCompleteCache()
    log.info(`auto-complete collection rebuilt`)
  }
  catch (err) {
    log.error(`Error rebuilding auto-complete collection: ${err.message}`)
  }
}

module.exports = _.debounce(rebuildAutoCompleteCollection, REBUILD_DELAY)

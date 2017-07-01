'use strict'
const _ = require('lodash')
const util = require('util')

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
    const languages = _.uniq([...lemmaLangs, ...paraLangs])

    const promises = languages.map(async (lang) => {
      const wordSet = await rebuildForLang(lang)
      return { lang, wordSet }
    })
    const results = await Promise.all(promises)

    const bulk = results.reduce((bulk, { wordSet, lang }) => {
      wordSet.forEach(word => bulk.insert({ word, lang }))
      return bulk
    }, WordModel.collection.initializeUnorderedBulkOp())

    if (bulk.length > 0) {
      const bulkExecute = util.promisify(bulk.execute.bind(bulk))
      await bulkExecute()
      search.clearAutoCompleteCache()
      log.info(`auto-complete collection rebuilt`)
    }
  }
  catch ({ message }) {
    log.error(`Error rebuilding auto-complete collection: ${message}`)
  }
}

module.exports = _.debounce(rebuildAutoCompleteCollection, REBUILD_DELAY)

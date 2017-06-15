'use strict'
const _ = require('lodash')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')
const search = require('../search/search')

const REBUILD_DELAY = 20000  // 20 secs

function rebuildAutoCompleteCollection() {
  WordModel.remove({})
    .then(() => LemmaModel.distinct('lang'))
    .then(languages => {
      return ParagraphModel.distinct('wordLang')
        .then(wordLanguages => _.uniq([...languages, ...wordLanguages]))
    })
    .then(languages => {
      const promises = languages.map(lang => {
        return LemmaModel.distinct('word', { lang })
          .then(words => {
            const wordSet = new Set(words)
            return ParagraphModel.distinct('word', {wordLang: lang})
            .then(words => {
              for (const word of words) {
                wordSet.add(word)
              }
              return {lang, wordSet}
            })
          })
      })
      return Promise.all(promises)
    })
    .then(results => {
      const ops = results.reduce((acc, result) => {
        result.wordSet.forEach(word => {
          acc.push({
            insertOne: {
              document: {
                word,
                lang: result.lang
              }
            }
          })
        })
        return acc
      }, [])
      return WordModel.collection.bulkWrite(ops)
    })
    .then(() => {
      search.clearAutoCompleteCache()
      log.info(`auto-complete collection rebuilt`)
    })
}

module.exports = _.debounce(rebuildAutoCompleteCollection, REBUILD_DELAY)

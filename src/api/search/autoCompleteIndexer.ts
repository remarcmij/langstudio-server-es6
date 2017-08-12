import * as _ from 'lodash'
import * as util from 'util'

import LemmaModel from './lemmaModel'
import WordModel from './wordModel'
import ParagraphModel from '../article/paragraphModel'
import { UnorderedBulkOperation } from 'mongodb'
const log = require('../../services/logService')
const search = require('../search/search')

const REBUILD_DELAY = 20000 // 20 secs

interface WordSet {
  lang: string
  wordSet: Set<string>
}

function prepareWordSet(lang: string) {
  return LemmaModel.distinct('word', { lang }).exec()
    .then((lemmaWords: string[]) =>
      ParagraphModel.distinct('word', { wordLang: lang }).exec()
        .then((paraWords: string[]) => new Set([...lemmaWords, ...paraWords]))
    )
}

const prepareWordSets = (languages: string[]) =>
  _.chain(languages)
    .uniq()
    .map(lang => prepareWordSet(lang)
      .then(wordSet => ({ lang, wordSet }))
    )
    .value()

const prepareBulk = (results: WordSet[]) => results.reduce((bulk, { wordSet, lang }) => {
  wordSet.forEach(word => bulk.insert({ word, lang }))
  return bulk
}, WordModel.collection.initializeUnorderedBulkOp())

const bulkExecute = (bulk: UnorderedBulkOperation) => {
  const execute = util.promisify(bulk.execute.bind(bulk))
  return execute()
    .then(() => {
      search.clearAutoCompleteCache()
      log.info(`auto-complete collection rebuilt`)
    })
}

function rebuildAutoCompleteCollection() {
  return WordModel.remove({}).exec()
    .then(() => LemmaModel.distinct('lang').exec())
    .then((lemmaLangs: string[]) => {
      return ParagraphModel.distinct('wordLang').exec()
        .then((paraLangs: string[]) => {
          const promises = prepareWordSets([...lemmaLangs, ...paraLangs])
          return Promise.all(promises)
        })
        .then(results => {
          const bulk = prepareBulk(results)
          if (bulk.length > 0) {
            return bulkExecute(bulk)
          }
        })
    })
}

export default _.debounce(rebuildAutoCompleteCollection, REBUILD_DELAY)

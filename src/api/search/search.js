'use strict'
const fp = require('lodash/fp')
const LRU = require('lru-cache')
const XRegExp = require('xregexp')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const VALID_AUTOCOMPLETE_TEXT = XRegExp('^[-\'()\\p{L}]+$')
const CHUNK_SIZE = 50

const autoCompleteCache = LRU({
  max: 500,
  maxAge: 1000 * 60 * 60
})

async function dictSearch(req, res) {

  const { query, user } = req
  const { word, lang, attr, chunk = 0 } = query
  const words = word.split(',')

  const searchFunctions = words.map(word => {
    return docs => {
      // return the result if something found from
      // previous promise
      if (docs && docs.length !== 0) {
        return docs
      }

      const attrCondition = attr === 'k' ? { attr } : {}
      const condition = auth.addUserGroupsToQueryCondition(user,
        Object.assign({ word, lang }, attrCondition),
      )

      return execSearch(condition, +chunk)
    }
  })

  let lookupPromise = Promise.resolve([])

  searchFunctions.forEach(lookupFunction => {
    lookupPromise = lookupPromise.then(lookupFunction)
  })

  // handle result of final promise
  try {
    const docs = await lookupPromise
    const haveMore = docs.length === CHUNK_SIZE
    const lemmas = fp.uniqBy(doc => doc.text)(docs)
    res.json({ lemmas, haveMore })
  }
  catch (err) {
    log.error(`search: '${req.params.word}', error: ${err.message}`, user)
    res.status(500).send(err.message)
  }
}

function execSearch(condition, chunk) {

  let query = LemmaModel
    .find(condition)
    .sort('word order')

  if (chunk !== -1) {
    query = query
      .skip(CHUNK_SIZE * (chunk || 0))
      .limit(CHUNK_SIZE)
  }

  return query
    .lean()
    .exec()
}

async function autoCompleteSearch(req, res) {
  const term = req.query.term.trim()

  if (term.length === 0 || !VALID_AUTOCOMPLETE_TEXT.test(term)) {
    return void res.json([])
  }

  const cachedResult = autoCompleteCache.get(term)
  if (cachedResult) {
    log.silly(`cache hit for '${term}'`)
    return res.json(cachedResult.items)
  }

  try {
    const items = await WordModel.find({ word: { $regex: '^' + term } })
      .select('-_id')
      .limit(10)
      .lean()
      .exec()
    autoCompleteCache.set(term, { term, items })
    log.silly(`cache store for '${term}'`)
    res.json(items)
  }
  catch (err) {
    res.sendStatus(500)
  }
}

function clearAutoCompleteCache() {
  autoCompleteCache.reset()
}

module.exports = {
  dictSearch,
  autoCompleteSearch,
  clearAutoCompleteCache
}

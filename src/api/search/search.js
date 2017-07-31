'use strict'
const fp = require('lodash/fp')
const LRU = require('lru-cache')
const XRegExp = require('xregexp')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const VALID_AUTOCOMPLETE_TEXT = XRegExp("^[-'()\\p{L}]+$")
const CHUNK_SIZE = 50

const wordLangCondition = (word, lang) => condition => ({
  word,
  lang,
  ...condition
})
const attrCondition = attr => condition =>
  attr ? { attr, ...condition } : { ...condition }
const uniqByHash = fp.uniqBy(doc => doc.hash)

const autoCompleteCache = LRU({
  max: 500,
  maxAge: 1000 * 60 * 60
})

function searchFirstMatching(words, callback) {
  const handleSuccess = word => docs =>
    docs.length > 0 ? docs : callback(word)
  const reducer = (promise, word) => promise.then(handleSuccess(word))
  const initialPromise = Promise.resolve([])
  return fp.reduce(reducer, initialPromise)(words)
}

async function dictSearch(req, res) {
  const { query, user } = req
  const { word, lang, attr, chunk = 0 } = query
  const words = word.split(',')

  const searchWord = word => {
    const condition = fp.flow(
      wordLangCondition(word, lang),
      attrCondition(attr),
      auth.userGroupsCondition(user)
    )({})
    return execSearch(condition, +chunk)
  }

  try {
    const docs = await searchFirstMatching(words, searchWord)
    const haveMore = docs.length === CHUNK_SIZE
    const lemmas = uniqByHash(docs)
    res.json({ lemmas, haveMore })
  } catch ({ message }) {
    log.error(`search: '${req.params.word}', error: ${message}`, user)
    res.status(500).send(message)
  }
}

function execSearch(condition, chunk) {
  let query = LemmaModel.find(condition).sort('word order')

  if (chunk !== -1) {
    query = query.skip(CHUNK_SIZE * (chunk || 0)).limit(CHUNK_SIZE)
  }

  return query.lean().exec()
}

async function autoCompleteSearch(req, res) {
  let { term } = req.query
  term = term.trim()

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
      .sort('word')
      .select('-_id')
      .limit(10)
      .lean()
      .exec()
    autoCompleteCache.set(term, { term, items })
    log.silly(`cache store for '${term}'`)
    res.json(items)
  } catch ({ message }) {
    res.sendStatus(500).send(message)
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

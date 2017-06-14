'use strict'
const _ = require('lodash')
const LRU = require('lru-cache')
const XRegExp = require('xregexp')

const LemmaModel = require('./lemmaModel')
const WordModel = require('./wordModel')
const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const VALID_AUTOCOMPLETE_TEXT = XRegExp('^[-\'()\\p{L}]+$')
const CHUNK_SIZE = 50

const autoCompleteCache = LRU({
  max: 500,
  maxAge: 1000 * 60 * 60
})

async function paraSearch(req, res) {
  const term = req.query.term

  try {
    const chunk = parseInt(req.query.chunk || '0', 10)

    const condition = {
      word: { $regex: '^' + term }
    }

    const groups = auth.getGroupsForUser(req.user)
    if (groups) {
      condition.groupName = { $in: groups }
    }

    const docs = await ParagraphModel
      .find(condition)
      .skip(CHUNK_SIZE * (chunk || 0))
      .limit(CHUNK_SIZE)
      .lean()
      .exec()

    const haveMore = docs.length === CHUNK_SIZE
    const paragraphs = _.uniqBy(docs, doc => doc._topic)
    res.json({ paragraphs, haveMore })
  }
  catch (err) {
    log.error(`search: '${term}', error: ${err.message}`, req.user)
    res.status(500).send(err.message)
  }
}

async function dictSearch(req, res) {
  const words = req.query.word.split(',')

  const groups = auth.getGroupsForUser(req.user)

  const searchFunctions = words.map(word => {
    return docs => {
      // return the result if something found from
      // previous promise
      if (docs && docs.length !== 0) {
        return docs
      }
      // return promise for next iteration
      const searchRequest = {
        word: word,
        attr: req.query.attr,
        chunk: parseInt(req.query.chunk || '0', 10),
        lang: req.query.lang,
        groups: groups
      }
      return doSearch(searchRequest)
    }
  })

  let lookupPromise = Promise.resolve([])

  searchFunctions.forEach(lookupFunction => {
    lookupPromise = lookupPromise.then(lookupFunction)
  })

  // handle result of final promise
  lookupPromise
    .then(docs => {
      const haveMore = docs.length === CHUNK_SIZE
      const lemmas = _.uniqBy(docs, doc => doc.text)
      res.json({ lemmas, haveMore })
    })
    .catch(err => {
      log.error(`search: '${req.params.word}', error: ${err.message}`, req.user)
      res.status(500).send(err.message)
    })
}

function doSearch(sr) {

  const condition = {
    word: sr.word,
  }

  if (sr.attr === 'k') {
    condition.attr = 'k'
  }

  if (sr.lang) {
    condition.lang = sr.lang
  }

  if (sr.groups) {
    condition.groupName = { $in: sr.groups }
  }

  let query = LemmaModel
    .find(condition)
    .sort('word order')

  if (sr.chunk !== -1) {
    query = query.skip(CHUNK_SIZE * (sr.chunk || 0)).limit(CHUNK_SIZE)
  }

  return query.lean().exec()
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
  paraSearch,
  dictSearch,
  autoCompleteSearch,
  clearAutoCompleteCache
}

import * as _ from 'lodash'
import LRU = require('lru-cache')
import XRegExp = require('xregexp')
import { Request, Response } from 'express'

import LemmaModel, { Lemma, LemmaAttr } from './lemmaModel'
import { User } from '../user/userModel'
import WordModel, { WordLangPair } from './wordModel'
const log = require('../../services/logService')
import * as auth from '../../auth/authService'

const VALID_AUTOCOMPLETE_TEXT = XRegExp("^[-'()\\p{L}]+$")
const CHUNK_SIZE = 50

const wordLangCondition = (word: string, lang: string) => (condition: {}) => ({
  word,
  lang,
  ...condition
})

const attrCondition = (attr: LemmaAttr) => (condition: {}) =>
  attr ? { attr, ...condition } : { ...condition }
const uniqByHash = (docs: Lemma[]) => _.uniqBy(docs, doc => doc.hash)

interface AutoCompleteCacheNode {
  term: string
  items: WordLangPair[]
}

const autoCompleteCache = LRU<AutoCompleteCacheNode>({
  max: 500,
  maxAge: 1000 * 60 * 60
})

const searchWord = (query: any, user: User) => (word: string) => {
  const { lang, attr, chunk = 0 }: { lang: string, attr: LemmaAttr, chunk: number } = query

  const condition = _.flow(
    wordLangCondition(word, lang),
    attrCondition(attr),
    auth.userGroupsCondition(user)
  )({})
  return execSearch(condition, +chunk)
}

function searchFirstMatching(words: string[], nextPromise: (word: string) => Promise<Lemma[]>) {
  return words.reduce((promise, word) =>
    promise.then((docs: Lemma[]) =>
      docs.length > 0 ? docs : nextPromise(word))
    , Promise.resolve<Lemma[]>([]))
}

export function dictSearch(req: Request, res: Response) {
  const word: string = req.query.word
  const words = word.split(',')

  searchFirstMatching(words, searchWord(req.query, req.user))
    .then(docs => {
      const haveMore = docs.length === CHUNK_SIZE
      const lemmas = uniqByHash(docs)
      res.json({ lemmas, haveMore })

    }).catch(err => {
      log.error(`search: '${req.params.word}', error: ${err.message}`, req.user)
      res.status(500).send(err.message)
    })
}

function execSearch(condition: {}, chunk: number) {
  let query = LemmaModel.find(condition).sort('word order')

  if (chunk !== -1) {
    query = query.skip(CHUNK_SIZE * (chunk || 0)).limit(CHUNK_SIZE)
  }

  return query.exec()
}

export function autoCompleteSearch(req: Request, res: Response) {
  const term: string = req.query.term.trim()

  if (term.length === 0 || !VALID_AUTOCOMPLETE_TEXT.test(term)) {
    return void res.json([])
  }

  const cachedResult = autoCompleteCache.get(term)
  if (cachedResult) {
    log.silly(`cache hit for '${term}'`)
    return res.json(cachedResult.items)
  }

  WordModel.find({ word: { $regex: '^' + term } })
    .sort('word')
    .select('-_id')
    .limit(10)
    .exec()
    .then(items => {
      autoCompleteCache.set(term, { term, items })
      log.silly(`cache store for '${term}'`)
      res.json(items)
    })
    .catch(err => res.sendStatus(500).send(err.message))
}

export function clearAutoCompleteCache() {
  autoCompleteCache.reset()
}

import * as _ from 'lodash'
import { Request, Response } from 'express'

import ParagraphModel, { Paragraph } from '../article/paragraphModel'
const log = require('../../services/logService')
import * as auth from '../../auth/authService'

const CHUNK_SIZE = 50

const uniqByTopic = (docs: Paragraph[]) => _.uniqBy(docs, doc => doc._topic)
const wordLangCondition = (word: string, lang: string) => (condition: {}) => ({
  word,
  wordLang: lang,
  ...condition
})

export function search(req: Request, res: Response) {
  const { query, user } = req
  const { word, lang, chunk = 0 } = query

  const condition = _.flow(
    wordLangCondition(word, lang),
    auth.userGroupsCondition(user)
  )({})

  return ParagraphModel.find(condition)
    .skip(CHUNK_SIZE * +chunk)
    .limit(CHUNK_SIZE)
    .exec()
    .then(docs => {
      const haveMore = docs.length === CHUNK_SIZE
      const paragraphs = uniqByTopic(docs)
      res.json({ paragraphs, haveMore })
    })
    .catch(err => {
      log.error(`search: '${word}', error: ${err.message}`, user)
      res.status(500).send(err.message)
    })
}

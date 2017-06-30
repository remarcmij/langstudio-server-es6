'use strict'
const fp = require('lodash/fp')

const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const CHUNK_SIZE = 50

const uniqByTopic = fp.uniqBy(doc => doc._topic)
const wordLangCondition = (word, lang) => condition => Object.assign({}, condition, { word, wordLang: lang })

async function search(req, res) {
  const { query, user } = req
  const { word, lang, chunk = 0 } = query

  try {
    const condition = fp.flow(
      wordLangCondition(word, lang),
      auth.userGroupsCondition(user)
    )({})

    const docs = await ParagraphModel
      .find(condition)
      .skip(CHUNK_SIZE * (+chunk))
      .limit(CHUNK_SIZE)
      .lean()
      .exec()

    const haveMore = docs.length === CHUNK_SIZE
    const paragraphs = uniqByTopic(docs)
    res.json({ paragraphs, haveMore })
  }
  catch (err) {
    log.error(`search: '${word}', error: ${err.message}`, user)
    res.status(500).send(err.message)
  }
}

module.exports = {
  search
}

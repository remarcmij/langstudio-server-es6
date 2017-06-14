'use strict'
const _ = require('lodash')

const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const CHUNK_SIZE = 50

function search(req, res) {
  const condition = { word: req.query.word, wordLang: req.query.lang }
  const chunk = parseInt(req.query.chunk || '0', 10)

  const groups = auth.getGroupsForUser(req.user)

  if (groups) {
    condition.groupName = { $in: groups }
  }

  ParagraphModel
    .find(condition)
    .skip(CHUNK_SIZE * (chunk || 0))
    .limit(CHUNK_SIZE)
    .lean()
    .exec()
    .then(docs => {
      const haveMore = docs.length === CHUNK_SIZE
      const paragraphs = _.uniqBy(docs, doc => doc._topic)
      res.json({ paragraphs, haveMore })
    })
    .catch(err => {
      log.error(`search: '${req.query.word}', error: ${err.message}`, req.user)
      res.status(500).send(err.message)
    })
}

module.exports = {
  search
}

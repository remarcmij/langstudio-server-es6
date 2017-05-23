'use strict'
const _ = require('lodash')

const ParagraphModel = require('../article/paragraphModel')
const log = require('../../services/logService')

const CHUNK_SIZE = 50

function search(req, res) {
  const term = req.query.term
  const chunk = parseInt(req.query.chunk || '0', 10)

  let groups

  if (req.user) {
    if (req.user.role !== 'admin') {
      groups = req.user.groups
    }
  } else {
    groups = ['public']
  }

  const condition = {
    word: { $regex: '^' + term }
  }

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
      log.error(`search: '${term}', error: ${err.message}`, req)
      res.status(500).send(err.message)
    })
}

module.exports = {
  search
}

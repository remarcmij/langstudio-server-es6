'use strict'
const ArticleModel = require('./articleModel')
const log = require('../../services/logService')

const CONTENT_MARKER_REGEXP = /<!-- flashcard -->|<!-- translate-start -->/
const PUBLIC_GROUPS = ['public']

async function getArticle(req, res) {

  try {
    const article = await ArticleModel.findOne({ fileName: req.params.filename })
      .populate('_topic')
      .lean()
      .exec()

    // no need to send original text if it doesn't data
    // required by the client
    if (!CONTENT_MARKER_REGEXP.test(article.mdText)) {
      article.mdText = ''
    }

    const groups = req.user ? [...req.user.groups, ...PUBLIC_GROUPS] : PUBLIC_GROUPS
    const isAdmin = req.user && req.user.role === 'admin'

    if (!isAdmin && groups.indexOf(article.groupName) === -1) {
      log.warn(`access denied: ${article.fileName}`, req.user)
      return res.sendStatus(401)
    }
    res.json(article)
  }
  catch (err) {
    log.error(`get article error ${err.message}`, req.user)
    res.status(500).send(err.message)
  }
}

module.exports = {
  getArticle
}

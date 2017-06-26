'use strict'
const ArticleModel = require('./articleModel')
const log = require('../../services/logService')

const CONTENT_MARKER_REGEXP = /<!-- flashcard -->/
const PUBLIC_GROUPS = ['public']

async function getArticle(req, res) {
  const { user, params } = req

  try {
    const article = await ArticleModel.findOne({ fileName: params.filename })
      .populate('_topic')
      .lean()
      .exec()

    // no need to send original text if it doesn't data
    // required by the client
    if (!CONTENT_MARKER_REGEXP.test(article.mdText)) {
      article.mdText = ''
    }

    const groups = user ? [...user.groups, ...PUBLIC_GROUPS] : PUBLIC_GROUPS
    const isAdmin = user && user.role === 'admin'

    if (!isAdmin && groups.indexOf(article.groupName) === -1) {
      log.warn(`access denied: ${article.fileName}`, user)
      return res.sendStatus(401)
    }
    res.json(article)
  }
  catch (err) {
    log.error(`get article error ${err.message}`, user)
    res.status(500).send(err.message)
  }
}

module.exports = {
  getArticle
}

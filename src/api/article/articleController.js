'use strict'
const ArticleModel = require('./articleModel')
const log = require('../../services/logService')

const flashCardMarker = /<!-- flashcard -->/

async function getArticle(req, res) {
  const { user, params } = req
  const { filename: fileName } = params

  try {
    const article = await ArticleModel.findOne({ fileName })
      .populate('_topic')
      .lean()
      .exec()

    // no need to send markdown text if it doesn't data
    // required by the client
    if (!flashCardMarker.test(article.rawBody)) {
      article.rawBody = ''
    }

    const groups = user ? [...user.groups, 'public'] : ['public']
    const isAdmin = user && user.role === 'admin'

    if (!isAdmin && groups.indexOf(article.groupName) === -1) {
      log.warn(`access denied: ${article.fileName}`, user)
      return res.sendStatus(401)
    }
    res.json(article)
  } catch (err) {
    log.error(`get article error ${err.message}`, user)
    res.status(500).send(err.message)
  }
}

module.exports = {
  getArticle
}

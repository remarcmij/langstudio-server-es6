'use strict'
const _ = require('lodash')
const XRegExp = require('xregexp')
const ArticleModel = require('./articleModel')
const log = require('../../services/logService')
const languageService = require('../../services/languageService')
const markdownService = require('../../services/markdownService')

const VALID_HIGHLIGHT_FRASE_REGEXP = XRegExp("^[-\\s'()\\p{L}.?!]+$")
const CONTENT_MARKER_REGEXP = /<!-- flashcard -->|<!-- translate-start -->/

const PUBLIC_GROUPS = ['public']

function getArticle(req, res) {

  ArticleModel.findOne({ fileName: req.params.filename })
    .select('-indexText')
    .lean()
    .then(article => {
      const highlightPhrase = req.query.q

      if (highlightPhrase) {
        // convert as a once-off including highlighting
        const highlightText = highlightSearchText(article.mdText, highlightPhrase)
        article.htmlText = markdownService.convertMarkdown(highlightText, true)
      }

      // no need to send original text if it doesn't data
      // required by the client
      if (!CONTENT_MARKER_REGEXP.test(article.mdText)) {
        article.mdText = ''
      }

      log.info(`fetched article ${article.fileName}`, req)

      sendIfAuthorized(req, res, article)

    })
    .catch(err => {
      log.error(`get article error ${err.message}`, req)
      res.status(500).send(err.message)
    })
}

function highlightSearchText(htmlIn, phrase) {

  const isPhrase = /^".+"$/.test(phrase)

  // remove any enclosing quotes
  phrase = phrase.replace(/^"(.+?)"$/, '$1')

  // return input "as is" if highlight phrase is interspersed within
  // with special characters

  if (!VALID_HIGHLIGHT_FRASE_REGEXP.test(phrase)) {
    return htmlIn
  }

  const terms = isPhrase ? [phrase] : phrase.split(' ')

  let htmlOut = htmlIn

  for (const term of terms) {

    // note: use negative look-ahead to prevent highlighting text
    // within an HTML anchor id
    const pattern = isPhrase ? term : languageService.makePattern(term)
    const regexp = new RegExp(String.raw`\b(_*${pattern}_*)\b`, 'gi')
    let index = 0
    let startpos = 0
    let endpos
    let fragment
    htmlOut = ''

    let match = regexp.exec(htmlIn)
    while (match) {
      fragment = match[0]
      endpos = regexp.lastIndex - fragment.length
      htmlOut += htmlIn.slice(startpos, endpos)
      startpos = regexp.lastIndex
      index += 1
      htmlOut += `<a id="highlight-${index}"><span class="hr-highlight hr-highlight-on">${match[1]}</span></a>`
      match = regexp.exec(htmlIn)
    }
    htmlOut += htmlIn.slice(startpos)
    htmlIn = htmlOut
  }

  return htmlOut
}

function sendIfAuthorized(req, res, articleData) {
  const groups = req.user ? req.user.groups.concat(PUBLIC_GROUPS) : PUBLIC_GROUPS
  const isAdmin = req.user && req.user.role === 'admin'

  if (isAdmin || groups.indexOf(articleData.groupName) !== -1) {
    // allow browser to cache for a year (with cache busting in place)
    res.append('Cache-Control', 'private, max-age=31536000')
    res.json(articleData)
  } else {
    log.warn(`access denied: ${articleData.fileName}`, req)
    res.sendStatus(401)
  }
}

function searchArticles(req, res) {

  let phrase = req.query.q.trim()
  if (!phrase.startsWith('"')) {
    phrase = phrase.replace(/([-'\w]+)/g, '"$1"')
  }

  const condition = {
    $text: {
      $search: phrase
    }
  }

  const groups = getGroups(req.user)

  if (groups) {
    condition.groupName = { $in: groups }
  }

  Promise.resolve(ArticleModel
    .find(condition, { _topic: 1 })
    .populate('_topic')
    .lean())
    .then(docs => {
      res.json(docs)
    })
    .catch(() => {
      res.sendStatus(500)
    })
}

function getGroups(user) {
  let groups = []

  if (user) {
    if (user.role !== 'admin') {
      groups = user.groups
      groups = _.uniq(groups.concat(PUBLIC_GROUPS))
    }
  } else {
    groups = PUBLIC_GROUPS
  }

  return groups
}

module.exports = {
  getArticle,
  searchArticles
}

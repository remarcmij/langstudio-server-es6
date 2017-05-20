'use strict'
const _ = require('lodash')
const md5 = require('md5')
const XRegExp = require('xregexp')

const ArticleModel = require('./articleModel')
const ParagraphModel = require('./paragraphModel')
const markDownService = require('../../services/markdownService')
const headerParser = require('../../cli/headerParser')

const WORD_REGEXP = XRegExp(String.raw`#?[-'\p{L}]{2,}`, 'g')

function createData(topic, data) {
  const article = data.payload
  article._topic = topic._id

  let indexText = article.mdText

  // strip off header section from index text
  const match = indexText.match(/<\/section>/)
  if (match) {
    indexText = indexText.slice(match.index + match[0].length)
  }

  // remove all html tags from index text
  indexText = indexText.replace(/<.+?>/g, '')
  article.indexText = indexText

  return ArticleModel.create(article)
    .then(() => bulkLoadParagraphs(article, topic))
}

function bulkLoadParagraphs(article, topic) {
  const ops = article.paragraphs.reduce((acc, paragraph) => {
    paragraph.words.forEach(word => {
      acc.push({
        insertOne: {
          document: {
            word: word.word,
            wordLang: word.lang,
            content: paragraph.content,
            baseLang: topic.baseLang,
            targetLang: topic.foreignLang,
            groupName: topic.groupName,
            _topic: topic._id
          }
        }
      })
    })
    return acc
  }, [])

  if (ops.length === 0) {
    return Promise.resolve()
  }

  return ParagraphModel.collection.bulkWrite(ops)
}

function removeData(topic) {
  if (!topic) {
    return Promise.resolve()
  }

  return ArticleModel.remove({ _topic: topic._id }).exec()
    .then(() => ParagraphModel.remove({ _topic: topic._id }))
}

function parseFile(content, fileName) {

  let match = fileName.match(/(.+)\.(.+)\./)
  if (!match) {
    throw new Error(`ill-formed filename: ${fileName}`)
  }
  const publication = match[1]
  const chapter = match[2]

  const header = headerParser.parseHeader(content)

  let title = header.get('title')

  if (!title) {
    const h1RegExp = /^# *([^#][^\n]+)/m
    match = content.match(h1RegExp)
    if (match) {
      title = match[1]
    }
  }

  let subtitle = header.get('subtitle')

  if (!subtitle && chapter !== 'index') {
    const h2RegExp = /^##\s+(.*)$/gm
    subtitle = ''
    match = h2RegExp.exec(content)

    while (match) {
      if (subtitle.length > 0) {
        subtitle += ' • '
      }
      subtitle += match[1]
      match = h2RegExp.exec(content)
    }
  }

  const topic = {
    type: 'article',
    fileName,
    publication,
    chapter,
    foreignLang: header.get('targetLang'),
    baseLang: header.get('baseLang'),
    groupName: header.get('groupName') || 'public',
    sortIndex: parseInt(header.get('sortOrder') || '0', 10),
    title,
    subtitle,
    author: header.get('author'),
    copyright: header.get('copyright'),
    publisher: header.get('publisher'),
    pubDate: header.get('publicationDate'),
    isbn: header.get('isbn')
  }

  const article = {
    fileName,
    groupName: topic.groupName,
    title: topic.title || 'untitled',
    mdText: content
  }

  topic.hash = md5(JSON.stringify({ topic, article }))

  article.paragraphs = extractParagraphs(content, topic.baseLang, topic.foreignLang)

  article.htmlText = markDownService.convertMarkdown(content, header.get('foreign-text') === 'true')

  return {
    topic: topic,
    payload: article
  }
}

function extractParagraphs(content, baseLang, targetLang) {
  const paragraphs = []

  const lines = content.split('\n')
  const iterator = lines[Symbol.iterator]()
  let item = iterator.next()

  while (!item.done) {
    let line = item.value.trim()
    item = iterator.next()

    while (line.length === 0 && !item.done) {
      line = item.value.trim()
      item = iterator.next()
    }

    if (/^<!--|^#/.test(line)) {
      continue
    }

    let content = removeLinePrefixIfAny(line)

    while (!item.done) {
      line = item.value.trim()
      item = iterator.next()
      if (line.length === 0) {
        break
      }
      content += '\n' + removeLinePrefixIfAny(line)
    }

    let words = []
    if (containsTargetLangFragment(content)) {
      words = extractAllWords(content, baseLang, targetLang)
      paragraphs.push({ content, words })
    }
  }

  return paragraphs
}

function extractAllWords(paragraph, baseLang, targetLang) {
  const targetRegExp = /\*\*(.+?)\*\*|\*(.+?)\*/g
  let baseBuffer = ''
  let targetBuffer = ''
  let startPos = 0
  let endPos
  let match = targetRegExp.exec(paragraph)

  while (match) {
    let targetFragment
    if (match[1]) {
      targetFragment = match[1]
    } else {
      targetFragment = match[2]
    }
    endPos = targetRegExp.lastIndex - match[0].length
    baseBuffer += paragraph.substring(startPos, endPos)
    startPos = targetRegExp.lastIndex
    targetBuffer += targetFragment + ' '
    match = targetRegExp.exec(paragraph)
  }
  baseBuffer += paragraph.substring(startPos)

  baseBuffer = baseBuffer.replace(/\n/g, ' ')
  targetBuffer = targetBuffer.replace(/\n/g, ' ')

  return extractWords(baseBuffer, baseLang)
    .concat(extractWords(targetBuffer, targetLang))
}

function extractWords(buffer, lang) {
  let words = buffer.match(WORD_REGEXP) || []
  words = _.uniq(words.map(word => word.toLowerCase()))
  return words.map(word => ({ word, lang }))
}

function containsTargetLangFragment(text) {
  return /\*\*.+?\*\*|\*.+?\*/g.test(text)
}

function removeLinePrefixIfAny(line) {
  const match = line.match(/^(?:[-<*]\s)(.*)/)
  return match ? match[1] : line
}

module.exports = {
  createData,
  removeData,
  parseFile
}

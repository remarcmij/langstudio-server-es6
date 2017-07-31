'use strict'
const util = require('util')
const _ = require('lodash')
const XRegExp = require('xregexp')

const ArticleModel = require('./articleModel')
const ParagraphModel = require('./paragraphModel')
const markDownService = require('../../services/markdownService')
const { parseHeaderProps } = require('../../cli/headerParser')
const autoCompleteIndexer = require('../search/autoCompleteIndexer')

const WORD_REGEXP = XRegExp(String.raw`#?[-'\p{L}]{2,}`, 'g')

async function createData(topic, article) {
  article._topic = topic._id
  await ArticleModel.create(article)
  await bulkInsertParagraphs(article, topic)
  await autoCompleteIndexer()
}

async function bulkInsertParagraphs({ paragraphs }, topic) {
  const { _id: _topic, baseLang, targetLang, groupName } = topic
  const bulk = paragraphs.reduce((bulk, { words, content }) => {
    words.forEach(({ word, lang: wordLang }) =>
      bulk.insert({
        word,
        content,
        baseLang,
        targetLang,
        groupName,
        wordLang,
        _topic
      })
    )
    return bulk
  }, ParagraphModel.collection.initializeUnorderedBulkOp())

  if (bulk.length > 0) {
    const bulkExecute = util.promisify(bulk.execute.bind(bulk))
    await bulkExecute()
  }
}

async function removeData({ _id: _topic }) {
  await ArticleModel.remove({ _topic }).exec()
  await ParagraphModel.remove({ _topic }).exec()
}

function parseFile(content, fileName) {
  const match = fileName.match(/^(.+?)\.(.+?)\./)
  const [publication, chapter] = match.slice(1, 3)
  const headerProps = parseHeaderProps(content)

  const props = {
    type: 'article',
    fileName,
    publication,
    chapter,
    title: parseTitle(content),
    subtitle: parseSubtitle(chapter, content),
    ...headerProps
  }

  const { title, groupName, baseLang, targetLang } = props

  const payload = {
    fileName,
    title,
    groupName,
    rawBody: content,
    body: markDownService.convertMarkdown(content),
    paragraphs: extractParagraphs(content, baseLang, targetLang)
  }

  return { props, payload }
}

function parseTitle(content) {
  const h1 = /^# *([^#][^\n]+)/m
  const match = content.match(h1)
  return match ? match[1] : 'untitled'
}

function parseSubtitle(chapter, content) {
  if (chapter === 'index') {
    return undefined
  }

  const h2 = /^##\s+(.*)$/gm
  let subtitle = ''
  let match = h2.exec(content)

  while (match) {
    if (subtitle.length > 0) {
      subtitle += ' • '
    }
    subtitle += match[1]
    match = h2.exec(content)
  }

  return subtitle
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

  return [
    ...extractWords(baseBuffer, baseLang),
    ...extractWords(targetBuffer, targetLang)
  ]
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

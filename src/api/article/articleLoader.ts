import * as util from 'util'
import * as _ from 'lodash'
import { Dictionary } from 'lodash'
import XRegExp = require('xregexp')

import { TopicDocument } from '../topics/topicModel'
import ArticleModel, { Article } from './articleModel'
import ParagraphModel, { Paragraph } from './paragraphModel'
import { convertMarkdown } from '../../services/markdownService'
import { parseHeaderProps } from '../../cli/headerParser'
import autoCompleteIndexer from '../search/autoCompleteIndexer'

const WORD_REGEXP = XRegExp(String.raw`#?[-'\p{L}]{2,}`, 'g')

interface WordLangPair {
  word: string
  lang: string
}

interface ParagraphItem {
  words: WordLangPair[]
  content: string
}

interface ArticleWithParagraphs extends Article {
  paragraphs: ParagraphItem[]
}


export function createData(topic: TopicDocument, article: ArticleWithParagraphs): Promise<void> {
  const updatedArticle = Object.assign({}, article, { _topic: topic._id })
  return ArticleModel.create(updatedArticle)
    .then(() => bulkInsertParagraphs(updatedArticle, topic))
    .then(() => autoCompleteIndexer())
}

function bulkInsertParagraphs({ paragraphs }: ArticleWithParagraphs, topic: TopicDocument): Promise<any> | undefined {
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
    return bulkExecute()
  }
}

export function removeData({ _id: _topic }: TopicDocument) {
  return ArticleModel.remove({ _topic }).exec()
    .then(() => ParagraphModel.remove({ _topic }).exec())
}

export function parseFile(content: string, fileName: string) {
  const match = fileName.match(/^(.+?)\.(.+?)\./)
  const [publication, chapter] = match.slice(1, 3)
  const headerProps = parseHeaderProps(content)

  const props: Dictionary<string> = {
    type: 'article',
    fileName,
    publication,
    chapter,
    title: parseTitle(content),
    subtitle: parseSubtitle(chapter, content),
    ...headerProps
  }

  const { title, groupName, baseLang, targetLang } = props

  const payload: ArticleWithParagraphs = {
    fileName,
    title,
    groupName,
    rawBody: content,
    body: convertMarkdown(content),
    paragraphs: extractParagraphs(content, baseLang, targetLang)
  }

  return { props, payload }
}

function parseTitle(content: string) {
  const h1 = /^# *([^#][^\n]+)/m
  const match = content.match(h1)
  return match ? match[1] : 'untitled'
}

function parseSubtitle(chapter: string, content: string) {
  if (chapter === 'index') {
    return
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

function extractParagraphs(content: string, baseLang: string, targetLang: string) {
  const paragraphs: ParagraphItem[] = []

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

function extractAllWords(paragraph: string, baseLang: string, targetLang: string) {
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

function extractWords(buffer: string, lang: string) {
  let words = buffer.match(WORD_REGEXP) || []
  words = _.uniq(words.map(word => word.toLowerCase()))
  return words.map(word => ({ word, lang }))
}

function containsTargetLangFragment(text: string) {
  return /\*\*.+?\*\*|\*.+?\*/g.test(text)
}

function removeLinePrefixIfAny(line: string) {
  const match = line.match(/^(?:[-<*]\s)(.*)/)
  return match ? match[1] : line
}

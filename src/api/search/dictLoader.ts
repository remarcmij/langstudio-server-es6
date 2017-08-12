import * as util from 'util'
import { Dictionary } from 'lodash'
import md5 = require('md5')

import { Topic, TopicDocument } from '../topics/topicModel'
import LemmaModel from './lemmaModel'
import autoCompleteIndexer from './autoCompleteIndexer'

interface LemmaWordJSON {
  word: string
  lang: string
  attr: 'r' | 'k'
  order: number
  anchor: 0 | 1
}

interface LemmaJSON {
  base: string
  homonym: number
  text: string
  words: LemmaWordJSON[]
}

interface DictPayload {
  lemmas: LemmaJSON[]
  groupName: string
  baseLang: string
  key: string
}

interface DictData {
  props: Dictionary<string>
  payload: DictPayload
}

export function createData(topic: TopicDocument, payload: DictPayload): Promise<void> {
  const { _id: _topic, groupName } = topic
  const { lemmas, baseLang } = payload

  const bulk = lemmas.reduce((bulk, { words, base, homonym, text }) => {
    words.forEach(({ word, attr, order, lang }) => {
      bulk.insert({
        text,
        homonym,
        word,
        lang,
        base,
        baseLang,
        attr,
        order,
        groupName,
        _topic,
        hash: md5(text)
      })
    })
    return bulk
  }, LemmaModel.collection.initializeUnorderedBulkOp())

  if (bulk.length === 0) {
    return Promise.resolve()
  }

  if (bulk.length > 0) {
    const bulkExecute = util.promisify(bulk.execute.bind(bulk))
    return bulkExecute()
      .then(() => autoCompleteIndexer())
  }
}

export function removeData({ _id: _topic }: TopicDocument) {
  return LemmaModel.remove({ _topic }).exec()
}

export function parseFile(content: string, fileName: string): DictData {
  const match = fileName.match(/^(.+?)\.(.+?)/)
  const publication = match[1]
  const payload: DictPayload = JSON.parse(content)

  return {
    props: {
      type: 'dict',
      fileName,
      publication,
      groupName: payload.groupName
    },
    payload
  }
}

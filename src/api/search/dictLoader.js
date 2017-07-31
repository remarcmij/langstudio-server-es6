'use strict'
const util = require('util')
const md5 = require('md5')

const LemmaModel = require('./lemmaModel')
const autoCompleteIndexer = require('./autoCompleteIndexer')

async function createData(topic, payload) {
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

  if (bulk.length > 0) {
    const bulkExecute = util.promisify(bulk.execute.bind(bulk))
    await bulkExecute()
    await autoCompleteIndexer()
  }
}

function removeData({ _id: _topic }) {
  return LemmaModel.remove({ _topic }).exec()
}

function parseFile(content, fileName) {
  const match = fileName.match(/^(.+?)\.(.+?)/)
  const publication = match[1]
  const payload = JSON.parse(content)
  const { groupName } = payload

  return {
    props: {
      type: 'dict',
      fileName,
      publication,
      groupName
    },
    payload
  }
}

module.exports = {
  createData,
  removeData,
  parseFile
}

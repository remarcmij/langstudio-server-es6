'use strict'

const LemmaModel = require('./lemmaModel')
const autoCompleteIndexer = require('./autoCompleteIndexer')

function createData(topic, uploadData) {

  const ops = uploadData.payload.lemmas.reduce((acc, lemma) => {
    lemma.words.forEach(word => {
      acc.push({
        insertOne: {
          document: {
            baseWord: lemma.base,
            homonym: lemma.homonym,
            text: lemma.text,
            word: word.word,
            attr: word.attr,
            order: word.order,
            lang: word.lang,
            baseLang: uploadData.payload.baseLang,
            groupName: uploadData.topic.groupName,
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

  return LemmaModel.collection.bulkWrite(ops)
    .then(() => autoCompleteIndexer())
}

function removeData(topic) {
  if (topic) {
    return Promise.resolve(LemmaModel.remove({ _topic: topic._id }).exec())
  }
  return Promise.resolve()
}

function parseFile(content, fileName) {
  const data = JSON.parse(content)

  const match = fileName.match(/(.+)\.(.+)\./)
  if (!match) {
    throw new Error(`ill-formed filename: ${fileName}`)
  }

  return {
    topic: {
      fileName: fileName,
      type: 'dict',
      groupName: data.groupName
    },
    payload: data
  }
}

module.exports = {
  createData,
  removeData,
  parseFile
}


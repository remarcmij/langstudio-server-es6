'use strict'

const LemmaModel = require('./lemmaModel')
const autoCompleteIndexer = require('./autoCompleteIndexer')

async function createData(topic, uploadData) {

  const bulkOps = uploadData.payload.lemmas.reduce((acc, lemma) => {
    const ops = lemma.words.map(word => ({
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
    }))
    return [...acc, ...ops]
  }, [])

  if (bulkOps.length > 0) {
    await LemmaModel.collection.bulkWrite(bulkOps)
    await autoCompleteIndexer()
  }
}

async function removeData(topic) {
  if (topic) {
     await LemmaModel.remove({ _topic: topic._id }).exec()
  }
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


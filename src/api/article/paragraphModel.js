'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  word: { type: String, required: true, index: true },
  wordLang: { type: String, required: true },
  content: { type: String, required: true },
  baseLang: { type: String, required: true },
  targetLang: { type: String, required: true },
  groupName: { type: String, required: true },
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

module.exports = mongoose.model('Paragraph', schema)

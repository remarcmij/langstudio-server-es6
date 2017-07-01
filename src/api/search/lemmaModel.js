'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  word: { type: String, required: true },
  lang: { type: String, required: true },
  base: { type: String, required: true },
  baseLang: { type: String, required: true },
  order: { type: Number, required: true },
  homonym: { type: Number, required: true },
  attr: { type: String, required: true },
  text: { type: String, required: true },
  hash: { type: String, required: true },
  groupName: { type: String, required: true },
  _topic: { type: Schema.Types.ObjectId, required: true, ref: 'Topic' }
})

schema.index({ word: 1, order: 1 })

module.exports = mongoose.model('Lemma', schema)

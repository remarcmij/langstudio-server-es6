'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  fileName: { type: String, required: true, index: true },
  groupName: { type: String, required: true },
  title: { type: String, required: true },
  mdText: String,
  htmlText: String,
  indexText: String,
  style: String,
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

schema.index({ indexText: 'text' }, { default_language: 'none' })

module.exports = mongoose.model('Article', schema)

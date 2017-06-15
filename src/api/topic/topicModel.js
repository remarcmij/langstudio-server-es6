'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  type: { type: String, required: true, 'enum': ['article', 'dict'] },
  fileName: { type: String, required: true, unique: true },
  publication: String,
  chapter: String,
  targetLang: String,
  baseLang: String,
  groupName: { type: String, required: true },
  sortIndex: { type: Number, 'default': 0 },
  title: String,
  subtitle: String,
  author: String,
  copyright: String,
  publisher: String,
  pubdate: String,
  isbn: String,
  lastModified: { type: Date, 'default': Date.now() }
})

module.exports = mongoose.model('Topic', schema)

'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  word: { type: String, required: true, index: true },
  lang: { type: String, required: true },
})

module.exports = mongoose.model('Word', schema)

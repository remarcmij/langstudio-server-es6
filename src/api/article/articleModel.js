'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  fileName: { type: String, required: true, index: true },
  groupName: { type: String, required: true },
  title: { type: String, required: true },
  rawBody: String,
  body: String,
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

module.exports = mongoose.model('Article', schema)

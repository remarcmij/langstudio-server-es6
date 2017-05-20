'use strict'
const mongoose = require('mongoose')
const { Schema } = mongoose

const schema = new Schema({
  name: { type: String, required: true, index: true },
  subtitle: String,
  groupName: { type: String, required: true },
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

module.exports = mongoose.model('HashTag', schema)

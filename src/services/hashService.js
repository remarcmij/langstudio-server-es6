'use strict'
const md5 = require('md5')

module.exports = {
  hashTopic: hashData => md5(JSON.stringify(hashData))
}

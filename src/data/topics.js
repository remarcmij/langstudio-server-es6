'use strict'
const flow = require('lodash/fp/flow')
const TopicModel = require('../api/topics/topicModel')
const auth = require('../auth/authService')

const indexCondition = condition => ({ type: 'article', chapter: 'index', ...condition })
const articleCondition = pub => condition => ({ type: 'article', publication: pub, ...condition })

function getTopicList(user, pub = 'index') {
  const condition = flow(
    pub === 'index' ? indexCondition : articleCondition(pub),
    auth.userGroupsCondition(user),
  )({})

  return TopicModel.find(condition)
    .sort('publication')
    .lean()
    .exec()
}

module.exports = {
  getTopicList
}

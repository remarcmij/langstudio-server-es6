'use strict'
const _ = require('lodash')
const flow = require('lodash/fp/flow')
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const indexCondition = condition => Object.assign({}, condition, { type: 'article', chapter: 'index' })
const articleCondition = pub => condition => Object.assign({}, condition, { type: 'article', publication: pub })
const allCondition = condition => Object.assign({}, condition, { type: 'article' })


function getIndexTopics(req, res) {
  const { user, } = req
  const condition = flow(
    indexCondition,
    auth.userGroupsCondition(user),
  )({})
  getTopics(condition, res)
}

function getPublicationTopics(req, res) {
  const { user, params } = req
  const { pub } = params
  const condition = flow(
    articleCondition(pub),
    auth.userGroupsCondition(user)
  )({})
  getTopics(condition, res)
}

function getAllTopics(req, res) {
  const { user } = req
  const condition = flow(
    allCondition,
    auth.userGroupsCondition(user)
  )({})
  getTopics(condition, res)
}

async function getTopics(condition, res) {
  try {
    const topics = await TopicModel.find(condition)
      .sort('sortIndex title')
      .lean()
      .exec()
    res.json(topics)
  }
  catch ({ message }) {
    log.error(message)
    res.status(500).send(message)
  }
}

async function getGroups(req, res) {
  try {
    const topics = await TopicModel.find({})
      .select('groupName publication -_id')
      .sort('groupName')
      .lean()
      .exec()

    const groupMap = _.reduce(topics, (map, { groupName: name, publication }) => {
      const set = map[name] || new Set()
      map[name] = set
      set.add(publication)
      return map
    }, {})

    const groups = _.reduce(groupMap, (arr, pubs, name) => {
      const publications = [...pubs].join(', ')
      arr.push({ name, publications })
      return arr
    }, [])

    log.debug('fetched group info', req.user)
    res.json(groups)
  }
  catch ({ message }) {
    const { user } = req
    log.error(`get group info error ${message}`, user)
    res.status(500).send(message)
  }
}

module.exports = {
  getIndexTopics,
  getPublicationTopics,
  getAllTopics,
  getGroups
}



'use strict'
const _ = require('lodash')
const flow = require('lodash/fp/flow')
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const indexCondition = condition => Object.assign({}, condition, { type: 'article', chapter: 'index' })
const articleCondition = pub => condition => Object.assign({}, condition, { type: 'article', publication: pub })
const appCondition = condition => Object.assign({}, condition, { type: 'article' })

async function getCollection(req, res) {
  const { user } = req

  try {
    const condition = flow(
      indexCondition,
      auth.userGroupsCondition(user),
    )({})

    const topics = await TopicModel.find(condition)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched collection`, user)
    res.json(topics)
  }
  catch ({ message }) {
    log.error(`${getCollection.name}: ${message}`, user)
    res.status(500).send(message)
  }
}

async function getPublication(req, res) {
  const { user, params } = req
  const { pub } = params

  try {
    const condition = flow(
      articleCondition(pub),
      auth.userGroupsCondition(user)
    )({})

    const topics = await TopicModel.find(condition)
      .sort('sortIndex title')
      .lean()
      .exec()

    log.debug(`${getPublication.name}: ${pub} (${topics.length} topics)`, user)
    res.json(topics)
  }
  catch ({ message }) {
    log.error(`${getPublication.name}: ${pub} error ${message}`, user)
    res.status(500).send(message)
  }
}

async function getAdminTopics(req, res) {
  try {
    const topics = await TopicModel.find({})
      .sort('publication sortIndex title')
      .lean()
      .exec()

    log.debug('fetched admin topics')
    res.json(topics)
  }
  catch ({ message }) {
    const { user } = req
    log.error(`${getAdminTopics.name}:  error ${message}`, user)
    res.status(500).send(message)
  }
}

async function getAppTopics(req, res) {
  const { user } = req
  try {
    const condition = flow(
      appCondition,
      auth.userGroupsCondition(user)
    )({})

    const topics = await TopicModel.find(condition)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched app topics (${topics.length})`, user)
    res.json(topics)
  }
  catch ({ message }) {
    log.error(`get app topics error ${message}`, user)
    res.status(500).send(message)
  }
}


async function getGroupInfo(req, res) {
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
  getCollection,
  getPublication,
  getAdminTopics,
  getAppTopics,
  getGroupInfo
}


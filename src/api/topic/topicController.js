'use strict'
const fp = require('lodash/fp')
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const userGroupsCondition = fp.curry(auth.addUserGroupsToQueryCondition)
const articleCondition = (pub) => (condition) => Object.assign({}, condition, { type: 'article', publication: pub })

const cond = {
  userGroups: fp.curry(auth.addUserGroupsToQueryCondition),
  publication: (condition) => Object.assign({}, condition, { type: 'article', publication: 'index' }),
  article: (pub) => (condition) => Object.assign({}, condition, { type: 'article', publication: pub }),
  app: (condition) => Object.assign({}, condition, { type: 'article' }),
}

async function getCollection(req, res) {
  const { user } = req

  try {
    const condition = auth.addUserGroupsToQueryCondition(user, {
      type: 'article',
      chapter: 'index'
    })

    const topics = await TopicModel.find(condition)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched collection`, user)
    res.json(topics)
  }
  catch (err) {
    log.error(`${getCollection.name}: ${err.message}`, user)
    res.status(500).send(err)
  }
}

async function getPublication(req, res) {
  const { user, params } = req
  const { pub } = params

  try {
    const condition = auth.addUserGroupsToQueryCondition(user, {
      type: 'article',
      publication: pub
    })

    const topics = await TopicModel.find(condition)
      .sort('sortIndex part title')
      .lean()
      .exec()

    if (topics.length === 0) {
      // no matching group or publication not found.
      // treat as 'unauthorized' http error
      return res.sendStatus(401)
    }

    log.debug(`${getPublication.name}: ${pub} (${topics.length} topics)`, user)
    res.json(topics)
  }
  catch (err) {
    log.error(`${getPublication.name}: ${pub} error ${err.message}`, user)
    res.status(500).send(err)
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
  catch (err) {
    log.error(`${getAdminTopics.name}:  error ${err.message}`, req.user)
    res.status(500).send(err)
  }
}

async function getAppTopics(req, res) {
  const { user } = req
  try {
    const condition = auth.addUserGroupsToQueryCondition(user, {
      type: 'article'
    })

    const topics = await TopicModel.find(condition)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched app topics (${topics.length})`, user)
    res.json(topics)
  }
  catch (err) {
    log.error(`get app topics error ${err.message}`, user)
    res.status(500).send(err)
  }
}

async function getGroupInfo(req, res) {
  try {
    const topics = await TopicModel.find({})
      .sort('groupName')
      .lean()
      .exec()

    const groupMap = topics.reduce((map, topic) => {
      let group = map.get(topic.groupName)
      if (!group) {
        group = {
          name: topic.groupName,
          publications: new Set()
        }
        map.set(topic.groupName, group)
      }
      group.publications.add(topic.publication)
      return map
    }, new Map())

    const groups = []

    groupMap.forEach((group, name) => {
      groups.push({
        name,
        publications: [...group.publications].join(', ')
      })
    })

    log.debug('fetched group info', req.user)
    res.json(groups)

  }
  catch (err) {
    log.error(`get group info error ${err.message}`, req.user)
    res.status(500).send(err)
  }
}

module.exports = {
  getCollection,
  getPublication,
  getAdminTopics,
  getAppTopics,
  getGroupInfo
}


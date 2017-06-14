'use strict'
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

async function getCollection(req, res) {
  try {
    const criterion = { type: 'article', chapter: 'index' }

    const groups = auth.getGroupsForUser(req.user)
    if (groups) {
      criterion.groupName = { $in: groups }
    }

    const topics = await TopicModel.find(criterion)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched collection`, req.user)
    res.json(topics)
  }
  catch (err) {
    log.error(`${getCollection.name}: ${err.message}`, req.user)
    res.status(500).send(err)
  }
}

async function getPublication(req, res) {
  const publication = req.params.pub

  try {
    const criterion = { type: 'article', publication }

    const groups = auth.getGroupsForUser(req.user)
    if (groups) {
      criterion.groupName = { $in: groups }
    }

    const topics = await TopicModel.find(criterion)
      .sort('sortIndex part title')
      .lean()
      .exec()

    if (topics.length === 0) {
      // no matching group or publication not found.
      // treat as 'unauthorized' http error
      return res.sendStatus(401)
    }

    log.debug(`${getPublication.name}: ${publication} (${topics.length} topics)`, req.user)
    res.json(topics)
  }
  catch (err) {
    log.error(`${getPublication.name}: ${publication} error ${err.message}`, req.user)
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
  try {
    const criterion = {
      type: 'article'
    }

    let groups = auth.getGroupsForUser(req.user)
    if (groups) {
      groups = groups.filter(name => name !== 'public')
      criterion.groupName = { $in: groups }
    }

    const topics = await TopicModel.find(criterion)
      .sort('publication')
      .lean()
      .exec()

    log.debug(`fetched app topics (${topics.length})`, req.user)
    res.json(topics)
  }
  catch (err) {
    log.error(`get app topics error ${err.message}`, req.user)
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


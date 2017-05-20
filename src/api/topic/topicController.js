'use strict'
const _ = require('lodash')

const TopicModel = require('./topicModel')
const log = require('../../services/logService')

const publicGroups = ['public']

function getCollection(req, res) {

  getIndexTopics(req.user)
    .then(topics => {
      log.debug(`fetched collection`, req)
      res.json(topics)
    }, err => {
      log.error(`get collection error ${err.message}`, req)
      res.status(500).send(err)
    })
}

function getIndexTopics(user) {
  const criterion = {
    type: 'article',
    chapter: 'index'
  }

  const groups = getAuthorizedGroups(user)

  if (groups) {
    criterion.groupName = { $in: groups }
  }

  return TopicModel.find(criterion)
    .sort('publication')
    .lean().exec()

}

function getPublication(req, res) {
  const publication = req.params.pub
  const criterion = { type: 'article', publication }
  const groups = getAuthorizedGroups(req.user)

  if (groups) {
    criterion.groupName = { $in: groups }
  }

  TopicModel.find(criterion)
    .sort('sortIndex part title')
    .lean()
    .then((topics) => {
      if (topics.length === 0) {
        // no matching group or publication not found.
        // treat as 'unauthorized' http error
        res.sendStatus(401)
      } else {
        log.debug(`fetched publication ${publication} (${topics.length} topics)`, req)
        res.json(topics)
      }
    }, err => {
      log.error(`get publication ${publication} error ${err.message}`, req)
      res.status(500).send(err)
    })
}

function getAuthorizedGroups(user) {
  let groups = []

  if (user) {
    if (user.role === 'admin') {
      return null
    }
    groups = user.groups
    groups = _.uniq(groups.concat(publicGroups))
  } else {
    groups = publicGroups
  }

  return groups
}

function getAdminTopics(req, res) {
  TopicModel.find({})
    .sort('publication sortIndex title')
    .lean()
    .then(topics => {
      log.debug('fetched admin topics', req)
      res.json(topics)
    }, err => {
      log.error(`get admin topics error ${err.message}`, req)
      res.status(500).send(err)
    })
}

function getAppTopics(req, res) {
  const criterion = {
    type: 'article'
  }

  let groups = getAuthorizedGroups(req.user)

  if (groups) {
    groups = groups.filter(groupName => groupName !== "public")
    criterion.groupName = { $in: groups }
  }

  TopicModel.find(criterion)
    .sort('publication')
    .lean()
    .then(topics => {
      log.debug(`fetched app topics (${topics.length})`, req)
      res.json(topics)
    }, err => {
      log.error(`get app topics error ${err.message}`, req)
      res.status(500).send(err)
    })
}

function getGroupInfo(req, res) {
  TopicModel.find({})
    .sort('groupName')
    .lean()
    .then((topics) => {
      const groupMap = new Map()

      topics.forEach(topic => {
        let group = groupMap.get(topic.groupName)
        if (!group) {
          group = {
            name: topic.groupName,
            publications: new Set()
          }
          groupMap.set(topic.groupName, group)
        }
        if (topic.publication) {
          group.publications.add(topic.publication)
        }
      })

      const groups = []

      groupMap.forEach((group, name) => {
        const items = []
        group.publications.forEach(pubtitle => {
          items.push(pubtitle)
        })
        groups.push({
          name: name,
          publications: items.join(', ')
        })
      })

      log.debug('fetched group info', req)
      res.json(groups)

    }, err => {
      log.error(`get group info error ${err.message}`, req)
      res.status(500).send(err)
    })
}

module.exports = {
  getCollection,
  getIndexTopics,
  getPublication,
  getAuthorizedGroups,
  getAdminTopics,
  getAppTopics,
  getGroupInfo
}


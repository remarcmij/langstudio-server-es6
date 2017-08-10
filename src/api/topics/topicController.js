'use strict'
const _ = require('lodash')
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const indexCondition = condition => Object.assign({}, condition, { type: 'article', chapter: 'index' })
const articleCondition = pub => condition => Object.assign({}, condition, { type: 'article', publication: pub })
const allCondition = condition => Object.assign({}, condition, { type: 'article' })

const sendJSON = res => result => res.json(result)

const handleError = (req, res) => err => {
  log.error(`error: ${err.message}`, req.user)
  res.status(500).send(err.message)
}

const getTopics = (req, res, condition) => {
  TopicModel.find(condition(req))
    .sort('sortIndex title')
    .lean()
    .exec()
    .then(sendJSON(res))
    .catch(handleError(req, res))
}

function getIndexTopics(req, res) {
  const condition = req => _.flow(
    indexCondition,
    auth.userGroupsCondition(req.user),
  )({})
  getTopics(req, res, condition)
}

function getPublicationTopics(req, res) {
  const condition = req => _.flow(
    articleCondition(req.params.pub),
    auth.userGroupsCondition(req.user)
  )({})
  getTopics(req, res, condition)
}

function getAllTopics(req, res) {
  const condition = req => _.flow(
    allCondition,
    auth.userGroupsCondition(req.user),
  )({})
  getTopics(req, res, condition)
}

function getGroups(req, res) {

  const groupByGroupName = topics => _.reduce(topics, (hash, { groupName, publication }) => {
    const set = hash[groupName] || new Set()
    hash[groupName] = set
    set.add(publication)
    return hash
  }, {})

  const joinPublications = groups => _.reduce(groups, (arr, pubNames, name) => {
    const publications = [...pubNames].join(', ')
    arr.push({ name, publications })
    return arr
  }, [])

  const aggregateGroups = _.flow(groupByGroupName, joinPublications)

  TopicModel.find({})
    .select('groupName publication -_id')
    .sort('groupName')
    .lean().exec()
    .then(aggregateGroups)
    .then(sendJSON(res))
    .catch(handleError(req, res))
}

module.exports = {
  getIndexTopics,
  getPublicationTopics,
  getAllTopics,
  getGroups
}

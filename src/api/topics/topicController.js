'use strict'
const _ = require('lodash')
const TopicModel = require('./topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')

const indexTopicsCondition = condition => Object.assign({}, condition, { type: 'article', chapter: 'index' })
const publicationTopicsCondition = pub => condition => Object.assign({}, condition, { type: 'article', publication: pub })
const allTopicsCondition = condition => Object.assign({}, condition, { type: 'article' })

const sendJSON = res => result => res.json(result)

const handleError = (req, res) => err => {
  log.error(`error: ${err.message}`, req.user)
  res.status(500).send(err.message)
}

const findTopics = condition =>
  TopicModel.find(condition)
    .sort('sortIndex title')
    .lean()
    .exec()

const handlePromise = (req, res) => promise =>
  promise
    .then(sendJSON(res))
    .catch(handleError(req, res))

const getTopics = (req, res) => condition => {
  _.flow(
    auth.userGroupsCondition(req.user),
    findTopics,
    handlePromise(req, res)
  )(condition)
}

function getIndexTopics(req, res) {
  _.flow(
    indexTopicsCondition,
    getTopics(req, res)
  )({})
}

function getPublicationTopics(req, res) {
  _.flow(
    publicationTopicsCondition(req.params.pub),
    getTopics(req, res)
  )({})
}

function getAllTopics(req, res) {
  _.flow(
    allTopicsCondition,
    getTopics(req, res)
  )({})
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

  const aggregateGroups = _.flow(
    groupByGroupName,
    joinPublications
  )

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

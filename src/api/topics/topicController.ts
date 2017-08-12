import * as _ from 'lodash'
import { Dictionary } from 'lodash'
import { Request, Response } from 'express'

import TopicModel, { Topic } from './topicModel'
const log = require('../../services/logService')
import { userGroupsCondition } from '../../auth/authService'

const indexTopicsCondition = (condition: {}) => Object.assign({}, condition, { type: 'article', chapter: 'index' })
const publicationTopicsCondition = (pub: string) => (condition: Object) => Object.assign({}, condition, { type: 'article', publication: pub })
const allTopicsCondition = (condition: {}) => Object.assign({}, condition, { type: 'article' })

const sendTopicsJSON = (res: Response) => (topics: Topic[]) => res.json(topics)

const handleError = (req: Request, res: Response) => (err: Error) => {
  log.error(`error: ${err.message}`, req.user)
  res.status(500).send(err.message)
}

const findTopics = (condition: {}) =>
  TopicModel.find(condition)
    .sort('sortIndex title')
    .exec()

const handlePromise = (req: Request, res: Response) => (promise: Promise<Topic[]>) =>
  promise
    .then(sendTopicsJSON(res))
    .catch(handleError(req, res))

const getTopics = (req: Request, res: Response) => (condition: {}) => {
  _.flow(
    userGroupsCondition(req.user),
    findTopics,
    handlePromise(req, res)
  )(condition)
}

export function getIndexTopics(req: Request, res: Response) {
  _.flow(
    indexTopicsCondition,
    getTopics(req, res)
  )({})
}

export function getPublicationTopics(req: Request, res: Response) {
  _.flow(
    publicationTopicsCondition(req.params.pub),
    getTopics(req, res)
  )({})
}

export function getAllTopics(req: Request, res: Response) {
  _.flow(
    allTopicsCondition,
    getTopics(req, res)
  )({})
}

export function getGroups(req: Request, res: Response) {

  const groupByGroupName = (topics: Topic[]) => _.reduce(topics, (hash: Dictionary<Set<string>>, { groupName, publication }) => {
    const set = hash[groupName] || new Set<string>()
    hash[groupName] = set
    set.add(publication)
    return hash
  }, {})

  const joinPublications = (groups: Dictionary<Set<string>>) => _.reduce(groups, (arr, pubNames, name) => {
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
    .then(sendTopicsJSON(res))
    .catch(handleError(req, res))
}

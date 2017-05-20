'use strict'
const PubSub = require('pubsub-js')
const _ = require('lodash')

const HashTagModel = require('./hashtagModel')
const TopicModel = require('../topic/topicModel')
const log = require('../../services/logService')
const auth = require('../../auth/authService')
const AppConstants = require('../../config/appConstants')

let cachedIndexTopics = []

PubSub.subscribe(AppConstants.INVALIDATE_CACHES, () => {
  log.debug('hashtagController: invalidating caches')
  cachedIndexTopics = []
})

function searchHashTags(req, res) {
  const name = req.query.q && req.query.q.trim()
  if (!name) {
    return void res.sendStatus(400)
  }

  const indexTopicsPromise = cachedIndexTopics.length !== 0
    ? Promise.resolve(cachedIndexTopics)
    : TopicModel.find({ type: 'article', chapter: 'index' }).lean().exec()
      .then(topics => {
        cachedIndexTopics = topics
        log.debug('hashtagController: caching indexTopics')
        return topics
      })

  const criterion = { name }
  const groups = auth.getAuthorizedGroups(req)
  if (groups) {
    criterion.groupName = { $in: groups }
  }

  indexTopicsPromise
    .then(topics => {
      return HashTagModel.find(criterion)
        .populate('_topic')
        .lean()
        .exec()
        .then(hashTags => {
          return hashTags.map(hashTag => {
            return {
              title: hashTag._topic.title,
              subtitle: hashTag.subtitle,
              pubTitle: _.find(topics, (topic => topic.publication === hashTag._topic.publication)).title || '??',
              publication: hashTag._topic.publication,
              chapter: hashTag._topic.chapter
            }
          })

        })
    })
    .then(items => {
      items = _.sortBy(items, item => `${item.pubTitle}.${item.title}`.toLowerCase())
      res.json(items)
    })
    .catch(err => {
      res.status(500).send(err)

    })
}

function getAllHashTags(req, res) {
  const criterion = {}
  const groups = auth.getAuthorizedGroups(req)
  if (groups) {
    criterion.groupName = { $in: groups }
  }

  HashTagModel.aggregate([
    {
      $match: criterion
    }, {
      $group: {
        _id: '$name',
        count: {
          $sum: 1
        }
      }
    }, {
      $group: {
        _id: {
          $toUpper: {
            $substr: ['$_id', 0, 1]
          }
        }, tags: {
          $push: {
            name: '$_id', count: '$count'
          }
        }
      },
    }, {
      $sort: {
        _id: 1
      }
    }]).exec()
    .then(tagGroups => {
      tagGroups.forEach(group => {
        group.tags = _.sortBy(group.tags, tag => tag.name)
      })
      res.json(tagGroups)
    }, err => {
      res.status(500).send(err)
    })
}

module.exports = {
  searchHashTags,
  getAllHashTags
}

'use strict'
const _ = require('lodash')
const Rx = require('rxjs')

const ArticleModel = require('./articleModel')
const auth = require('../../auth/authService')

function getArticle(req, res) {

  const createCondition = (fileName, user) => auth.userGroupsCondition(user)({ fileName })
  const findArticle = condition => ArticleModel.findOne(condition)
    .populate('_topic')
    .lean()
    .exec()
  const findPromise = _.flow(createCondition, findArticle)

  const checkIfFound = article => article ? { article, status: 200 } : { status: 404 }

  const hasFlashCardSection = article => /<!-- flashcard -->/.test(article.rawBody)

  const omitRawBodyIfNoFlashCards = ({ article, status }) =>
    status === 200 && !hasFlashCardSection(article)
      ? { article: _.omit(article, 'rawBody'), status }
      : { article, status }

  Rx.Observable
    .fromPromise(findPromise(req.params.filename, req.user))
    .map(checkIfFound)
    .map(omitRawBodyIfNoFlashCards)
    .subscribe(({ article, status }) => {
      if (status !== 200) {
        res.sendStatus(status)
      } else {
        res.json(article)
      }
    }, err => {
      res.status(500).send(err.message)
    })
}

module.exports = {
  getArticle
}

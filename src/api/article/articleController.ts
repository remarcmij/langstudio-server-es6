import * as _ from 'lodash'
import * as  Rx from 'rxjs'
import { Request, Response } from 'express'

import ArticleModel, { Article } from './articleModel'
import { User } from '../user/userModel'
import * as auth from '../../auth/authService'

type ArticleStatus = { article?: Article, status: number }

export function getArticle(req: Request, res: Response): void {

  const createCondition = (fileName: string, user: User) => auth.userGroupsCondition(user)({ fileName })
  const findArticle = (condition: {}) => ArticleModel.findOne(condition)
    .populate('_topic')
    .exec()

  const findPromise = _.flow(
    createCondition,
    findArticle
  )

  const checkIfFound = (article: Article) => article ? { article, status: 200 } : { status: 404 }

  const hasFlashCardSection = (article: Article) => /<!-- flashcard -->/.test(article.rawBody)

  const omitRawBodyIfNoFlashCards = ({ article, status }: ArticleStatus) =>
    status === 200 && !hasFlashCardSection(article)
      ? { article: _.omit(article, 'rawBody'), status }
      : { article, status }

  const { params, user } = req
  Rx.Observable
    .fromPromise(findPromise(params.filename, user))
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

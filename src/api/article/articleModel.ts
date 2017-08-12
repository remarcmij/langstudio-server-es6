import { Schema, Document, model } from 'mongoose'
import {Paragraph} from './paragraphModel'

export interface Article {
  fileName: string
  groupName: string
  title: string
  rawBody: string
  body: string
  _topic?: any
}

export interface ArticleDocument extends Article, Document {}

const schema = new Schema({
  fileName: { type: String, required: true, index: true },
  groupName: { type: String, required: true },
  title: { type: String, required: true },
  rawBody: String,
  body: String,
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

export default model<ArticleDocument>('Article', schema)

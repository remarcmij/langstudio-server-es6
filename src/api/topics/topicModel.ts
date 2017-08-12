import { Schema, Document, model } from 'mongoose'

export interface Topic {
  type: 'article' | 'dict'
  fileName: string
  publication: string
  chapter: string
  targetLang: string
  baseLang: string
  groupName: string
  sortIndex: number
  title: string
  subtitle?: string
  author?: string
  copyright?: string
  publisher?: string
  publicationDate?: string
  isbn?: string
  lastModified: Date
}

export interface TopicDocument extends Topic, Document {}

const schema = new Schema({
  type: { type: String, required: true, enum: ['article', 'dict'] },
  fileName: { type: String, required: true, unique: true },
  publication: String,
  chapter: String,
  targetLang: String,
  baseLang: String,
  groupName: { type: String, required: true },
  sortIndex: { type: Number, default: 0 },
  title: String,
  subtitle: String,
  author: String,
  copyright: String,
  publisher: String,
  publicationDate: String,
  isbn: String,
  lastModified: { type: Date, default: Date.now() }
})

export default model<TopicDocument>('Topic', schema)

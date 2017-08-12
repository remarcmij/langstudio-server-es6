import { Schema, Document, model } from 'mongoose'

export type LemmaAttr = 'r' | 'k'

export interface Lemma {
  word: string
  lang: string
  baseWord: string
  baseLang: string
  order: number
  homonym: number
  attr: LemmaAttr
  text: string
  hash: string
  groupName: string
  _topic?: any
}

interface LemmaDocument extends Lemma, Document {}

const schema = new Schema({
  word: { type: String, required: true },
  lang: { type: String, required: true },
  baseWord: { type: String, required: true },
  baseLang: { type: String, required: true },
  order: { type: Number, required: true },
  homonym: { type: Number, required: true },
  attr: { type: String, required: true },
  text: { type: String, required: true },
  hash: { type: String, required: true },
  groupName: { type: String, required: true },
  _topic: { type: Schema.Types.ObjectId, required: true, ref: 'Topic' }
})

schema.index({ word: 1, order: 1 })

export default model<LemmaDocument>('Lemma', schema)

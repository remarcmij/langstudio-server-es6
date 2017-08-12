import { Schema, Document, model } from 'mongoose'

export interface WordLangPair {
  word: string
  lang: string
}

export interface WordDocument extends WordLangPair, Document {}

const schema = new Schema({
  word: { type: String, required: true, index: true },
  lang: { type: String, required: true }
})

export default model<WordDocument>('Word', schema)

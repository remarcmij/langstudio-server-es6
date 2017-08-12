import { Schema, Document, model } from 'mongoose'

export interface Paragraph {
  word: string
  wordLang: string
  content: string
  baseLang: string
  targetLang: string
  groupName: string
  _topic?: any
}

export interface ParagraphDocument extends Paragraph, Document {}

const schema = new Schema({
  word: { type: String, required: true, index: true },
  wordLang: { type: String, required: true },
  content: { type: String, required: true },
  baseLang: { type: String, required: true },
  targetLang: { type: String, required: true },
  groupName: { type: String, required: true },
  _topic: { type: Schema.Types.ObjectId, index: true, ref: 'Topic' }
})

export default model<ParagraphDocument>('Paragraph', schema)

import {Dictionary} from 'lodash'

const headerStart = /<!-- header -->/
const headerEnd = /<!-- endHeader -->/
const headerDiv = /<!-- +(.*?): +(.*?) +-->/g

const defaultProps  = {
  groupName: 'public',
  sortIndex: 0
}

// export interface HeaderProps extends Dictionary<string> {
//   type: string
//   fileName: string
//   publication: string
//   chapter: string
//   title: string
//   subtitle?: string
// }

export function parseHeaderProps(text: string): Dictionary<string> {
  const headerProps: Dictionary<string> = { }
  Object.assign(headerProps, defaultProps)

  const headerBounds = getHeaderBounds(text)
  const headerText = text.substring(headerBounds[0], headerBounds[1])

  headerDiv.lastIndex = 0
  let match = headerDiv.exec(headerText)

  while (match) {
    const [name, value] = match.slice(1, 3)
    headerProps[name] = value
    match = headerDiv.exec(headerText)
  }

  return headerProps
}

export function removeHeader(text: string) {
  const headerBounds = getHeaderBounds(text)
  return text.substring(headerBounds[1])
}

function getHeaderBounds(text: string) {
  const matchBegin = text.match(headerStart)
  if (!matchBegin) {
    throw new Error('missing header section')
  }
  const startPos = matchBegin.index

  const matchEnd = text.match(headerEnd)
  if (!matchEnd || matchEnd.index < startPos) {
    throw new Error('missing section closing tag')
  }

  const endPos = matchEnd.index + matchEnd[0].length
  return [startPos, endPos]
}

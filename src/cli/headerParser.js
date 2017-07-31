'use strict'

const headerStart = /<!-- header -->/
const headerEnd = /<!-- endHeader -->/
const headerDiv = /<!-- +(.*?): +(.*?) +-->/g

const defaultProps = {
  groupName: 'public',
  sortIndex: 0
}

function parseHeaderProps(text) {
  const headerProps = { ...defaultProps }
  const headerBounds = getHeaderBounds(text)
  const headerText = text.substring(headerBounds[0], headerBounds[1])

  headerDiv.lastIndex = 0
  let match = headerDiv.exec(headerText)

  while (match) {
    const [name, value] = match.slice(1, 3)
    headerProps[name] = /^\d+$/.test(value) ? +value : value
    match = headerDiv.exec(headerText)
  }

  return headerProps
}

function removeHeader(text) {
  const headerBounds = getHeaderBounds(text)
  return text.substring(headerBounds[1])
}

function getHeaderBounds(text) {
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

module.exports = {
  parseHeaderProps,
  removeHeader
}

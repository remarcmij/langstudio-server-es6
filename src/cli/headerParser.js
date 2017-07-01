'use strict'

const HEADER_START_REGEXP = /<!-- header -->/
const HEADER_END_REGEXP = /<!-- endHeader -->/
const HEADER_DIV_REGEXP = /<!-- +(.*?): +(.*?) +-->/g

const defaultProps = {
  groupName: 'public',
  sortIndex: 0
}

function parseHeaderProps(text) {
  const headerProps = Object.assign({}, defaultProps)
  const headerBounds = getHeaderBounds(text)
  const headerText = text.substring(headerBounds[0], headerBounds[1])

  HEADER_DIV_REGEXP.lastIndex = 0
  let match = HEADER_DIV_REGEXP.exec(headerText)

  while (match) {
    const [name, value] = match.slice(1, 3)
    headerProps[name] = /^\d+$/.test(value) ? +value : value
    match = HEADER_DIV_REGEXP.exec(headerText)
  }

  return headerProps
}

function removeHeader(text) {
  const headerBounds = getHeaderBounds(text)
  return text.substring(headerBounds[1])
}

function getHeaderBounds(text) {
  const startMatch = text.match(HEADER_START_REGEXP)
  if (!startMatch) {
    throw new Error('missing header section')
  }
  const startPos = startMatch.index

  const endMatch = text.match(HEADER_END_REGEXP)
  if (!endMatch || endMatch.index < startPos) {
    throw new Error('missing section closing tag')
  }

  const endPos = endMatch.index + endMatch[0].length
  return [startPos, endPos]
}

module.exports = {
  parseHeaderProps,
  removeHeader
}

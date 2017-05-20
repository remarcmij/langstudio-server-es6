'use strict'

const HEADER_START_REGEXP = /<!-- header -->/
const HEADER_END_REGEXP = /<!-- endHeader -->/
const HEADER_DIV_REGEXP = /<!-- +(.*?): +(.*?) +-->/g

function parseHeader(text) {
  const headerMap = new Map()
  const headerBounds = getHeaderBounds(text)
  const headerText = text.substring(headerBounds[0], headerBounds[1])

  HEADER_DIV_REGEXP.lastIndex = 0
  let divMatch = HEADER_DIV_REGEXP.exec(headerText)

  while (divMatch) {
    headerMap.set(divMatch[1], divMatch[2])
    divMatch = HEADER_DIV_REGEXP.exec(headerText)
  }

  return headerMap
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
  parseHeader,
  removeHeader
}

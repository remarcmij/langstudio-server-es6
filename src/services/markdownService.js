'use strict'
const XRegExp = require('xregexp')
const marked = require('marked')

const foreignFragmentRegExp = /\*{1,2}.+?\*{1,2}/g
const foreignWordRegExp = XRegExp(String.raw `([-'()\p{L}]{2,})|(<.+?>)`, 'g')

function convertMarkdown(text) {
    const markup = markupFragments(text)

    const html = marked(markup, {
        breaks: true,
        smartypants: false
    })

    return html.replace(/<table>/gm, '<table class=\'table\'>')
}

function markupFragments(text) {
    let buffer = ''
    let start = 0
    foreignFragmentRegExp.lastIndex = 0
    let match = foreignFragmentRegExp.exec(text)

    while (match) {
        const fragment = match[0]
        const end = foreignFragmentRegExp.lastIndex - fragment.length
        buffer = buffer.concat(text.slice(start, end))
        start = foreignFragmentRegExp.lastIndex
        buffer += markupFragment(fragment)
        match = foreignFragmentRegExp.exec(text)
    }

    buffer += text.slice(start)
    return buffer
}

function markupFragment(text) {
    let buffer = ''

    let start = 0
    foreignWordRegExp.lastIndex = 0
    let match = foreignWordRegExp.exec(text)

    while (match) {
        const replacement = match[1] ? `<span>${match[1]}</span>` : match[2]
        const end = foreignWordRegExp.lastIndex - match[0].length
        buffer += text.slice(start, end)
        start = foreignWordRegExp.lastIndex
        buffer += replacement
        match = foreignWordRegExp.exec(text)
    }

    buffer += text.slice(start)
    return buffer
}

module.exports = {
  convertMarkdown
}

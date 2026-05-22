module.exports = function separateBoldFragments (text) {
  const boldRegex = /\*([^*]+)\*/g

  const fragments = []
  let lastIndex = 0
  let match

  while ((match = boldRegex.exec(text)) !== null) {
    /* istanbul ignore else */
    if (match.index > lastIndex) {
      fragments.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }

    fragments.push({
      type: 'bold',
      content: match[1]
    })

    lastIndex = boldRegex.lastIndex
  }

  /* istanbul ignore else */
  if (lastIndex < text.length) {
    fragments.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  return fragments
}

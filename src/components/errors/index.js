
'use strict'

module.exports[404] = function pageNotFound(req, res) {
  const viewFilePath = '404'
  const status = 404
  const result = { status }

  res.status(result.status)
  res.render(viewFilePath, err => {
    if (err) {
      return void res.status(result.status).json(result)
    }
    res.render(viewFilePath)
  })
}

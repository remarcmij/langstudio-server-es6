'use strict'
const httpRequest = require('request')
// require('request-debug')(httpRequest)
const log = require('../../services/logService')
const config = require('../../config/environment')

const FilesUri = 'https://www.googleapis.com/drive/v3/files'
const UploadUri = 'https://www.googleapis.com/upload/drive/v3/files'

module.exports = {
  getAccessToken,
  get,
  post,
  patch
}

function getAccessToken(user) {
  return new Promise((resolve, reject) => {
    if (!user.refreshToken) {
      return reject(new Error(`no refresh_token available for user ${user.email}`))
    }
    log.debug(`requesting Google access token`)
    httpRequest.post('https://www.googleapis.com/oauth2/v4/token', {
      form: {
        refresh_token: user.refreshToken,
        client_id: config.google.clientID,
        client_secret: config.google.clientSecret,
        grant_type: 'refresh_token'
      },
      json: true
    }, (error, response, body) => {
      if (handleError(reject, error, body)) {
        return
      }

      log.debug(`received Google access_token '${body.access_token}''`)
      resolve(body.access_token)
    })
  })
}

function get(accessToken, options, fileId) {
  options = options || {}
  options.auth = {
    bearer: accessToken
  }

  let uri = FilesUri
  if (fileId) {
    uri += '/' + fileId
  }

  return new Promise((resolve, reject) => {
    httpRequest.get(uri,
      options, (error, response, body) => {
        const contentType = response.headers['content-type']
        if (contentType.toLowerCase().indexOf('application/json') !== -1) {
          const json = JSON.parse(body)
          if (json.error) {
            reject(new Error(json.error_description))
          } else {
            resolve(json)
          }
        } else {
          resolve(body)
        }
      })
  })
}

function post(accessToken, options, upload) {
  options = options || {}
  options.json = true
  options.auth = {
    bearer: accessToken
  }

  return new Promise((resolve, reject) => {
    httpRequest.post(upload === 'upload' ? UploadUri : FilesUri,
      options, (error, response, body) => {
        if (!handleError(reject, error, body)) {
          resolve(body)
        }
      })
  })
}

function patch(accessToken, fileId, options) {
  options = options || {}
  options.json = true
  options.auth = {
    bearer: accessToken
  }

  return new Promise((resolve, reject) => {
    httpRequest.patch(UploadUri + '/' + fileId,
      options, (error, response, body) => {
        if (!handleError(reject, error, body)) {
          resolve(body)
        }
      })
  })
}

function handleError(reject, error, body) {
  if (error) {
    reject(error)
    return true
  }

  if (body.error) {
    reject(new Error(`Google Drive error: ${body.error_description}`))
    return true
  }

  return false
}

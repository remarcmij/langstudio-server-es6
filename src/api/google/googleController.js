'use strict'
const log = require('../../services/logService')
const googleDrive = require('../../auth/google/googleDrive')

const DATA_FOLDER_NAME = 'belajar'
const APP_DATA_FOLDER = 'appDataFolder'
const KIND_FILE_LIST = 'drive#fileList'
const KIND_FILE = 'drive#file'
const APP_SETTINGS_FILE = 'settings.json'

function getFile(req, res) {
  if (!assertGoogleUser(req.user)) {
    return void res.sendStatus(401)
  }

  const filename = req.params.name
  if (!filename) {
    log.error(`google.controller.getFile: incomplete request: missing filename`, req)
    return void res.sendStatus(400)
  }

  googleDrive.getAccessToken(req.user)
    .then(accessToken => {

      log.debug(`google.controller.getFile: attempting to get fileResource for: ${filename}`, req)

      return googleDrive.get(accessToken, {
        qs: {
          spaces: 'drive',
          q: `name='${filename}' and trashed=false`,
          orderBy: 'modifiedTime desc'
        }
      }).then(fileList => {
        assertKind(fileList, KIND_FILE_LIST, 'getFile')

        if (fileList.files.length === 0) {
          log.debug(`google.controller.getFile: file not found`, req)
          return void res.sendStatus(404)
        }

        log.debug(`google.controller.getFile: received fileResource - now attempting to get file data`, req)

        return googleDrive.get(accessToken, {
          qs: {
            alt: 'media'
          }
        }, fileList.files[0].id)
          .then(data => {
            log.debug(`google.controller.getFile: received file data`, req)
            res.json({ text: data })
          })
      })
    }).catch(err => {
      log.error(`google.controller.getFile: ${err.toString()}`, req)
      res.json({ error: err.message })
    })
}

function getSettings(req, res) {
  if (!assertGoogleUser(req.user)) {
    return void res.sendStatus(401)
  }

  googleDrive.getAccessToken(req.user)
    .then(accessToken => {

      log.debug(`google.controller.getSettings: attempting to get fileResource for: ${APP_SETTINGS_FILE}`, req)

      return googleDrive.get(accessToken, {
        qs: {
          spaces: APP_DATA_FOLDER,
          q: `name='${APP_SETTINGS_FILE}' and trashed=false`,
          orderBy: 'modifiedTime desc'
        }
      }).then(fileList => {
        assertKind(fileList, KIND_FILE_LIST, 'getSettings')

        if (fileList.files.length === 0) {
          log.debug(`google.controller.getSettings: file not found`, req)
          return void res.sendStatus(404)
        }

        log.debug(`google.controller.getSettings: received fileResource - now attempting to get file data`, req)

        return googleDrive.get(accessToken, {
          qs: {
            alt: 'media'
          }
        }, fileList.files[0].id)
          .then(data => {
            log.debug(`google.controller.getSettings: received file data`, req)
            res.json({ text: data })
          })
      })
    }).catch(err => {
      log.error(`google.controller.getSettings: ${err.message}`, req)
      res.json({ error: err.message })
    })
}

function saveFile(req, res) {
  if (!assertGoogleUser(req.user)) {
    return void res.sendStatus(401)
  }

  const filename = req.params.name
  const clientData = req.body

  if (!filename || !clientData) {
    log.error(`google.controller.saveFile: incomplete request: missing filename or request body`, req)
    return void res.sendStatus(400)
  }

  googleDrive.getAccessToken(req.user)
    .then(accessToken => {
      log.debug(`google.controller.saveFile: checking if file exists: ${filename}`, req)

      return googleDrive.get(accessToken, {
        qs: {
          spaces: 'drive',
          q: `name='${filename}' and trashed=false`,
          orderBy: 'modifiedTime desc'
        }
      }).then(fileList => {
        assertKind(fileList, KIND_FILE_LIST, 'saveFile')

        if (fileList.files.length === 0) {
          log.debug(`google.controller.saveFile: file doesn't exist - attempting to create`, req)
          return createDataFolderIfNotExists(accessToken)
            .then(parent => {
              assertKind(parent, KIND_FILE, 'saveFile')
              return createFile(accessToken, filename, parent.id, clientData)
                .then(resource => {
                  assertKind(resource, KIND_FILE, 'saveFile')
                  log.debug(`google.controller.saveFile: file created`, req)
                  res.json(resource)
                })
            })
        } else {
          log.debug(`google.controller.saveFile: file exists - attempting to update`, req)
          return updateFile(accessToken, fileList.files[0].id, clientData)
            .then(resource => {
              assertKind(resource, KIND_FILE, 'saveFile')
              log.debug(`google.controller.saveFile: file updated`, req)
              res.json(resource)
            })
        }
      })
    }).catch(err => {
      log.error(`google.controller.saveFile: error: ${err.message}`)
      res.sendStatus(500)
    })
}

function saveSettings(req, res) {
  if (!assertGoogleUser(req.user)) {
    return void res.sendStatus(401)
  }

  const clientData = req.body

  if (!clientData) {
    log.error(`google.controller.saveSettings: incomplete request: missing filename or request body`, req)
    return void res.sendStatus(400)
  }

  googleDrive.getAccessToken(req.user)
    .then(accessToken => {
      log.debug(`google.controller.saveSettings: checking if file exists: ${APP_SETTINGS_FILE}`, req)

      return googleDrive.get(accessToken, {
        qs: {
          spaces: APP_DATA_FOLDER,
          q: `name='${APP_SETTINGS_FILE}' and trashed=false`,
          orderBy: 'modifiedTime desc'
        }
      }).then(fileList => {
        assertKind(fileList, KIND_FILE_LIST, 'saveSettings')

        if (fileList.files.length === 0) {
          log.debug(`google.controller.saveSettings: file doesn't exist - attempting to create`, req)
          return createFile(accessToken, APP_SETTINGS_FILE, APP_DATA_FOLDER, clientData)
            .then(resource => {
              assertKind(resource, KIND_FILE, 'saveSettings')
              log.debug(`google.controller.saveSettings: file created`)
              res.json(resource)
            })
        } else {
          log.debug(`google.controller.saveSettings: file exists - attempting to update`, req)
          return updateFile(accessToken, fileList.files[0].id, clientData)
            .then(resource => {
              assertKind(resource, KIND_FILE, 'saveFile')
              log.debug(`google.controller.saveSettings: file updated`)
              res.json(resource)
            })
        }
      })
    }).catch(err => {
      log.error(`google.controller.saveSettings: error: ${err.message}`, req)
      res.sendStatus(500)
    })
}

function createFile(accessToken, filename, parentId, clientData) {
  return googleDrive.post(accessToken, {
    qs: {
      uploadType: 'multipart'
    },
    multipart: [
      {
        'content-type': 'application/json; charset=UTF-8',
        body: JSON.stringify({
          name: filename,
          parents: [parentId],
          modifiedTime: new Date(clientData.lastModified).toISOString()
        })
      },
      {
        'content-type': 'text/plain; charset=UTF-8',
        body: clientData.text
      }
    ]
  }, 'upload')
}

function updateFile(accessToken, fileId, clientData) {
  return googleDrive.patch(accessToken, fileId, {
    qs: {
      uploadType: 'multipart'
    },
    multipart: [
      {
        'content-type': 'application/json; charset=UTF-8',
        body: JSON.stringify({
          modifiedTime: new Date(clientData.lastModified).toISOString()
        })
      },
      {
        'content-type': 'text/plain; charset=UTF-8',
        body: clientData.text
      }
    ]
  })
}

function createDataFolderIfNotExists(accessToken) {
  log.debug(`google.controller.createDataFolderIfNotExists: attempting to get app folder fileResource`)

  return getFolderResource(accessToken, DATA_FOLDER_NAME)
    .then(fileList => {
      assertKind(fileList, KIND_FILE_LIST, 'createDataFolderIfNotExists')
      if (fileList.files.length === 1) {
        log.debug(`google.controller.createDataFolderIfNotExists: received app folder fileResource`)
        return fileList.files[0]
      }
      log.debug(`google.controller.createDataFolderIfNotExists: app folder doesn't exist, attempting to create`)
      return googleDrive.post(accessToken, {
        json: true,
        body: {
          mimeType: 'application/vnd.google-apps.folder',
          name: DATA_FOLDER_NAME
        }
      })
    })
}

function getFolderResource(accessToken, folderName) {
  const qs = folderName === APP_DATA_FOLDER
    ? {
      spaces: APP_DATA_FOLDER
    } : {
      spaces: 'drive',
      q: `name='${folderName}'`
    }
  return googleDrive.get(accessToken, { qs })
}

function assertGoogleUser(user) {
  if (user && user.provider === 'google') {
    return true
  }
  log.error(`google.controller.getFile: user is not an authorised Google user`)
  return false
}

function assertKind(resource, expectedKind, functionName) {
  if (resource.kind !== expectedKind) {
    throw new Error(`google.controller.${functionName}: expected '${expectedKind}' but got '${resource.kind}'`)
  }
}

module.exports = {
  getFile,
  getSettings,
  saveFile,
  saveSettings
}


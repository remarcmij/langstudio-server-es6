'use strict'
const path = require('path')
const _ = require('lodash')

function requiredProcessEnv(name){
    if (!process.env[name]) {
        throw new Error('You must set the ' + name + ' environment variable')
    }
    return process.env[name]
}

// All configurations will extend these options
// ============================================
const all = {
    env: process.env.NODE_ENV,

    // Root path of server
    root: path.normalize(__dirname + '/../../..'),

    // Server port
    port: process.env.PORT || 9000,

    // Should we populate the DB with sample data?
    seedDB: true,

    // Secret for session, you will want to change this and make it an environment variable
    // used to sign json webtoken
    secrets: {
        session: 'wordjogger-secret'
    },

    // List of user roles
    userRoles: ['guest', 'user', 'admin'],

    // MongoDB connection options
    mongo: {
        options: {
            db: {
                safe: true
            }
        },
        uri: ''
    },

    facebook: {
        clientID: process.env.FACEBOOK_ID || 'id',
        clientSecret: process.env.FACEBOOK_SECRET || 'secret',
        callbackURL: (process.env.DOMAIN || '') + '/auth/facebook/callback'
    },

    twitter: {
        clientID: process.env.TWITTER_ID || 'id',
        clientSecret: process.env.TWITTER_SECRET || 'secret',
        callbackURL: (process.env.DOMAIN || '') + '/auth/twitter/callback'
    },

    google: {
        clientID: process.env.GOOGLE_ID || 'id',
        clientSecret: process.env.GOOGLE_SECRET || 'secret',
        callbackURL: (process.env.DOMAIN || '') + '/auth/google/callback',
        clientID_iOS: '303788947352-qg1oge6kmiqoemgh8d9l6oru22ill2dp.apps.googleusercontent.com',
        clientID_Android: '303788947352-kqrk1jlhc131eihbbc814kmp1b2se6m4.apps.googleusercontent.com',
        clientID_Android_debug: '477230405700-olb8g08f8flcca3eu6fo9naeu5nukb41.apps.googleusercontent.com',
    },

    dropbox: {
        clientID: process.env.DROPBOX_KEY || 'id',
        clientSecret: process.env.DROPBOX_SECRET || 'secret',
        callbackURL: (process.env.DOMAIN || '') + '/auth/dropbox/callback'
    }
}

// Export the config object based on the NODE_ENV
// ==============================================
module.exports = _.merge(
    all,
    require('./' + process.env.NODE_ENV + '.js') || {})

'use strict'

// Development specific configuration
// ==================================
module.exports = {
    // MongoDB connection options
    mongo: {
        uri: process.env.LOCAL_MONGO_URL
    },

    seedDB: true
}

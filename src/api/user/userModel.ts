import { Schema, Document, model } from 'mongoose'
const crypto = require('crypto')

const AUTH_TYPES = ['google']
export type UserRole = 'user' | 'admin'

export interface User {
  name: string
  email: string
  role: UserRole
  created: Date
  lastAccessed: Date
  disabled: boolean
  groups: string[]
  provider: string
  hashPassword: string
  salt: string
  refreshToken: string
  google?: {
    id: string
    image: {
      url: string
    }
  }
  googleExtra: {}
  settings: {}

  // virtuals
  profile: {
    name: string
    role: string
  }
  authenticate: (plainText: string) => boolean
  password: string
  handle: string
}

interface UserDocument extends User, Document {}

const userSchema = new Schema({
  name: String,
  email: { type: String, lowercase: true },
  role: {
    type: String,
    default: 'user',
    enum: ['user', 'admin']
  },
  created: Date,
  lastAccessed: Date,
  disabled: Boolean,
  groups: [String],
  provider: String,
  hashedPassword: String,
  salt: String,
  refreshToken: String,
  google: {
    id: String,
    image: {
      url: String
    }
  },
  googleExtra: {},
  settings: {},
})

/**
 * Virtuals
 */
userSchema
  .virtual('password')
  .set(function(password: string) {
    this._password = password
    this.salt = this.makeSalt()
    this.hashedPassword = this.encryptPassword(password)
  })
  .get(function() {
    return this._password
  })

// Public profile information
userSchema.virtual('profile').get(function() {
  return {
    name: this.name,
    role: this.role
  }
})

// Non-sensitive info we'll be putting in the token
userSchema.virtual('token').get(function() {
  return {
    _id: this._id,
    role: this.role
  }
})

userSchema.virtual('handle').get(function() {
  return this.email || 'anonymous'
})

/**
 * Validations
 */

// Validate empty email
userSchema.path('email').validate(function(email: string) {
  return !!email.length
}, 'Email cannot be blank')

// Validate empty password
userSchema.path('hashedPassword').validate(function(hashedPassword: string) {
  return !!hashedPassword.length
}, 'Password cannot be blank')

// Validate email is not taken
// schema
//     .path('email')
//     .validate(function (value, respond) {
//         var self = this
//         this.constructor.findOne({ email: value }, function (err, user) {
//             if (err) throw err
//             if (user) {
//                 if (self.id === user.id) return respond(true)
//                 return respond(false)
//             }
//             respond(true)
//         })
//     }, 'The specified email address is already in use.')

function validatePresenceOf(value: string) {
  return !!(value && value.length)
}

/**
 * Pre-save hook
 */
userSchema.pre('save', function(next) {
  if (!this.isNew) {
    return void next()
  }

  if (
    !validatePresenceOf(this.hashedPassword) &&
    AUTH_TYPES.indexOf(this.provider) === -1
  ) {
    next(new Error('Invalid password'))
  } else {
    next()
  }
})

/**
 * Methods
 */

userSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} plainText
   * @return {Boolean}
   * @api public
   */
  authenticate: function(plainText: string) {
    return this.encryptPassword(plainText) === this.hashedPassword
  },

  /**
   * Make salt
   *
   * @return {String}
  * @api public
   */
  makeSalt: function() {
    return crypto.randomBytes(16).toString('base64')
  },

  /**
   * Encrypt password
   *
   * @param {String} password
   * @return {String}
  * @api public
   */
  encryptPassword: function(password: string) {
    if (!password || !this.salt) {
      return ''
    }
    const salt = new Buffer(this.salt, 'base64')
    return crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha1')
      .toString('base64')
  }
}

export default model<UserDocument>('User', userSchema)

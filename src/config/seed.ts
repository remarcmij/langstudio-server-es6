import UserModel from '../api/user/userModel'

const adminEmail = 'admin@taalmap.nl'
const demoUserEmail = 'demo@taalmap.nl'

UserModel.findOne({ email: adminEmail }, (err, user) => {
  if (err) {
    console.error(err)
  } else if (!user) {
    const now = new Date()
    UserModel.create({
      provider: 'local',
      role: 'admin',
      name: 'Admin',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD,
      created: now,
      lastAccessed: now
    }, (err: Error) => {
      if (err) {
        console.log(err.message)
      } else {
        console.log('created admin account')
      }
    })
  }
})

UserModel.findOne({ email: demoUserEmail }, (err, user) => {
  if (err) {
    console.error(err)
  } else if (!user) {
    const now = new Date()
    UserModel.create({
      provider: 'local',
      role: 'user',
      name: 'Demo user',
      email: demoUserEmail,
      password: process.env.DEMO_PASSWORD,
      created: now,
      lastAccessed: now
    }, (err: Error) => {
      if (err) {
        console.log(err.message)
      } else {
        console.log('created demo account')
      }
    })
  }
})

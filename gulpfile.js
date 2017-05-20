'use strict'
const gulp = require('gulp')
const tslint = require('gulp-tslint')
const del = require('del')

const DIST_DIR = 'dist'

gulp.task('tslint', function () {
  return gulp.src(['server/**/*.ts', 'client/**/*.ts', '!**/*.d.ts'])
    .pipe(tslint())
    .pipe(tslint.report('prose', { emitError: false }))
})

gulp.task('clean', (cb) => {
  del([DIST_DIR + '/**/*'])
    .then(() => cb())
})

gulp.task('copy-server', ['clean'], () => {
  return gulp.src([
    'build/**/*',
    '!build/**/*.{ts,map,spec.js}',
  ]).pipe(gulp.dest(DIST_DIR + '/server'))
})

gulp.task('copy-upload', ['clean'], () => {
  return gulp.src([
    'upload/.*',
  ]).pipe(gulp.dest(DIST_DIR + '/upload'))
})

gulp.task('copy-downloads', ['clean'], () => {
  return gulp.src([
    'downloads/*',
  ]).pipe(gulp.dest(DIST_DIR + '/downloads'))
})

gulp.task('copy-views', ['clean'], () => {
  return gulp.src([
    'src/views/*',
  ]).pipe(gulp.dest(DIST_DIR + '/server/views'))
})

gulp.task('copy-package-json', ['clean'], () => {
  return gulp.src([
    'package.json'
  ]).pipe(gulp.dest(DIST_DIR))
})

gulp.task('copy-client', ['clean'], () => {
  return gulp.src([
    '../client/dist/**/*'
  ]).pipe(gulp.dest(DIST_DIR + '/public'))

})

gulp.task('build', [
  'copy-server',
  'copy-upload',
  'copy-downloads',
  'copy-views',
  'copy-package-json',
  'copy-client'
])

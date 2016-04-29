var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var sass = require('gulp-sass');
var browserSync = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var header  = require('gulp-header');
var rename = require('gulp-rename');
var cleanCSS = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var package = require('./package.json');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath)
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

gulp.task('clean', function (done) {
    require('del')([
        dirs.archive,
        dirs.dist
    ], done);
});

gulp.task('copy', function () {
    return gulp.src([
            'src/**/*',
            '!src/css/*.scss',
            '!src/js',
        ])
        .pipe(gulp.dest('dist/'));
});

gulp.task('copy:.htaccess', function () {
    console.log(dirs.dist)
    return gulp.src('node_modules/apache-server-configs/dist/.htaccess')
        .pipe(plugins.replace(/# ErrorDocument/g, 'ErrorDocument'))
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:license', function () {
    return gulp.src('LICENSE.txt')
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:main.css', function () {
    return gulp.src(dirs.src + '/css/main.css')
        .pipe(gulp.dest(dirs.dist + '/css'));
});

gulp.task('copy:index', function () {
    return gulp.src([
        'src/**/*',
        '!src/css/*.scss',
        '!src/js',
    ])
        .pipe(gulp.dest('dist/'));
});

gulp.task('copy:misc', function () {
    return gulp.src([

        // Copy all files
        // dirs.src + '/**/*',
        dirs.src + '/index.html',

        // Exclude the following files
        // (other tasks will handle the copying of these files)
        '!' + dirs.src + '/css/*.scss',
        // '!' + dirs.src + '/index.html'

    ], {

        // Include hidden files by default
        dot: true

    }).pipe(gulp.dest(dirs.src));
});


var banner = [
    '/*!\n' +
    ' * <%= package.name %>\n' +
    ' * <%= package.title %>\n' +
    ' * <%= package.url %>\n' +
    ' * @author <%= package.author %>\n' +
    ' * @version <%= package.version %>\n' +
    ' * Copyright ' + new Date().getFullYear() + '. <%= package.license %> licensed.\n' +
    ' */',
    '\n'
].join('');


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------


gulp.task('js',function(){
    //return gulp.src([dirs.src + '/js/main.js', dirs.src + '/js/main.js', dirs.src + '/js/main.js'])
    //    .pipe(header(banner, { package : package }))
    //    .pipe(gulp.dest(dirs.src + '/js'))
    //    .pipe(uglify())
    //    .pipe(header(banner, { package : package }))
    //    .pipe(rename({ suffix: '.min' }))
    //    .pipe(gulp.dest(dirs.src + '/js'))
    //    .pipe(browserSync.reload({stream:true, once: true}));

    return gulp.src([
            dirs.src + '/js/main.js',
            './node_modules/jquery/dist/jquery.js'
        ])
        .pipe(sourcemaps.init())
        //.pipe(concat())
        .pipe(uglify())
        .pipe(sourcemaps.write('./'))
        .pipe(header(banner, { package : package }))
        .pipe(gulp.dest(dirs.src + '/js'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest(dirs.src + '/js'))
        .pipe(browserSync.reload({stream:true, once: true}))
});


gulp.task('css', function () {
    return gulp.src(dirs.src + '/css/main.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer('last 4 version'))
        .pipe(gulp.dest(dirs.src + '/css'))
        .pipe(cleanCSS())
        .pipe(rename({ suffix: '.min' }))
        .pipe(header(banner, { package : package }))
        .pipe(gulp.dest(dirs.src + '/css'))
        .pipe(browserSync.reload({stream:true}));
});

gulp.task('browser-sync', function() {
    browserSync.init(null, {
        server: {
            baseDir: dirs.src
        }
    });
});

gulp.task('bs-reload', function () {
    browserSync.reload();
});

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
        done);
});

// gulp.task('build', function (done) {
//     runSequence(
//         'copy',
//         // 'clean',
//         done);
// });

gulp.task('build', ['clean', 'copy']);

gulp.task('default', ['build']);

/**
 * `gulp serve`
 * Watches changes to any scss, js and html files
 */
gulp.task('serve', ['css', 'js', 'browser-sync'], function () {
    gulp.watch(dirs.src + '/css/*', ['css', 'bs-reload']);
    gulp.watch(dirs.src + '/*.js', ['js', 'bs-reload']);
    gulp.watch(dirs.src + '/*.html', ['bs-reload']);
});

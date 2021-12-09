// ====== Include gulp
var gulp        = require('gulp');

// ===== Include Plugins
var plumber     	= require('gulp-plumber');
var notify      	= require('gulp-notify');
var concat      	= require('gulp-concat');
var sass        	= require('gulp-sass');
var cleanCSS    	= require('gulp-clean-css');
var rename      	= require('gulp-rename');
var autoprefixer 	= require('gulp-autoprefixer');
var htmlmin 		= require('gulp-htmlmin');


// ===== Variable for output directory
var outputDir   = 'assets/css';


// ====== THE TASK LIST ========
// Comment out the notifys if they bug ya!

var onError = function (err) { 

    notify().write({

        'message' : 'Something is up!',
        'sound': 'Frog'

        });

    console.log(err.toString());
    this.emit('end');

};

// ====== Compile SCSS
gulp.task('sass', function() {
    return gulp.src('assets/sass/main.scss')
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(sass())
        .pipe(rename('style.css'))
        .pipe(gulp.dest(outputDir))
        .pipe(notify({
            
            title: 'Success',
            message: 'SCSS to CSS - Successful',
            'icon': 'Terminal Icon', // Absolute Path to Triggering Icon
            'contentImage': void 0 // Absolute Path to Attached Image (Content Image)

            }))
});

// ===== Compile Final Production Sass with 'gulp build'
gulp.task('prosass', function() {
    return gulp.src('assets/sass/main.scss')
        .pipe(plumber())
        .pipe(sass())
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(cleanCSS({debug: true}, function(details) {
            console.log(details.name + ': ' + details.stats.originalSize);
            console.log(details.name + ': ' + details.stats.minifiedSize);
        }))
        .pipe(rename('style.min.css'))
        .pipe(gulp.dest(outputDir))
        .pipe(notify('Production Scss - Successful'));
      return gulp.src('index.php')
    	.pipe(htmlmin({collapseWhitespace: true}))
    	.pipe(gulp.dest('dist'))
    	.pipe(notify('HTML Minified!'));
});

// ====== Watch Task with 'gulp watch'
gulp.task('watch', function() {
 
    gulp.watch('assets/sass/**/*.scss', ['sass'])

});

// ===== Default Task
gulp.task('default', ['watch']);


// ===== Production Build Task
gulp.task('build', ['prosass']);
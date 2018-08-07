const gulp = require('gulp');

const compile = {
	scss: require('../swiss-army-knife/gulpfiles/compileSCSS'),
	js: require('../swiss-army-knife/gulpfiles/compileJS'),
	html: require('../swiss-army-knife/gulpfiles/compileHTML')
};
const watcher = require('../swiss-army-knife/gulpfiles/watcher');

const Log = require('../swiss-army-knife/js/_log');

gulp.task('compile-js', function(){
	compile.js('client/public/js');
});

gulp.task('compile-css', function(){
	compile.scss('client/public/css');
});

gulp.task('compile-html', function(){
	compile.html('client/public');
});

gulp.task('compile', ['compile-js', 'compile-css', 'compile-html']);

gulp.task('default', ['compile']);

gulp.task('dev', ['compile'], function(){
	watcher(gulp);
});

gulp.task('dist', function(){
	gulp.src('server/*').pipe(gulp.dest('dist'));
	gulp.src('server/**/*').pipe(gulp.dest('dist'));

	gulp.src('client/public/js/*').pipe(gulp.dest('dist/public/js'));
	gulp.src('client/public/css/*').pipe(gulp.dest('dist/public/css'));
	gulp.src('client/public/html/*').pipe(gulp.dest('dist/public/html'));

	gulp.src('../swiss-army-knife/client/fonts/*').pipe(gulp.dest('dist/public/fonts'));

	gulp.src('../swiss-army-knife/js/_log.js').pipe(gulp.dest('dist'));
	gulp.src('../swiss-army-knife/js/_common.js').pipe(gulp.dest('dist'));
});
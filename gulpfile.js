const fs = require('fs');
const exec = require('child_process').exec;

const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');//&& babel-core && babel-preset-env
const concat = require('gulp-concat');

const Log = require(`${__dirname}/../swiss-army-knife/js/_log.js`);

const autoprefixerOptions = {
	flexBox: 'no-2009',
	browsers: ['last 10 versions'],
	cascade: false
};

const babelOptions = {
	presets: ['env']
};

function notify(message){
	Log(1)(`NOTIFICATION : ${message}`);

	exec(`notify-send ${message}`);
}

function browse(folder, cb){
	var folders = [];

	exec('ls -d "'+ folder +'"/*/', function(err, stdout){
		var folderNames = stdout.split('\n');

		folderNames.forEach(function(folderName){
			if(folderName && folderName.length) folders.push(/\/([^\/]*?)\/$/.exec(folderName)[1]);
		});

		var files = [];

		exec('ls -p "'+ folder +'/" | grep -v /', function(err, stdout){
			var fileNames = stdout.split('\n');

			fileNames.forEach(function(fileName){
				if(fileName && fileName.length) files.push(fileName);
			});

			cb({ folder: folder, folders: folders, files: files });
		});
	});
}

function concatJS(name, files, applyBabel){
	Log(1)(`building js file: ${name} ${files} with ${(applyBabel ? '' : ' NO')} babel`);

	var proc = gulp.src(files).pipe(concat(`${name}.js`));

	if(applyBabel) proc.pipe(babel(babelOptions));

	proc.pipe(gulp.dest('client/public/js'));
}

function createHTML(name, includes){
	var htmlIncludes = includes.slice(0);
	htmlIncludes.push(name +'.js');
	htmlIncludes.push(name +'.css');

	Log(1)(`building html file: ${name} ${htmlIncludes}`);

	var includesHTML = '', includeHTML_part;
	for(var x = 0; x < htmlIncludes.length; x++){
		includeHTML_part = htmlIncludes[x].endsWith('.js') ? `<script src="/js/${htmlIncludes[x]}"></script>` : `<link rel="stylesheet" href="/css/${htmlIncludes[x]}">`;
		includesHTML += `\n\t\t${includeHTML_part}`;
	}

	fs.writeFile(`./client/public/html/_includes_${name}.html`, includesHTML, function(){
		gulp.src([
			'./client/html/_start.html',
			`./client/public/html/_includes_${name}.html`,
			'./client/html/_pageEnd.html',
		]).pipe(concat(`_${name}_01.html`)).pipe(gulp.dest('client/public/html')).on('finish', function(){
			exec(`sed -e "s/XXX/${name.charAt(0).toUpperCase() + name.slice(1)}/g" ./client/public/html/_${name}_01.html > ./client/public/html/${name}.html`);
			exec(`cd ./client/public/html && rm ./_${name}_01.html ./_includes_${name}.html`);
		});
	});
}

gulp.task('compile', ['generate-html', 'compile-js', 'compile-css']);

gulp.task('dev', ['compile'], function(){
	exec('curl localhost/dev || wget localhost/dev');

	notify('done!');
});

gulp.task('dist', ['compile'], function(){
	gulp.src('server/*').pipe(gulp.dest('dist'));
	gulp.src('server/**/*').pipe(gulp.dest('dist'));

	gulp.src('scripts/start').pipe(gulp.dest('dist'));

	gulp.src('client/public/js/*').pipe(gulp.dest('dist/public/js'));
	gulp.src('client/public/css/*').pipe(gulp.dest('dist/public/css'));
	gulp.src('client/public/html/*').pipe(gulp.dest('dist/public/html'));

	gulp.src('../swiss-army-knife/fonts/*').pipe(gulp.dest('dist/public/fonts'));

	gulp.src('../swiss-army-knife/js/_log.js').pipe(gulp.dest('dist'));
	gulp.src('../swiss-army-knife/js/_common.js').pipe(gulp.dest('dist'));

	notify('done!');
});

gulp.task('compile-js', function(){
	browse('./client/js', function(data){
		Log(2)(data);

		for(var x = 0; x < data.folders.length; x++){
			browse(data.folder +'/'+ data.folders[x], function(folderData){
				Log(2)(folderData);

				var outputSettings;

				if(folderData.files.includes('output.json')){
					folderData.files.splice(folderData.files.indexOf('output.json'), 1);

					Log(2)('reading: '+ folderData.folder +'/output.json');
					fs.readFile(folderData.folder +'/output.json', function(err, data){
						outputSettings = JSON.parse(data);

						Log(2)(outputSettings);

						for(var y = 0; y < folderData.files.length; y++){
							folderData.files[y] = folderData.folder +'/'+ folderData.files[y];
						}

						if(outputSettings && outputSettings.includes) folderData.files = outputSettings.includes.concat(folderData.files);

						var name = folderData.folder.replace(/\.?\.?\/(\w+\/)+/, '');

						concatJS(name, folderData.files, outputSettings ? outputSettings.babel : false);
					});
				}
			});
		}
	});
});

gulp.task('generate-html', function(){
	exec('mkdir -p ./client/public/html');

	gulp.src([
		'./client/html/_start.html',
		'./client/html/_errorEnd.html',
	]).pipe(concat('error.html')).pipe(gulp.dest('client/public/html'));

	fs.readFile('./client/html/output.json', function(err, data){
		if(data){
			var outputSettings = JSON.parse(data);
			Log(2)(outputSettings);

			for(var x = 0; x < outputSettings.pages.length; x++){
				createHTML(outputSettings.pages[x], outputSettings.page_includes);
			}
		}
	});
});

gulp.task('compile-css', function(){
	fs.readFile('./client/scss/depends.json', function(err, data){
		if(data){
			var dependsArr = JSON.parse(data);
			dependsArr.push('client/scss/*.scss', 'client/scss/**/*.scss');

			Log(2)(dependsArr);

			gulp.src(dependsArr).pipe(gulp.dest('client/public/css'));

			setTimeout(function(){
				gulp.src('client/public/css/*.scss').pipe(sass().on('error', sass.logError)).pipe(autoprefixer(autoprefixerOptions)).pipe(gulp.dest('client/public/css'));

				exec(`sleep ${Math.ceil(0.2 * dependsArr.length)}s && cd ./client/public/css && rm ./*.scss`);
			}, 100 * dependsArr.length);
		}
	});
});
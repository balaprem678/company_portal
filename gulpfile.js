// grab our gulp packages
var gulp = require('gulp'),
	exec = require('child_process').exec,
	// uglify = require("gulp-uglify"),
	uglify = require('gulp-uglify-es').default,
	concat = require('gulp-concat'),
	minifyCss = require('gulp-minify-css'),
	inject = require('gulp-inject'),
	hash = require('gulp-hash-filename'),
	es = require('event-stream'),
	series = require('stream-series'),
	config = require('./config/gulp.json'),
	siteConfig = require('./config/config.json'),
	fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var data = require('gulp-data');

var environment = 'development'; //development or production


// Admin Task

gulp.task('admin-development', done => {
	var CSSvendorStream = gulp.src(config.admin.vendor.css.src, { read: false });
	var CSSappStream = gulp.src(config.admin.app.css.src, { read: false });
	var JSvendorStream = gulp.src(config.admin.vendor.js.src, { read: false });
	var JSappStream = gulp.src(config.admin.app.js.src, { read: false });

	gulp.src('./views/admin/layout.pug')
		.pipe(inject(series(CSSvendorStream, CSSappStream, JSvendorStream, JSappStream)))
		.pipe(gulp.dest('./views/admin'));
	done();
});

gulp.task('admin-production', done => {
	var CSSvendorStream = gulp.src(config.admin.vendor.css.src)
		.pipe(concat('vendor.min.css'))
		.pipe(minifyCss({ compatibility: 'ie8' }))
		.pipe(gulp.dest(config.admin.vendor.css.dest));

	var CSSappStream = gulp.src(config.admin.app.css.src)
		.pipe(concat('style.min.css'))
		.pipe(gulp.dest(config.admin.vendor.css.dest));

	var JSvendorStream = gulp.src(config.admin.vendor.js.src)
		.pipe(concat('vendor.min.js'))
		.pipe(uglify({ mangle: false }).on('error', function (e) { console.log('error'); }))
		.pipe(hash())
		.pipe(gulp.dest(config.admin.vendor.js.dest));

	var JSappStream = gulp.src(config.admin.app.js.src)
		.pipe(concat('main.min.js'))
		//.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
		.pipe(hash())
		.pipe(gulp.dest(config.admin.vendor.js.dest));

	gulp.src('./views/admin/layout.pug')
		.pipe(inject(series(CSSvendorStream, CSSappStream, JSvendorStream, JSappStream)))
		.pipe(gulp.dest('./views/admin'));
	done();
});
// Admin Task
/* gulp.task('admin-development', function () {
	var CSSvendorStream = gulp.src(config.admin.vendor.css.src, { read: false });
	var CSSappStream = gulp.src(config.admin.app.css.src, { read: false });
	var JSvendorStream = gulp.src(config.admin.vendor.js.src, { read: false });
	var JSappStream = gulp.src(config.admin.app.js.src, { read: false });

	gulp.src('./views/admin/layout.pug')
		.pipe(inject(series(CSSvendorStream, CSSappStream, JSvendorStream, JSappStream)))
		.pipe(gulp.dest('./views/admin'));
}); */
/* gulp.task('admin-production', function () {
	var CSSvendorStream = gulp.src(config.admin.vendor.css.src)
		.pipe(concat('vendor.min.css'))
		.pipe(minifyCss({ compatibility: 'ie8' }))
		.pipe(gulp.dest(config.admin.vendor.css.dest));

	var CSSappStream = gulp.src(config.admin.app.css.src)
		.pipe(concat('style.min.css'))
		.pipe(gulp.dest(config.admin.vendor.css.dest));

	var JSvendorStream = gulp.src(config.admin.vendor.js.src)
		.pipe(concat('vendor.min.js'))
		.pipe(uglify({ mangle: false }).on('error', function (e) { console.log('error'); }))
		.pipe(hash())
		.pipe(gulp.dest(config.admin.vendor.js.dest));

	var JSappStream = gulp.src(config.admin.app.js.src)
		.pipe(concat('main.min.js'))
		//.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
		.pipe(hash())
		.pipe(gulp.dest(config.admin.vendor.js.dest));

	gulp.src('./views/admin/layout.pug')
		.pipe(inject(series(CSSvendorStream, CSSappStream, JSvendorStream, JSappStream)))
		.pipe(gulp.dest('./views/admin'));
}); */



// Site Task

gulp.task('site-development', done => {
	for (var i = 0; i < config.site.length; i++) {
		var CSSvendorStream = gulp.src(config.site[i].vendor.css.src, { read: false });
		var JSvendorStream = [];
		for (var group in config.site[i].vendor.js.src) {
			JSvendorStream[group] = gulp.src(config.site[i].vendor.js.src[group], { read: false });
		}

		var JSappStream = gulp.src(config.site[i].app.js.src, { read: false });

		gulp.src('./views/site/layout.pug')
			.pipe(inject(series(CSSvendorStream, JSvendorStream['group1'], JSvendorStream['group2'], JSvendorStream['group3'], JSappStream)))
			.pipe(gulp.dest('./views/site'));
		done();
	}
});
gulp.task('site-production', done => {
	try{
		var hashFormat = "{name}.min{ext}";
		if (environment == 'production') {
			hashFormat = "{name}.{hash}.min{ext}";
		}
		for (var i = 0; i < config.site.length; i++) {
			var CSSvendorStream = gulp.src(config.site[i].vendor.css.src)
				.pipe(concat('vendor.css'))
				.pipe(hash({ "format": hashFormat }))
				.pipe(gulp.dest(config.site[i].vendor.css.dest));

			var JSvendorStream = [];
			for (var group in config.site[i].vendor.js.src) {
				JSvendorStream[group] = gulp.src(config.site[i].vendor.js.src[group])
					.pipe(concat(group + '.js'))
					.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
					.pipe(hash({ "format": hashFormat }))
					.pipe(gulp.dest(config.site[i].vendor.js.dest));
			}

			var JSappStream = gulp.src(config.site[i].app.js.src)
				.pipe(concat('main.js'))
				.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
				.pipe(hash({ "format": hashFormat }))
				.pipe(gulp.dest(config.site[i].vendor.js.dest));

			gulp.src('./views/site/layout.pug')
				.pipe(inject(series(CSSvendorStream, JSvendorStream['group1'], JSvendorStream['group2'], JSvendorStream['group3'], JSappStream)))
				.pipe(gulp.dest('./views/site'));
			done();
		}
	}catch(e){
		console.log('v',e)
	}
	
});
/* gulp.task('site-development', function () {
	for (var i = 0; i < config.site.length; i++) {
		var CSSvendorStream = gulp.src(config.site[i].vendor.css.src, { read: false });
		var JSvendorStream = [];
		for (var group in config.site[i].vendor.js.src) {
			JSvendorStream[group] = gulp.src(config.site[i].vendor.js.src[group], { read: false });
		}

		var JSappStream = gulp.src(config.site[i].app.js.src, { read: false });

		gulp.src('./views/site/layout.pug')
			.pipe(inject(series(CSSvendorStream, JSvendorStream['group1'], JSvendorStream['group2'], JSvendorStream['group3'], JSappStream)))
			.pipe(gulp.dest('./views/site'));
	}
}); */


/* gulp.task('site-production', function () {
	try{
		var hashFormat = "{name}.min{ext}";
		if (environment == 'production') {
			hashFormat = "{name}.{hash}.min{ext}";
		}
		for (var i = 0; i < config.site.length; i++) {
			var CSSvendorStream = gulp.src(config.site[i].vendor.css.src)
				.pipe(concat('vendor.css'))
				.pipe(hash({ "format": hashFormat }))
				.pipe(gulp.dest(config.site[i].vendor.css.dest));

			var JSvendorStream = [];
			for (var group in config.site[i].vendor.js.src) {
				JSvendorStream[group] = gulp.src(config.site[i].vendor.js.src[group])
					.pipe(concat(group + '.js'))
					.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
					.pipe(hash({ "format": hashFormat }))
					.pipe(gulp.dest(config.site[i].vendor.js.dest));
			}

			var JSappStream = gulp.src(config.site[i].app.js.src)
				.pipe(concat('main.js'))
				.pipe(uglify({ mangle: false }).on('error', function (e) { console.log(e); }))
				.pipe(hash({ "format": hashFormat }))
				.pipe(gulp.dest(config.site[i].vendor.js.dest));

			gulp.src('./views/site/layout.pug')
				.pipe(inject(series(CSSvendorStream, JSvendorStream['group1'], JSvendorStream['group2'], JSvendorStream['group3'], JSappStream)))
				.pipe(gulp.dest('./views/site'));
		}
	}catch(e){
		console.log('v',e)
	}
	
}); */


// Site Task


gulp.task("mongo", function (cb) {
	var mongodump = 'mongodump --host ' + siteConfig.mongodb.host + ' --port ' + siteConfig.mongodb.port + ' --db ' + siteConfig.mongodb.database + ' --out db';
	var copy = 'xcopy /Y db\\' + siteConfig.mongodb.database + '\\*.* db';
	var remove = 'rmdir /s/q db\\' + siteConfig.mongodb.database;

	exec(mongodump, function (err, stdout, stderr) {
		if (err) {
			cb(err);
		} else {
			exec(copy, function (err, stdout, stderr) {
				if (err) {
					cb(err);
				} else {
					exec(remove, function (err, stdout, stderr) {
						if (err) {
							cb(err);
						} else {
							cb(stdout, stderr);
						}
					});
				}
			});
		}
	});
});

gulp.task("setupfile", function (cb) {
	fs.readFile('./config/config.json', "utf8", function (error, data) {
		var config = JSON.parse(data)
		config.port = '';
		config.mongodb.host = '';
		config.mongodb.port = '';
		config.mongodb.database = '';
		fs.writeFile('./config/setup.json', JSON.stringify(config, null, 4), function (err, respo) { });
	});
});

gulp.task("flush", function () {
    var collections = ['users','newsletter','ratings','walletReacharge','notifications','drivers','restaurant','food','orders','cart','temp_cart','transaction','billing','driver_earnings','restaurant_earnings','driver_wallet'];
    MongoClient.connect('mongodb://' + siteConfig.mongodb.host + ':' + siteConfig.mongodb.port + '/' + siteConfig.mongodb.database, function (err, db) {
        for (var i = 0; i < collections.length; i++) {
            db.collection(collections[i]).remove({});
        }
    });
});
/*gulp.task('production', ['admin-production']);
gulp.task('development', ['admin-development']);
gulp.task('default', ['sass', 'sass-watch']);
gulp.task('production', ['site-production', 'admin-production']);
gulp.task('development', ['site-development', 'admin-development']);
gulp.task('setup', ['mongo', 'setupfile', 'production']); */


gulp.task('production', gulp.series('site-production', 'admin-production'));
gulp.task('development', gulp.series('site-development', 'admin-development'));
gulp.task('setup', gulp.series('mongo', 'setupfile', 'production'));

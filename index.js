
var extend = require('extend');
var async = require('async');
var fs = require('fs');
var xml2js = require('xml2js');
var _ = require('underscore');
var moment = require('moment');
var noop = function(){};
var logPrefix = '[nodebb-plugin-import-disqus]';

(function(Exporter) {

	Exporter.setup = function(config, callback) {
		Exporter.log('setup');

		// mysql db only config
		// extract them from the configs passed by the nodebb-plugin-import adapter
		var _config = {};

		Exporter.config(_config);
		Exporter.config('prefix', config.prefix || config.tablePrefix || '');

		config.custom = config.custom || {};
		if (typeof config.custom === 'string') {
			try {
				config.custom = JSON.parse(config.custom)
			} catch (e) {}
		}

		config.custom = config.custom || {};
		config.custom = extend(true, {}, {
			filepath: '',
			nbbIdAttrPrefix: 'nbb:',
			skipSpamPosts: true
		}, config.custom);
		Exporter.config('custom', config.custom);


		var parser = new xml2js.Parser();
		fs.readFile(config.custom.filepath, function(err, data) {
			if (err) {
				return callback(err);
			}

			parser.parseString(data, function (err, parsed) {
				var result = {};

				var _users = {};
				var maybeAddUser = function (user) {
					if (! _users[user.email]) {
						_users[user.email] = user;
					}
				};

				result.categories = parsed.disqus.category.map(function(c) {
						return {
							_cid: c["$"]["dsq:id"],
							_title: c["title"][0]
						};
				});

				result.topics = parsed.disqus.thread.map(function(t) {
					var author = {
						email: key(t, "author.0.email.0"),
						username: key(t, "author.0.username.0"),
						name: key(t, "author.0.name.0"),
						anonymous: !!resolve(key(t, "author.0.anonymous.0"))
					};
					if (!author.anonymous) {
						maybeAddUser(author);
					}

					return {
						_tid: t["$"]["dsq:id"],
						tid: t["$"]["nbb:id"] || t["$"]["nbb:tid"],
						_uemail: author.email,
						_handle: author.username || author.email || author.name,

						_cid: t["category"][0]["$"]["dsq:id"],
						_link: "",
						_title: t["title"][0],
						_content: t["message"][0],
						_timestamp: moment(t["createdAt"][0]).valueOf(),
						_ip: t["ipAddress"][0],
						_locked: resolve(t["isClosed"][0]),
						_deleted: resolve(t["isDeleted"][0])
					};
				});

				result.posts = parsed.disqus.post.map(function(p) {
					var author = {
						email: key(p, "author.0.email.0"),
						username: key(p, "author.0.username.0"),
						name: key(p, "author.0.name.0"),
						anonymous: !!resolve(key(p, "author.0.anonymous.0"))
					};

					if (!author.anonymous) {
						maybeAddUser(author);
					}

					return {
						_pid: p["$"]["dsq:id"],
						_tid: p["thread"][0]["$"]["dsq:id"],
						_uemail: author.email,
						_handle: author.username || author.email || author.name,
						_content: p["message"][0],
						_timestamp: moment(p["createdAt"][0]).valueOf(),
						_ip: p["ipAddress"][0],
						_deleted: resolve(p["isDeleted"][0]),
						_spam: resolve(p["isSpam"][0])
					}
				});
				console.log(JSON.stringify(result, undefined, 2));
				throw "STOP - HAMMER TIME";
			});
		});

	};

	Exporter.countUsers = function (callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.getUsers = function(callback) {
		return Exporter.getPaginatedUsers(0, -1, callback);
	};
	Exporter.getPaginatedUsers = function(start, limit, callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.countCategories = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.getCategories = function(callback) {
		return Exporter.getPaginatedCategories(0, -1, callback);
	};

	Exporter.getPaginatedCategories = function(start, limit, callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.countTopics = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.getTopics = function(callback) {
		return Exporter.getPaginatedTopics(0, -1, callback);
	};
	Exporter.getPaginatedTopics = function(start, limit, callback) {
		callback = !_.isFunction(callback) ? noop : callback;
	};

	Exporter.countPosts = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;

	};

	Exporter.getPosts = function(callback) {
		return Exporter.getPaginatedPosts(0, -1, callback);
	};

	Exporter.getPaginatedPosts = function(start, limit, callback) {
		callback = !_.isFunction(callback) ? noop : callback;
	};

	Exporter.teardown = function(callback) {
		Exporter.log('teardown');
		Exporter.connection.end();

		Exporter.log('Done');
		callback();
	};

	Exporter.testrun = function(config, callback) {
		async.series([
			function(next) {
				Exporter.setup(config, next);
			},
			function(next) {
				Exporter.getUsers(next);
			},
			function(next) {
				Exporter.getCategories(next);
			},
			function(next) {
				Exporter.getTopics(next);
			},
			function(next) {
				Exporter.getPosts(next);
			},
			function(next) {
				Exporter.teardown(next);
			}
		], callback);
	};

	Exporter.paginatedTestrun = function(config, callback) {
		async.series([
			function(next) {
				Exporter.setup(config, next);
			},
			function(next) {
				Exporter.getPaginatedUsers(0, 1000, next);
			},
			function(next) {
				Exporter.getPaginatedCategories(0, 1000, next);
			},
			function(next) {
				Exporter.getPaginatedTopics(0, 1000, next);
			},
			function(next) {
				Exporter.getPaginatedPosts(1001, 2000, next);
			},
			function(next) {
				Exporter.teardown(next);
			}
		], callback);
	};

	Exporter.warn = function() {
		var args = _.toArray(arguments);
		args.unshift(logPrefix);
		console.warn.apply(console, args);
	};

	Exporter.log = function() {
		var args = _.toArray(arguments);
		args.unshift(logPrefix);
		console.log.apply(console, args);
	};

	Exporter.error = function() {
		var args = _.toArray(arguments);
		args.unshift(logPrefix);
		console.error.apply(console, args);
	};

	Exporter.config = function(config, val) {
		if (config != null) {
			if (typeof config === 'object') {
				Exporter._config = config;
			} else if (typeof config === 'string') {
				if (val != null) {
					Exporter._config = Exporter._config || {};
					Exporter._config[config] = val;
				}
				return Exporter._config[config];
			}
		}
		return Exporter._config;
	};

	function resolve (token) {
		if(typeof token != "string")
			return token;
		if (token.length < 15 && token.match(/^-?\d+(\.\d+)?$/))
			return parseFloat(token);
		if(token.match(/^true|false$/i))
			return Boolean( token.match(/true/i));
		if(token === "undefined")
			return undefined;
		if(token === "null")
			token = null;
		return token;
	}

	function key (parent, key) {
		var parts = key.split(".");

		var k, node = parent;
		while( k  = parts.shift() ){
			if( parts.length == 0 ){
				return node[k];
			}
			else if( typeof node[k] == "object" ){
				node = node[k];
			}
			else {
				break;
			}
		}
		return null;
	}

})(module.exports);


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
				var addUser = function (user) {
					if (! _users[user._email]) {
						_users[user._email] = user;
					}
				};
				var grabAuthor = function (obj) {
					return {
						_email: key(obj, "author.0.email.0"),
						_username: key(obj, "author.0.username.0"),
						_name: key(obj, "author.0.name.0"),
						_joindate: moment(key(obj, "createdAt.0")).valueOf(),
						_anonymous: !!resolve(key(obj, "author.0.anonymous.0"))
					};
				};

				result.categories = parsed.disqus.category.map(function(obj, index) {
						return {
							cid: key(obj, "$.nbb:id") || key(obj, "$.nbb:cid"),
							_cid: key(obj, "$.dsq:id"),
							_title: key(obj, "title.0"),
							_description: key(obj, "description.0") || "",
							_order: key(obj, "order.0") || (index + 1)
						};
				});

				result.topics = parsed.disqus.thread.map(function(obj, index) {
					var author = grabAuthor(obj);
					if (!author._anonymous) {
						addUser(author);
					}

					return {
						tid: key(obj, "$.nbb:id") || key(obj, "$.nbb:tid"),
						_tid: key(obj, "$.dsq:id"),
						_uemail: author._email,
						_handle: author._username || author._email || author._name,
						_cid: key(obj, "category.0.$.dsq:id"),
						_title: key(obj, "title.0"),
						_content: (key(obj, "message.0") || "") + "<br><br>" + key(obj, "_link.0"),
						_timestamp: moment(key(obj, "createdAt.0")).valueOf(),
						_ip: key(obj, "ipAddress.0"),
						_locked: resolve(key(obj, "isClosed.0")),
						_deleted: resolve(key(obj, "isDeleted.0"))
					};
				});

				result.posts = parsed.disqus.post.map(function(obj, index) {
					var author = grabAuthor(obj);
					if (!author._anonymous) {
						addUser(author);
					}

					return {
						pid: key(obj, "$.nbb:id") || key(obj, "$.nbb:pid"),
						_pid: key(obj, "$.dsq:id") || (index + 1),
						_tid: key(obj, "thread.0.$.dsq:id"),
						_toPid: key(obj, "parent.0.$.dsq:id"),
						_uemail: author._email,
						_handle: author._username || author._email || author._name,
						_content: key(obj, "message.0"),
						_timestamp: moment(key(obj, "createdAt.0")).valueOf(),
						_ip: key(obj, "ipAddress.0"),
						_deleted: resolve(key(obj, "isDeleted.0")),
						_spam: resolve(key(obj, "isSpam.0"))
					}
				});

				result.users = Object.keys(_users).map(function(email, i) {
					_users[email]._uid = (i + 1);
					_users[email]._username = !_users[email]._username || /^disqus_/.test(_users[email]._username) ? _users[email]._name || _users[email]._email : _users[email]._username;
					_users[email]._alternativeUsername = _users[email]._name;
					return _users[email];
				});

				Exporter.results = result;
				callback(null, Exporter.config);
			});
		});

	};

	Exporter.countUsers = function (callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, Object.keys(Exporter.results.users).length);
		});
	};

	Exporter.getUsers = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, _.indexBy(Exporter.results.users, '_uid'), Exporter.results.users);
		});
	};

	Exporter.countCategories = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, Object.keys(Exporter.results.categories).length);
		});
	};

	Exporter.getCategories = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, _.indexBy(Exporter.results.categories, '_cid'), Exporter.results.categories);
		});
	};

	Exporter.countTopics = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, Object.keys(Exporter.results.topics).length);
		});
	};

	Exporter.getTopics = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, _.indexBy(Exporter.results.topics, '_tid'), Exporter.results.topics);
		});
	};

	Exporter.countPosts = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, Object.keys(Exporter.results.posts).length);
		});
	};

	Exporter.getPosts = function(callback) {
		callback = !_.isFunction(callback) ? noop : callback;
		setImmediate(function() {
			callback(null, _.indexBy(Exporter.results.posts, '_pid'), Exporter.results.posts);
		});
	};

	Exporter.teardown = function(callback) {
		Exporter.log('teardown');
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

var fs = require('fs-extra');

require('./index').testrun({
	custom: {
		filepath: __dirname + '/my-file.xml'
	}
}, function(err, results) {
	console.log("getUsers", Object.keys(results[2]).length);
	console.log("getCategories", Object.keys(results[4]).length);
	console.log("getTopics", Object.keys(results[5]).length);
	console.log("getPosts", Object.keys(results[6]).length);

	// will crash the process if there are attachmentBlobs
	// fs.writeFileSync('./tmp.json', JSON.stringify(results[5][16374], undefined, 2));
});
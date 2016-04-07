var fs = require('fs-extra');

require('./index').testrun({
	custom: {
		filepath: __dirname + '/my-file.xml'
	}
}, function(err, results) {

	console.log('users', results[1][1].length);
	console.log('categories', results[2][1].length);
	console.log('topics', results[3][1].length);
	console.log('posts', results[4][1].length);

	// will crash the process if there are attachmentBlobs
	// fs.writeFileSync('./tmp.json', JSON.stringify(results[5][16374], undefined, 2));
});
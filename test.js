var fs = require('fs-extra');

require('./index').testrun({
	custom: {
		filepath: __dirname + '/my-file.xml'
	}
}, function(err, results) {
	// will crash the process if there are attachmentBlobs
	// fs.writeFileSync('./tmp.json', JSON.stringify(results[5][16374], undefined, 2));
});
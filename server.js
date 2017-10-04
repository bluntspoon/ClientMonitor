var me = "http://127.0.0.1";

// HOST THE MONITOR
var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');
var serve = serveStatic("./app");
var port = 0;
var server = http.createServer(function (req, res) {
	if (req.url === "/") {
		req.url = "index.htm";
	}
	var done = finalhandler(req, res);
	serve(req, res, done);
});

/*if (process.env.PORT === undefined) {
	port = 8089;
	server.listen(port);
}
else {*/
port = 80;
server.listen(port);
//}
me += ":" + port.toString() + "/";
console.log("URL: ", me);
// RUN THE BROWSER
function startMonitor() {
	var driver = require('node-phantom-simple');
	driver.create({ path: require('phantomjs').path, parameters: { 'web-security': 'false' } }, function (err, browser) {
		return browser.createPage(function (err, page) {
			var debugEnabled = true;
			var networkDebugEnabled = false;
			if (debugEnabled) {
				page.onConsoleMessage = function (msg, lineNum, sourceId) {
					console.log('CONSOLE: ' + msg);
				};
				page.onError = function (msg, trace) {
					var msgStack = ['ERROR: ' + msg];
					if (trace && trace.length) {
						msgStack.push('TRACE:');
						trace.forEach(function (t) {
							msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
						});
					}
					console.error(msgStack.join('\n'));
				};
			}
			if (networkDebugEnabled) {
				page.onResourceRequested = function (request) {
					console.log('Request ' + JSON.stringify(request, undefined, 4));
				};
				page.onResourceReceived = function (response) {
					console.log('Receive ' + JSON.stringify(response, undefined, 4));
				};
			}
			return page.open(me, function (err, status) {
				if (err) {
					console.log("Error:", err);
				}
				console.log("opened site? ", status);
				setTimeout(function () {
					browser.exit();
					startMonitor();
				}, 3600000)
			});
		});
	});
}
startMonitor();

var http = require("http");
2
3 http.createServer(function(request, response) {
4 response.writeHead(200, {"Content-Type": "text/plain"});
5 response.write("Hello World");
6 response.end();
7 }).listen(8888);

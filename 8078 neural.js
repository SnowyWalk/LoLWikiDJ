var g_port = 8078

const express = require('express')
const app = express()
const https = require('https')
const fs = require('fs')
const server = https.createServer({
	key: fs.readFileSync('/etc/letsencrypt/live/lolwiki.xyz/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/lolwiki.xyz/fullchain.pem')
}, app)
/* Node.js 기본 내장 모듈 불러오기 */
const util = require('util');

// /* API 요청 모듈 불러오기 */
// const request = require('request-promise-native')

/* 서버를 8080 포트로 listen */
server.listen(g_port, function() {
	console.log('\x1b[42m======================== 서버 실행 중.. ============================\x1b[0m')
})

/* Get 방식으로 / 경로에 접속하면 실행 됨 */
app.get('/', async function(request, response, next) {
	if(!request.headers.host) // 봇 쳐내
		return

	try
	{
		var data = await read_file_async('index_neural.html')
		var text = data.toString()
					.replace(/\$_localhost/g, 'http://' + request.headers.host.substr(0, request.headers.host.length-5))
					.replace(/\$_port/g, g_port)

		// console.log(text.match(/123/g))

		// for(var e of text.match(/\/[^\/]*?\$_version/g))
		// {
		// 	var matchs = e.match(/\/(.*?)(\?.*)\$_version/)
		// 	var file_name = matchs[1]
		// 	var other_str = matchs[2]
		// 	var stat = await stat_file_async(format('./static/{0}', file_name))
		// 	stat = stat.toJSON().replace(/\D/g, '')
		// 	text = text.replace(e, format('/{0}{1}{2}', file_name, other_str, stat))
		// }

		response.writeHead(200, {'Content-Type':'text/html'})
		response.write(text)
		response.end()
	}
	catch (exception)
	{
		console.log('app.get', exception)
		response.send('서버가 고장남!!! Kakao ID: AnsanSuperstar 로 문의하세요' + '<p><p>에러 내용 : <p>' + format('<p>Name : {0}<p>ERROR : {1}<p>Message : {2}<p>Stack : {3}', exception.name, exception.err, exception.message, exception.stack))
	}
})

function stat_file_async(file_name)
{
	return new Promise(function (resolve, reject) {
		fs.stat(file_name, function(err, data) {
			err ? reject(err) : resolve(data.mtime)
		})
	})
}

function read_file_async(file_name)
{
	return new Promise(function (resolve, reject) {
		fs.readFile(file_name, 'utf8', function(err, data) {
			err ? reject(err) : resolve(data)
		})
	})
}

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}
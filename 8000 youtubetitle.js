var g_port = 8000

const express = require('express')
const app = express()
const https = require('https')
const fs = require('fs')
const server = https.createServer({
	key: fs.readFileSync('/etc/letsencrypt/live/lolwiki.xyz/privkey.pem'),
	cert: fs.readFileSync('/etc/letsencrypt/live/lolwiki.xyz/fullchain.pem')
}, app)
/* API 요청 모듈 불러오기 */
const request = require('request-promise-native')
/* Node.js 기본 내장 모듈 불러오기 */
const util = require('util');
/* 유튜브 주소 파싱 */
var youtubeReg = /(\?|&)v=([^&\?]+)/
var youtubeReg2 = /\/v\/([^\/]+)/
var youtubeReg3 = /youtu\.be\/([^\?]+)/
var youtubeReg4 = /shorts\/([^\?]+)/



// /* API 요청 모듈 불러오기 */
// const request = require('request-promise-native')

/* 서버를 8080 포트로 listen */
server.listen(g_port, function() {
	console.log('\x1b[42m======================== 유튜브 타이틀 서버 실행 중.. ============================\x1b[0m')
})

/* Get 방식으로 / 경로에 접속하면 실행 됨 */
app.get('/', async function(request, response, next) {
	//if(!request.headers.host) // 봇 쳐내
	//	return

	console.log('*** Connection detect. ***')
	try {
		console.log(format('host : {0}', request.headers.host))
		console.log(format('query (URL) : {0}', request.query.url))
		console.log(format('parsed video_id (URL) : {0}', youtube_url_parse(request.query.url)))
		console.log(format('query (hl =Language) : {0}', request.query.hl))
	}
	catch (exception)
	{
		console.log('정보 출력 중에 뭔가 에러가 떴다')
	}
	console.log()

	if(!request.query.url || !request.query.hl)
	{
		response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'})
		response.write('(오류) 잘못된 Query....')
		response.end()
		return;
	}

	try
	{
		var data = await request_youtube_video(youtube_url_parse(request.query.url), request.query.hl)
		console.log(format('Title : {0}', data.items[0].snippet.localized.title))
		console.log()

		response.writeHead(200, {'Content-Type':'text/html; charset=utf-8'})
		response.write(data.items[0].snippet.localized.title)
		response.end()
	}
	catch (exception)
	{
		console.log('app.get', exception)
		response.send('서버가 고장남!!! Kakao ID: AnsanSuperstar 로 문의하세요' + '<p><p>에러 내용 : <p>' + format('<p>Name : {0}<p>ERROR : {1}<p>Message : {2}<p>Stack : {3}', exception.name, exception.err, exception.message, exception.stack))
	}
})

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}

/* 유튜브 영상 정보 조회 쿼리(Promise) */
function request_youtube_video(video_id, hl)
{
	return new Promise(function(resolve, reject) {
		var url = 'https://www.googleapis.com/youtube/v3/videos'
		var key = 'AIzaSyARG5pgayIj8ghL0hwzrNL_3pl-QeRQYMc'
		var part = 'id,snippet,contentDetails,status'
		//var hl = 'ko' 언어코드
		var regionCode = 'KR'
		var requestUrl = format('{0}?key={1}&part={2}&regionCode={3}&hl={4}&id={5}', url, key, part, regionCode, hl, video_id)
		g_last_query = requestUrl
		request(requestUrl, function(err, response, body) {
			if(err)
				reject({message: 'request_youtube_video(' + video_id + ')', err: err, youtube_query_error: true})
			else
				resolve(JSON.parse(body))
		})
	})
}

function youtube_url_parse(url_or_id)
{
	if(youtubeReg.test(url_or_id))
		return youtubeReg.exec(url_or_id)[2]
	else if(youtubeReg2.test(url_or_id))
		return youtubeReg2.exec(url_or_id)[1]
	else if(youtubeReg3.test(url_or_id))
		return youtubeReg3.exec(url_or_id)[1]
	else if(youtubeReg4.test(url_or_id))
		return youtubeReg4.exec(url_or_id)[1]
	return url_or_id
}
/* 공지말 */
var g_port = 1004
var g_notice = '디아 전용 채널\n개설일 : 2021-12-28'

/* 설치한 express 모듈 불러오기 */
const express = require('express')
/* 설치한 socket.io 모듈 불러오기 */
const socket = require('socket.io')
/* Node.js 기본 내장 모듈 불러오기 */
const http = require('http')
/* Node.js 기본 내장 모듈 불러오기 */
const fs = require('fs')
/* express 객체 생성 */
const app = express()
app.set('maxHttpBufferSize', 1e8)
/* CORS 설정 */
var cors = require('cors')
app.use(cors())
/* express http 서버 생성 */
const server = http.createServer(app)
/* 생성된 서버를 socket.io에 바인딩 */
const io = socket(server, {maxHttpBufferSize: 2e7, pingTimeout: 120 * 1000})
/* os */
const os = require('os')
/* API 요청 모듈 불러오기 */
const request = require('request-promise-native')
/* 날짜시간 유틸 */
require('date-utils')
/* 아이콘 만들기 유틸*/
const identicon = require('identicon') 
/* MD 뷰어 */
var showdown  = require('showdown')
var converter = new showdown.Converter()
/* TTS 유틸 */
const textToSpeech = require('@google-cloud/text-to-speech');
const util = require('util');
const tts_client = new textToSpeech.TextToSpeechClient();
/* mysql 서버 */
const mysql = require('mysql')
var db_config = JSON.parse(fs.readFileSync('db_config.txt', 'utf-8'))

async function handleDisconnect() {
	db = mysql.createConnection(db_config);
	db.connect(function(err) {
		if(err) {
			log('ERROR', 'DB Timeout', GetDate())
			setTimeout(handleDisconnect, 2000); 
		}
	})	
	db.on('error', function(err) {
		if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'PROTOCOL_PACKETS_OUT_OF_ORDER')
		{
			log('ERROR', 'DB TimeOut', format('DB tried to reconnect. [{0}]', GetDate()))
			return handleDisconnect()
		}
		else
		{
			log('ERROR','db on error', err)
			throw err;
		}
	})
}
handleDisconnect();

app.use('/fonts', express.static('./static/fonts'))
app.use('/static', express.static('./static'))
app.use('/icon', express.static('./static/icon'))
app.use('/tts', express.static('./tts'))
app.use('/patch_note', express.static('./patch_note'))

/* CONSTANT */
const ipReg = /((?:\d+\.){3}\d+)/

/* 유저 목록 */
var g_users_dic = [] // dic['닉네임'] = { socket: 소켓, icon_id: 아이콘 아이디, icon_ver: 아이콘 버전  }

/* 현재 재생중인 비디오 정보 */
var g_current_dj = ''
var g_video_id = ''
var g_video_title = ''
var g_video_thumbnail = ''
var g_video_author = ''
var g_video_duration = 0
var g_played_time_ms = 0 // ms
var g_end_timer = null

/* DJ 순서 목록 */
var g_djs = []

/* 임시: QUEUE */
var g_queue = []

/* 좋아요/싫어요 데이터 */
var g_good_list = []
var g_bad_list = []

/* 최근 재생된 영상 데이터 */
var g_recent_video_list = [] // [ { video_id, thumbnail, title, dj }, ... ]
var g_recent_video_list_limit = 20 // 최대 저장 개수

/* DEBUG 용 */
var g_last_query = ''

/* 롤백용 */
const iconv = require('iconv-lite')
const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
const newlineHTMLReg = /&lt;br \/&gt;\n/g
const android_id = 'LoLWikiDJ'
var g_lol_auth_dic = {} // '설보': '135489'

// app.get('/static/fonts/*', function(request, response, next) {
// 	response.header( "Access-Control-Allow-Origin", "*")
// })

/* Get 방식으로 / 경로에 접속하면 실행 됨 */
app.get('/', async function(request, response, next) {
	if(!request.headers.host) // 봇 쳐내
		return

	try
	{
		var data = await read_file_async('dj.html')
		var text = data.toString()
					.replace(/\$_localhost/g, 'http://' + request.headers.host.substr(0, request.headers.host.length-5))
					.replace(/\$_port/g, g_port)

		for(var e of text.match(/\/[^\/]*?\$_version/g))
		{
			var matchs = e.match(/\/(.*?)(\?.*)\$_version/)
			var file_name = matchs[1]
			var other_str = matchs[2]
			var stat = await stat_file_async(format('./static/{0}', file_name))
			stat = stat.toJSON().replace(/\D/g, '')
			text = text.replace(e, format('/{0}{1}{2}', file_name, other_str, stat))
		}

		response.writeHead(200, {'Content-Type':'text/html'})
		response.write(text)
		response.end()
	}
	catch (exception)
	{
		log_exception('app.get', exception)
		response.send('서버가 고장남!!! Kakao ID: AnsanSuperstar 로 문의하세요' + '<p><p>에러 내용 : <p>' + format('<p>Name : {0}<p>ERROR : {1}<p>Message : {2}<p>Stack : {3}', exception.name, exception.err, exception.message, exception.stack))
	}
})

app.get('/patch_note', async function(request, response, next) {
	if(!request.headers.host) // 봇 쳐내
		return

	try
	{
		var data = await read_file_async('readme.md')
		var text = data.toString()
		var html = converter.makeHtml(text)
		html = '<meta charset="UTF-8"><style> * { font-weight: normal; margin-block: 0.3em; }</style>' + html

		response.writeHead(200, {'Content-Type':'text/html'})
		response.write(html)
		response.end()
	}
	catch (exception)
	{
		log_exception('app.get patch_note', exception)
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

io.sockets.on('connection', function(socket) 
{
	/* 로그인 */
	socket.on('login', async function(nick) {
		// 소켓에 이름 저장해두기 
		socket.name = nick
		// log('INFO', 'login', socket.name + ' 로그인 시도.')

		// 빈 이름인 경우 제외
		if(!nick)
		{
			log('THROW', 'login', '빈 닉네임 : ' + nick)
			socket.name = ''
			socket.emit('login', false)
			return
		}

		// 중복 로그인 검사 
		var socket_ip = socket.handshake.address.match(ipReg)[1]
		if(socket.name in g_users_dic)
		{
			if(g_users_dic[socket.name].ip == socket_ip) // 동일 아이피에서 로그인 했다면 그냥 기존 연결 끊고 새로 연결
			{
				log('INFO', '중복 로그인 교체 연결', socket.name)
				var dest_socket = g_users_dic[socket.name].socket
				disconnect_process(dest_socket)
				dest_socket.disconnect(true) // 진짜 연결 해제
			}
			else
			{
				log('THROW', '중복 로그인 검사', socket.name + ' 중복 로그인 실패.')
				socket.name = ''
				socket.emit('login', false)
				return
			}
		}

		try
		{
			await db_beginTransaction()

			var current_date = GetDate()
			
			// 아이피 밴 확인
			var ban_data = await db_select('Reason, Comment', 'Bans', format('IP LIKE "{0}"', socket_ip), 'LIMIT 1')
			if(ban_data.length > 0) // 밴 대상이면
			{
				log('ERROR_CATCH', '밴 대상 접속 시도', format('접속을 차단했습니다. ({0}) 사유: {1} | 메모: {2}', socket_ip, ban_data[0].Reason, ban_data[0].Comment))
				socket.name = ''
				socket.emit('ban', ban_data[0].Reason)
				return
			}

			 // 기존 유저가 아니라면 등록
			var is_exist_user = await db_select('COUNT(*) as cnt', 'Accounts', format('Name LIKE "{0}"', socket.name), 'LIMIT 1')
									.then(ret => ret[0].cnt > 0)
			if(!is_exist_user)
			{
				// 일단 새 재생목록 생성
				var new_playlist_id = await db_insert('Playlists', ['Name', 'VideoList'], [format('{0}의 재생목록', socket.name), '[]']).then(ret => ret.insertId)

				// 새 유저 등록
				await db_insert('Accounts', ['Name', 'Playlists', 'CurrentPlaylist'], [socket.name, JSON.stringify([new_playlist_id]), new_playlist_id])
			}

			// Secure 데이터 등록
			var secureData = await db_select('ConnectData, Comment', 'Secures', format('IP = "{0}"', socket_ip), 'LIMIT 1') // secure data 가져오기
			var is_exist_secure = (secureData.length > 0)
			var connectCount = 0
			var is_exist_secure_data = false
			var comment = ''
			if(!is_exist_secure) // 새로 등록
			{
				await db_insert('Secures', ['IP', 'ConnectData'], [socket_ip, JSON.stringify([{Name: socket.name, ConnectCount: 1, CreationDate: current_date, LastLoginDate: current_date}])])
				connectCount = 1
			}
			else // 기존꺼에 추가
			{
				comment = secureData[0].Comment
				// 해당 Name이 존재하는지 체크
				secureData = JSON.parse(secureData[0].ConnectData)

				var thisSecureData = null
				for(var e of secureData)
				{
					if(e.Name == socket.name)
					{
						thisSecureData = e
						break
					}
				}

				is_exist_secure_data = (thisSecureData != null)
				if(is_exist_secure_data) // 이미 있는 데이터면 커넥트카운트 올려주고 라스트로그인 갱신
				{
					thisSecureData.ConnectCount += 1
					thisSecureData.LastLoginDate = current_date
					connectCount = thisSecureData.ConnectCount
				}
				else // 없던 데이터라면 새로 세팅
				{
					secureData.push({Name: socket.name, ConnectCount: 1, CreationDate: current_date, LastLoginDate: current_date})
					connectCount = 1
				}
				await db_update('Secures', format("ConnectData = '{0}'", JSON.stringify(secureData)), format('IP = "{0}"', socket_ip))
			}

			// 아이콘 ID 가져오기
			var icon_id = 0
			var icon_ver = 0
			var select_icon = await db_select('Id, Ver', 'Icons', format('Name LIKE "{0}"', socket.name), 'LIMIT 1')
			if(select_icon.length == 0) // 아이콘 없으면 새로 만들기
			{
				icon_id = await db_insert('Icons', ['Name', 'Ver'], [socket.name, 1]).then(ret => ret.insertId)
				icon_ver = 1
				await make_identicon_async(socket.name, icon_id)
			}
			else
			{
				icon_id = parseInt(select_icon[0].Id)
				icon_ver = parseInt(select_icon[0].Ver)
			}

			// 로그인 성공
			await db_commit()

			var text1 = (is_exist_user ? '기존' : '신규')
			var text4 = (is_exist_user && !is_exist_secure_data ? '아이디 도용 가능성 감지' : '')
			log('INFO', 'login', format('{0} {1}유저 {2}번째 로그인 : ({3}) {4} {5}', socket.name, text1, connectCount, socket_ip, text4, comment))

			g_users_dic[socket.name] = {socket: socket, icon_id: icon_id, icon_ver: icon_ver, ip: socket_ip}
			socket.emit('login', true)
			update_current_video(socket) // 플레이 영상 데이터 보내기
			update_current_queue(socket) // 플레이 대기열 알림
			update_current_rating(socket) // 좋/싫 알림
			update_playlist(socket) // 플레이리스트 정보 전송
			update_recent_video_list(socket) // 최근 영상 정보 전송

			if(g_notice)
				socket.emit('chat_update', {type: 'connect', name: 'SERVER', message: g_notice})
		}
		catch (exception)
		{
			await db_rollback()
			log_exception('login', exception, socket.name + ' 로그인 실패. 에러 : ' + JSON.stringify(exception))
			socket.name = ''
			socket.emit('login', false)
		}

		log('INFO', '현 접속자', Object.keys(g_users_dic).join(', '))
	})

	function make_identicon_async(nick, icon_id)
	{
		return new Promise( function(resolve, reject) {
			identicon.generate({ id: nick + '7', size: 39 }, (err, buffer) => {
				if (err) 
					reject(err)
			
				// buffer is identicon in PNG format.
				fs.writeFileSync(format('static/icon/{0}.png', icon_id), buffer)
				resolve()
			});
		})
	}
	

	/* 새로운 유저가 접속했을 경우 다른 소켓에게도 알려줌 */
	socket.on('chat_newUser', function() 
	{
		log('INFO', 'chat_newUser', format('\'{0}\' 님이 접속하였습니다.', socket.name))		
		log('INFO', 'users', format('참가자 목록 ({0})\n{1}', Object.keys(g_users_dic).length, Object.keys(g_users_dic).map( x => format('{0} ({1})', x, g_users_dic[x].ip)).join(', ')))

		// 모든 소켓에게 전송 
		io.sockets.emit('chat_update', {type: 'connect', name: 'SERVER', message: format('\'{0}\' 님이 접속하였습니다.', socket.name) })
		update_users()
		update_djs()
		socket.emit('chat_update', { type:'system_message', time: GetTime(), message: format('참가자 목록 ({0})\n{1}', Object.keys(g_users_dic).length, Object.keys(g_users_dic).join(', ')) })
	})

	/* 전송한 메시지 받기 */
	socket.on('chat_message', function(data) 
	{
		if(!socket.name)
			return

		if(!g_users_dic[socket.name])
		{
			log_exception('chat_message', null, g_users_dic[socket.name])
			return
		}
			
		/* 받은 데이터에 누가 보냈는지 이름을 추가 */
		data.name = socket.name
		data.time = GetTime()
		data.icon_id = g_users_dic[socket.name].icon_id
		data.icon_ver = g_users_dic[socket.name].icon_ver
		var ip = g_users_dic[socket.name].ip

		log_message = data.message
		if(log_message.length > 100)
			log_message = format('{0} ... ({1} bytes)', log_message.substr(0, 100), log_message.length)
		log('CHAT', format('{0} ({1})', data.name, ip), log_message, true)

		/* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
		io.sockets.emit('chat_update', data);
	})

	/* 접속 종료 */
	socket.on('disconnect', function() {
		if(!socket.name)
			return

		disconnect_process(socket)
	})

	function disconnect_process(socket)
	{
		if(socket.name in g_users_dic == false)
			return

		log('INFO', 'disconnect', format('\'{0}\' 님이 나가셨습니다.', socket.name))

		delete g_users_dic[socket.name]
		if(g_djs.indexOf(socket.name) != -1)
		{
			g_djs.splice(g_djs.indexOf(socket.name), 1)
			update_djs()

		}

		log('INFO', '현 접속자', Object.keys(g_users_dic).join(', '))

		// 현재 재생중인 dj라면 재생 종료
		if(g_current_dj == socket.name)
			end_of_video()

		// 나가는 사람을 제외한 나머지 유저에게 메시지 전송
		socket.broadcast.emit('chat_update', {type: 'disconnect', message: format('\'{0}\' 님이 나가셨습니다.', socket.name)})
		log('INFO', 'users', format('참가자 목록 ({0})\n{1}', Object.keys(g_users_dic).length, Object.keys(g_users_dic).map( x => format('{0} ({1})', x, g_users_dic[x].ip)).join(', ')))
		update_users()
	}

	socket.on('refresh', function(nick) {
		log('INFO', 'refresh', format('Refresh 시도 : {0}({1}) -> {2}', socket.name, g_users_dic[socket.name].ip, nick))
		if(g_users_dic[socket.name].ip != '125.180.24.71')
		{
			log('ERROR_CATCH', 'refresh', '아이피 인증 실패!')
			return
		}
		
		if(nick in g_users_dic)
			g_users_dic[nick].socket.emit('refresh')
		else
			log('ERROR_CATCH', 'refresh', format('해당 대상 없음!'))
	})

	socket.on('eval', function(data) {
		var nick = data.nick
		var code = data.code

		log('INFO', 'eval', format('Eval 시도 : {0}({1}) -> {2} to {3}', socket.name, g_users_dic[socket.name].ip, nick, code))
		if(g_users_dic[socket.name].ip != '125.180.24.71')
		{
			log('ERROR_CATCH', 'eval', '아이피 인증 실패!')
			return
		}

		if(nick in g_users_dic)
			g_users_dic[nick].socket.emit('eval', code)
		else
			log('ERROR_CATCH', 'eval', format('해당 대상 없음!'))
	})

	socket.on('evalall', function(code) {
		var targets_nick = Object.keys(g_users_dic)
		log('INFO', 'evalall', format('Eval All 시도 : {0}({1}) -> All({2}) to {3}', socket.name, g_users_dic[socket.name].ip, targets_nick.join(', '), code))

		if(g_users_dic[socket.name].ip != '125.180.24.71')
		{
			log('ERROR_CATCH', 'evalall', '아이피 인증 실패!')
			return
		}

		for(var e of targets_nick)
		{
			console.log(e, g_users_dic[e])
			g_users_dic[e].socket.emit('eval', code)

		}
	})

	socket.on('volcheck', function(data) {
		var target_nick = data.target_nick
		var message = data.message

		io.sockets.emit('chat_update', { type: 'message', message: message, name: socket.name, time: GetTime(), icon_id: g_users_dic[socket.name].icon_id, icon_ver: g_users_dic[socket.name].icon_ver});

		if(target_nick in g_users_dic)
			g_users_dic[target_nick].socket.emit('eval', "socket.emit('chat_message', {type: 'message', message:format('음량: {0}% {1}', player.getVolume(), player.isMuted() ? '(음소거)' : ''), tts_hash:''})")
		else
			log('ERROR_CATCH', 'volcheck', format('해당 대상 없음!'))
	})

	// 서버 디버그용 eval
	socket.on('debug', function(code) {
		log('INFO', 'debug', format('Eval 시도 : {0}({1}) -> {2}', socket.name, g_users_dic[socket.name].ip, code))
		if(g_users_dic[socket.name].ip != '125.180.24.71')
		{
			log('ERROR_CATCH', 'debug', '아이피 인증 실패!')
			return
		}

		eval(code)
	})

	socket.on('check_user', function(nick) {
		if(nick in g_users_dic == false)
		{
			socket.emit('check_user', false)
			return
		}

		if(g_users_dic[nick].ip != socket.handshake.address.match(ipReg)[1])
		{
			socket.emit('check_user', false) // 원래는 이미 존재한다고 해야하지만, 용도가 교체 로그인 체크이므로 false 반환.
			return
		}

		socket.emit('check_user', true)
	})

	/* TEST: QUEUE에 비디오 추가 */
	socket.on('queue', async function(data) {
		if(!socket.name)
			return
		/* data
		dj : '천아연'
		video_id : 'NvvYPLGN8Ag'
		*/

		queue_video(data)
	})

	socket.on('queue_video_index', async function(video_index) {
		if(!socket.name)
			return

		var video_id = await db_select('VideoId', 'Videos', format('Id = {0}', video_index), 'LIMIT 1').then(e => e[0].VideoId)
		log('INFO', 'queue_video_index', format('{0} 가 즉시 재생 : {1} = {2}', socket.name, video_index, video_id))

		await queue_video({dj: socket.name, video_id: video_id})
	})

	async function queue_video(data)
	{
		/* data
		dj : '천아연'
		video_id : 'NvvYPLGN8Ag'
		*/

		try
		{
			var youtube_data = await request_youtube_video(data.video_id).then(parse_youtube_video_data)

			log('INFO', 'queue', format('{0} 이(가) {1} ({2}) 예약 {3}', socket.name, youtube_data.title, parse_second_to_string(youtube_data.duration), data.video_id))
			if(!g_video_id)
			{
				log('INFO', 'play', youtube_data.title)
				g_current_dj = data.dj
				g_video_id = data.video_id
				g_video_title = youtube_data.title
				g_video_author = youtube_data.author
				g_video_thumbnail = youtube_data.thumbnail_url
				g_video_duration = youtube_data.duration
				g_played_time_ms = Date.now()
	
				// 영상 종료 타이머 설정
				if(g_video_duration != 0)
					set_timeout_end_of_video()
	
				// 모두에게 영상 갱신
				update_current_video(io.sockets)
				add_to_recent_video_list(g_video_id, g_video_title, g_video_thumbnail, g_current_dj, g_video_duration)
				update_recent_video_list(io.sockets)
			}
			else
			{
				g_queue.push( { dj: data.dj, video_id: data.video_id, data: youtube_data } )

				// 모두에게 플레이 대기열 알림
				update_current_queue(io.sockets)
			}
		}
		catch (exception)
		{
			log_exception('queue', exception)
			io.sockets.emit('chat_update', {type:'system_message', time: GetTime(), message: '유튜브 영상 조회 에러!'})
		}
	}

	/* 현재 플레이 대기열 목록 알려주기 */
	socket.on('queue_list', function() {
		update_current_queue(socket, true)
	})

	/* TEST: 특정 비디오 재생 명령 (쓰이지 않음!) */
	socket.on('play', async function(data) {
		if(!socket.name)
			return

		/* data
		dj : '천아연'
		video_id : 'NvvYPLGN8Ag'
		*/

		if(g_end_timer)
		{
			clearTimeout(g_end_timer)
			g_end_timer = null
		}

		log('INFO', 'play', data)

		var body = ''
		try
		{
			body = await request_youtube_video(data.video_id)
			var item = body.items[0]
			if(item == null)
				throw Error()
			var response_data = parse_youtube_video_data(body)
			
			log('INFO', 'play', response_data.title)
			g_current_dj = data.dj
			g_video_id = data.video_id
			g_video_title = response_data.title
			g_video_author = response_data.author
			g_video_thumbnail = response_data.thumbnail_url
			g_video_duration = response_data.duration
			g_played_time_ms = Date.now()

			// 영상 종료 타이머 설정
			if(g_video_duration != 0)
				set_timeout_end_of_video()

			// 모두에게 영상 갱신
			update_current_video(io.sockets)
			add_to_recent_video_list(g_video_id, g_video_title, g_video_thumbnail, g_current_dj, g_video_duration)
			update_recent_video_list(io.sockets)
		}
		catch(exception)
		{
			log_exception('play', exception, body)
			io.sockets.emit('chat_update', {type:'system_message', time: GetTime(), message: '유튜브 영상 조회 에러!'})
		}
	})

	/* 현재 재생중인 영상 정보 요청 */
	socket.on('playing', function() {
		var seekTime = (Date.now() - g_played_time_ms) / 1000
		if(seekTime < 0)
			seekTime = 0
		update_current_video(socket)
	})

	/* 되감기 */
	socket.on('rewind', function(data) {
		if(!socket.name)
			return

		g_played_time_ms += 1000 * data.sec
		if(Date.now() < g_played_time_ms)
			g_played_time_ms = Date.now()

		// 챗 알림
		io.sockets.emit('chat_update', { type: 'message', message: data.message, name: socket.name, time: GetTime(), icon_id: g_users_dic[socket.name].icon_id, icon_ver: g_users_dic[socket.name].icon_ver});
		io.sockets.emit('chat_update', { type: 'system_message', message: '영상을 ' + data.sec + '초 되감았습니다.', name: socket.name, time: GetTime()});

		// 영상 종료 타이머 설정
		set_timeout_end_of_video()

		// 모두에게 영상 갱신
		update_current_video(io.sockets)
	})

	socket.on('forward', function(data) {
		if(!socket.name)
			return

		g_played_time_ms -= 1000 * data.sec
		if(Date.now() < g_played_time_ms)
			g_played_time_ms = Date.now()

		// 챗 알림
		io.sockets.emit('chat_update', { type: 'message', message: data.message, name: socket.name, time: GetTime(), icon_id: g_users_dic[socket.name].icon_id, icon_ver: g_users_dic[socket.name].icon_ver});
		io.sockets.emit('chat_update', { type: 'system_message', message: '영상을 ' + data.sec + '초 넘겼습니다.', name: socket.name, time: GetTime()});

		// 영상 종료 타이머 설정
		set_timeout_end_of_video()

		// 모두에게 영상 갱신
		update_current_video(io.sockets)
	})

	/* 현재 영상 스킵 */
	socket.on('skip', function(message) {
		if(!socket.name)
			return

		if(message)
			io.sockets.emit('chat_update', { type: 'message', message: message, name: socket.name, time: GetTime(), icon_id: g_users_dic[socket.name].icon_id, icon_ver: g_users_dic[socket.name].icon_ver});
		io.sockets.emit('chat_update', { type: 'system_message', message: '영상이 스킵 되었습니다.', time: GetTime()})
		log('INFO', 'socket.skip', 'skipped on demand.')
		end_of_video()
	})

	/* deprecated: 참가자 목록 요청 */
	socket.on('users', function() {
		log('INFO', 'users', format('참가자 목록 ({0})\n{1}', Object.keys(g_users_dic).length, Object.keys(g_users_dic).map( x => format('{0} ({1})', x, g_users_dic[x].ip)).join(', ')))
		update_users()
	})

	/* DJ 목록 요청 */
	socket.on('djs', function() {
		socket.emit('djs', {data: format('디제잉 목록 ({0})\n{1}', g_djs.length, g_djs.map((x, i) => format('{0}. {1}', i+1, x)).join('\n'))})  
	})

	/* 플레이리스트 요청 */
	socket.on('playlist', function() {
		if(!socket.name)
			return
			
		update_playlist(socket)
	})

	/* 새 재생목록 추가하기 */
	socket.on('new_playlist', async function() {
		if(!socket.name)
			return

		try
		{
			await db_beginTransaction()

			// 새 재생목록 생성
			var new_playlist_id = await db_insert('Playlists', ['Name', 'VideoList'], ['새 재생목록', '[]']).then(ret => ret.insertId)
			
			// 유저의 현재 재생목록에 추가
			await db_update('Accounts', format('Playlists = JSON_ARRAY_APPEND(Playlists, "$", {0})', new_playlist_id), format('Name LIKE "{0}"', socket.name))

			await db_commit()

			// 업데이트
			update_playlist(socket, new_playlist_id)

			log('INFO', 'new_playlist', format('{0} 이(가) 새 재생목록을 생성', socket.name))
		}
		catch (exception)
		{
			log_exception('new_playlist', exception)
			await db_rollback()
		}		
	})

	/* 재생목록 선택 */
	// playlist_id는 반드시 존재하는 플레이리스트여야함 (없을 시 크리티컬)
	socket.on('select_playlist', async function(playlist_id) {
		if(!socket.name)
			return

		try
		{
			await db_update('Accounts', format('CurrentPlaylist = {0}', playlist_id), format('Name LIKE "{0}"', socket.name))

			update_playlist(socket)
		}
		catch (exception)
		{
			log_exception('select_playlist', exception)
		}
	})

	/* 재생목록 이름 변경 */
	socket.on('rename_playlist', async function(data) {
		if(!socket.name)
			return

		/* data : { name: 새이름, playlist_id: 변경할 재생목록 id } */
		try
		{
			await db_update('Playlists', format('Name = "{0}"', data.name), format('Id = {0}', data.playlist_id))

			update_playlist(socket)
			log('INFO', 'rename_playlist', format('{0} 이(가) 재생목록명을 변경 -> {1}', socket.name, data.name))
		}
		catch (exception)
		{
			log_exception('rename_playlist', exception)
		}
	})

	socket.on('delete_playlist', async function(playlist_id) {
		if(!socket.name)
			return
		try
		{
			await db_beginTransaction()

			var my_playlists = await db_select('Playlists', 'Accounts', format('Name LIKE "{0}"', socket.name), 'LIMIT 1').then(ret => ret[0].Playlists).then(JSON.parse)
			my_playlists.splice(my_playlists.indexOf(playlist_id), 1)

			await db_update('Accounts', format('Playlists = "{0}"', JSON.stringify(my_playlists)), format('Name LIKE "{0}"', socket.name))
			await db_update('Playlists', format('Deleted = "1"'), format('Id = "{0}"', playlist_id))

			// 좋아요 표시한 재생목록이었다면 할당 해제
			var likeplaylist_id = await db_select('LikePlaylist', 'Accounts', format('Name LIKE "{0}"', socket.name), 'LIMIT 1').then( ret => ret[0].LikePlaylist )
			if(likeplaylist_id == playlist_id)
				await db_update('Accounts', 'LikePlaylist = NULL', format('Name LIKE "{0}"', socket.name))

			await db_commit()

			update_playlist(socket)
		}
		catch (exception)
		{
			log_exception('delete_playlist', exception)
			await db_rollback()
		}
	})

	/* 특정 재생목록의 특정 인덱스 영상 삭제 */
	socket.on('delete_video', async function(data) {
		if(!socket.name)
			return

		/*
			{
				playlist_id: 대상 재생목록 id, 
				index: 대상 VideoList의 순서index, 
				video_id: 검증용 VideoId(DB에서의 순서index -> `Videos.Id`)
			}
		*/

		// 1. 해당 플레이리스트의 비디오 목록 가져오기
		// 2. 해당 플레이리스트에 삭제 대상 비디오가 하나만 있는지 체크
		//	하나만 있다 -> 검증없이 video_id 찾아서 제거
		//	여러개 있다 -> 해당 index의 숫자가 video_id와 같은지 검증 후 제거 (검증 실패 시, alert 보내기)
		// 3. 성공 했을 때만 재생목록 업뎃
		// 4. 디제잉 중이었던 유저고, 해당 재생목록이 비게 되었으면 dj목록에서 제거한 후 알려준다.

		try
		{
			await db_beginTransaction()

			var video_list = await db_select('VideoList', 'Playlists', format('Id = {0}', data.playlist_id)).then(ret => ret[0].VideoList).then(JSON.parse)
			var dest_count = video_list.filter(x => x == data.video_id).length
			if(dest_count == 0)
				throw {message: format('플레이리스트에 해당 영상이 없음. {0} not in {1}', data.video_id, JSON.stringify(video_list))}

			// 여러개 있는지 체크 -> 있으면 검증필요
			if(dest_count > 1) 
			{
				if(video_list[data.index] != data.video_id)
					throw {message: format('검증 실패. {0} not at {1}[{2}]', data.video_id, JSON.stringify(video_list), data.index)}

				video_list.splice(data.index, 1)
			}
			else
			{
				video_list.splice(video_list.indexOf(data.video_id), 1)
			}

			await db_update('Playlists', format('VideoList = "{0}"', JSON.stringify(video_list)), format('Id = {0}', data.playlist_id))

			await db_commit()
			
			log('INFO', 'delete_video', format('{0} 이(가) {1}번 재생목록에서 Id: {2} 영상을 삭제', socket.name, data.playlist_id, data.video_id))
			update_playlist(socket)

			// 디제잉 중이었던 유저고, 해당 재생목록이 비게 되었으면 dj목록에서 제거한 후 알려준다.
			if(g_djs.indexOf(socket.name) != -1 && video_list.length == 0)
			{
				g_djs.splice(g_djs.indexOf(socket.name), 1)
				socket.emit('dj_state', false)
				update_djs()
			}
		}
		catch (exception)
		{
			log_exception('delete_video', exception, data)
			await db_rollback()
		}
	})

	/* 재생 목록 셔플 */
	socket.on('shuffle', async function(playlist_id) {
		try
		{
			var video_list = await db_select('VideoList', 'Playlists', format('Id = {0}', playlist_id), 'LIMIT 1') .then(ret => ret[0].VideoList).then(JSON.parse)
			shuffle(video_list)
			await db_update('Playlists', format('VideoList = "{0}"', JSON.stringify(video_list)), format('Id = {0}', playlist_id))

			update_playlist(socket)
		}
		catch(exception)
		{
			log_exception('shuffle', exception)
		}
	})

	/* 비디오 순서 변경 (위아래) */
	socket.on('change_video_order', async function(data) {
		/* 
		{
			playlist_id: 플레이리스트 아이디, 
			video_index: 배열에서의 해당 비디오의 인덱스
			video_id: 검증용 Videos 인덱스
			isDown: 위로 올릴건지, 아래로 내릴건지
			isForceMost: 맨 위 또는 맨 아래로
		} 
		*/

		// 1. 해당 플레이리스트의 VideoList를 가져온다
		// 2. 검증 필요 여부 확인 (해당 VideoList안에 검증용 video_id의 갯수 체크)
		//	- 0개 : 에러
		//	- 1개 : 검증 필요 X
		//	- 2개 이상 : 검증 필요 O
		// 3. 해당 video를 배열에서 꺼내서 위나 아래에 넣는다. (0이거나 끝자리일 때 오버되지 않도록 유의해야한다.)
		// 4. 다시 DB에 반영~
		// 5. update_playlist

		try
		{
			var video_list = await db_select('VideoList', 'Playlists', format('Id = {0}', data.playlist_id)).then(ret => ret[0].VideoList).then(JSON.parse)
			if(video_list.length <= 1)
				return

			var match_count = video_list.map(x => x == data.video_id).length
			if(match_count == 0)
				throw {message: '대상 비디오가 없다.'}

			if(video_list[data.video_index] != data.video_id)
				throw {message: '검증 실패. data:' + JSON.stringify(data) + ' videoList:' + JSON.stringify(video_list)}
	
			// if(!data.isDown && data.video_index == 0 || data.isDown && data.video_index == video_list.length - 1) // 범위를 넘어가는 정렬
			// 	return

			var dest_index = 0
			if(data.isForceMost)
			{
				dest_index = data.isDown ? video_list.length - 1 : 0
			}
			else
			{
				dest_index = data.isDown ? data.video_index + 1 : data.video_index - 1
				if(dest_index == -1)
					dest_index = video_list.length - 1
				if(dest_index == video_list.length)
					dest_index = 0
			}

			var poped_video_id = video_list.splice(data.video_index, 1)[0]
			video_list.splice(dest_index, 0, poped_video_id)

			await db_update('Playlists', format('VideoList = "{0}"', JSON.stringify(video_list)), format('Id = {0}', data.playlist_id))

			update_playlist(socket)
		}
		catch (exception)
		{
			log_exception('change_video_order', exception)
			update_playlist(socket)
		}

	})

	/*  특정 재생목록에 video 추가  */
	// 유효한 영상이어야한다. (삭제된 영상이 아니어야한다. Embedding 비허용 영상은 상관 없음.) 
	socket.on('push_video', function(data) {
		// data : {video_id: 추가할 비디오 아이디, playlist_id: 추가할 플레이리스트 아이디}

		if(!socket.name)
			return

		push_videos(data.video_id, data.playlist_id)
	})

	/* 특정 재생목록에 재생목록 단위로 video 추가 */
	socket.on('push_playlist', async function(data) {
		// data : {youtube_playlist_id: 추가할 재생목록 아이디, playlist_id: 추가할 DB플레이리스트 아이디}

		if(!socket.name)
			return
		try
		{
			var video_list = []
			var nextPageToken = ''
			for(var i = 0; i < 10; ++i) // 최대 500개 까지만 ..
			{
				var request_ret = await request_youtube_playlist(data.youtube_playlist_id, nextPageToken).then(parse_youtube_playlist_data)
				video_list.push(...request_ret.list)
				
				nextPageToken = request_ret.nextPageToken
				if(!request_ret.nextPageToken)
					break
			}
			push_videos(video_list, data.playlist_id)
		}
		catch (exception)
		{
			log_exception('push_playlist', exception)
			socket.emit('push_video_result', {isSuccess: false, message: '영상을 추가하는 중에 오류가 발생했습니다.\n' + exception.err})
		}
	})

	async function push_videos(videoId_list, playlist_id)
	{
		try
		{
			var result = await get_video_index(videoId_list)
			var successed = result.filter(x => x.Id)
			var blocked = result.filter(x => !x.Id && x.Name)
			var failed = result.filter(x => !x.Id && !x.Name)

			// 재생목록에 이미 있는 영상인지 중복체크
			var cur_videos = await db_select('VideoList', 'Playlists', format('Id = {0}', playlist_id), 'LIMIT 1').then(e => e[0].VideoList).then(JSON.parse)
			var duplicated = successed.filter(x => cur_videos.indexOf(x.Id) != -1)
			if(duplicated.length > 0)
				successed = successed.filter(x => !duplicated.find(y => y.Id == x.Id))

			// 재생목록에 추가
			if(successed.length > 0)
				await db_update('Playlists', format('VideoList = JSON_MERGE_PRESERVE(VideoList, JSON_ARRAY({0}))', successed.map(x => x.Id).join(', ')), format('Id = {0}', playlist_id))

			// 출력 문자열 구성
			var ret_str = ''

			if(duplicated.length > 0)
				ret_str += duplicated.map(x => format('[중복됨] {0} ({1})', x.Name, parse_second_to_string(x.Length))).join('\n') + '\n'
			
			if(blocked.length > 0)
				ret_str += blocked.map(x => format('[외부 재생 제한] {0} ({1})', x.Name, parse_second_to_string(x.Length))).join('\n') + '\n'
			
			if(failed.length > 0)
				ret_str += failed.map(x => format('[조회 실패] {0}', x.VideoId)).join('\n') + '\n'

			if(successed.length > 0)
				ret_str += successed.map(x => format('[등록 성공] {0} ({1})', x.Name, parse_second_to_string(x.Length))).join('\n')


			log('INFO', 'push_videos', format('SUCCESS! VideoID. [{0}] ({2}개) -> Playlist. {1}', successed.map(x => x.Id).join(', '), playlist_id, successed.length) )
			socket.emit('push_video_result', {isSuccess: true, message: ret_str})
			update_playlist(socket)
		}
		catch (exception)
		{
			log_exception('push_videos', exception)
			socket.emit('push_video_result', {isSuccess: false, message: '영상을 추가하는 중에 오류가 발생했습니다.\n' + exception.err})
		}
	}

	/* 좋아요/싫어요 투표 신호 */
	socket.on('rating', function(isGood) {
		if(!socket.name)
			return

		// 비디오 재생중 체크
		if(!g_video_id)
			return

		var is_in_good = g_good_list.indexOf(socket.name) != -1
		var is_in_bad = g_bad_list.indexOf(socket.name) != -1
		var is_nothing = !is_in_good && !is_in_bad

		// 기존꺼 제거
		if(!is_nothing)
		{
			if(is_in_good)
				g_good_list.splice(g_good_list.indexOf(socket.name), 1)
			else
				g_bad_list.splice(g_bad_list.indexOf(socket.name), 1)
		}

		// 새로 추가
		if(isGood)
		{
			if(!is_in_good)
				g_good_list.push(socket.name)
		}
		else
		{
			if(!is_in_bad)
				g_bad_list.push(socket.name)
		}

		log('INFO', 'rating', format('{0} 가 {1} 클릭 --> good: {2}, bad: {3}', socket.name, isGood ? 'good' : 'bad', JSON.stringify(g_good_list), JSON.stringify(g_bad_list)))

		// 재생목록에 추가
		if(isGood && !is_in_good)
			add_to_likeplaylist(socket.name, g_video_id)

		// 모두에게 좋/싫 알림
		update_current_rating(io.sockets)

		if(g_bad_list.length >= 5)
		{
			io.sockets.emit('chat_update', {type: 'system_message', time: GetTime(), message: '싫어요 5개 이상 투표를 받아 스킵되었습니다.' })
			log('INFO', 'socket.rating', 'skipped by bad rating.')
			end_of_video()
		}
	})

	/* DJ 시작 요청 */
	socket.on('dj_enter', function() {
		if(!socket.name)
			return

		if(g_djs.indexOf(socket.name) == -1)
			g_djs.splice(-1, 0, socket.name)

		log('INFO', 'dj_enter', g_djs)
		socket.emit('dj_state', true)
		update_djs()

		if(!g_video_id)
			end_of_video() // 루프 시작
	})

	/* DJ 나가기 요청 */
	socket.on('dj_quit', function() {
		if(!socket.name)
			return

		if(g_djs.indexOf(socket.name) != -1)
			g_djs.splice(g_djs.indexOf(socket.name), 1)

		log('INFO', 'dj_quit', g_djs)

		socket.emit('dj_state', false)
		update_djs()
	})

	socket.on('ping', function() {
		socket.emit('ping')
	})

	/* 맥심 */
	var imgReg = /window\.open\('\.(\/file\/\S+?)\'/
	socket.on('maxim', function(no) {
		io.sockets.emit('chat_update', { type: 'system_message', message: '맥심 막힘. ㅠㅠ' })
	})

	var zzalReg = /<picture>.*?srcset="(https?\:\/\/(?:cdn|danbooru)\.donmai\.us\/(?:data\/)?(?:sample|original).*?)"/i
	var zzalUrlReg = /<link rel="canonical" href="(.*?)">/
	socket.on('zzal', async function(tag) {
		load_danbooru_zzal(tag)
	})

	async function load_danbooru_zzal(tag, retry_count = 0) {
		try
		{
			tag = tag.replace(/ /g, '_')
			await request(format('https://danbooru.donmai.us/posts/random?tags={0}', tag))
				.then( ret => {
					url = zzalUrlReg.exec(ret)[1]
					console.log('zzal url : ' + url)
					ret = zzalReg.exec(ret)[1]
					io.sockets.emit('chat_update', { type: 'system_message', message: format('/img {0} {1}?tags={2}', ret, url, tag) })
				})
				.catch( exception => { throw exception } )
		}
		catch (exception)
		{
			if(exception.statusCode == 404)
			{
				io.sockets.emit('chat_update', { type: 'system_message', message: format('{0} 짤 검색결과 없음!', tag) })
				return
			}
			log_exception('zzal', exception, format('https://danbooru.donmai.us/posts/random?tags={0}', tag))
			
			if(retry_count < 5)
			{
				load_danbooru_zzal(tag, retry_count + 1)
			}
			else
			{
				io.sockets.emit('chat_update', { type: 'system_message', message: format('{0} 짤 불러오기 실패', tag) })
			}
		}
	}

	socket.on('icon_register', async function(image_data) {
		try
		{
			if(image_data.startsWith('data:image/'))
			{
				image_data = image_data.replace(/^data:image\/png;base64,/, "")
				fs.writeFileSync(format('static/icon/{0}.png', g_users_dic[socket.name].icon_id), image_data, 'base64')
			}
			else
			{
				image_data = await request({ url: image_data, encoding: null })
				fs.writeFileSync(format('static/icon/{0}.png', g_users_dic[socket.name].icon_id), image_data)
			}
			
			await db_update('Icons', 'Ver = Ver + 1', format('Name LIKE "{0}"', socket.name))
			g_users_dic[socket.name].icon_ver += 1
			socket.emit('chat_update', {type: 'system_message', message: '아이콘이 변경되었습니다.'})
			update_users()
		}
		catch (exception)
		{
			log_exception('icon_register', exception)
		}
	})

	socket.on('test_begin', async function() {
		io.sockets.emit('chat_update', {type: 'system_message', message: 'begin 진입한다'})
		var ret = await db_query('BEGIN')
		io.sockets.emit('chat_update', {type: 'system_message', message: 'begin 성공 ' + JSON.stringify(ret)})
	})
	socket.on('test_commit', async function() {
		io.sockets.emit('chat_update', {type: 'system_message', message: 'commit 진입한다'})
		var ret = await db_query('COMMIT')
		io.sockets.emit('chat_update', {type: 'system_message', message: 'commit 성공 ' + JSON.stringify(ret)})
	})

	/* TEST: 인스턴트 쿼리 */
	socket.on('query', function(query) {
		db.query(query, (error, result) => { 
				error ? console.log(error) : console.log(result)
				io.sockets.emit('chat_update', {type:'system_message', message: result})
		})
	})

	/* TEST: 영상 정보 요청 */
	socket.on('request_video_info', async function(video_id) {
		try {
			var response_data = await request_youtube_video(video_id)
			.then(JSON.stringify)
			//.then(parse_youtube_video_data)
			log('INFO', 'request_video_info', response_data)
		}
		catch (exception)
		{
			log_exception('request_video_info', exception)
		}
	})

	socket.on('tts', async function(data) {
		log('INFO', 'TTS', format('{0} make tts ({1}, {2}) : {3}', socket.name, data.tts_hash, data.voice_name, data.text))
		make_tts(data.text, data.tts_hash, socket.name, data.voice_name)
	})


	socket.on('ad', function(message) {
		var hRate = Math.random()
		log('INFO', 'AD', format('{0} make ad : {1}', socket.name, message))
		io.sockets.emit('ad', { message: message, hRate: hRate })
	})

	socket.on('image_blob', async function(blob) {
		if(!socket.name)
			return

		if(!g_users_dic[socket.name])
		{
			log_exception('image_blob', null, g_users_dic[socket.name])
			return
		}

		try
		{
			image_data = blob.replace(/^data:image\/png;base64,/, "")
			const writeFile = util.promisify(fs.writeFile)
			var filename = format('{0}_{1}.png', GetDateForFilename(), Math.round(Math.random() * 10000000))
			await writeFile(format('static/images/{0}', filename), image_data, 'base64')
			
			var data = {
				type: 'message',
				message: format('/img static/images/{0}', filename),
				name: socket.name,
				time: GetTime(),
				icon_id: g_users_dic[socket.name].icon_id,
				icon_ver: g_users_dic[socket.name].icon_ver
			}

			log('INFO', 'image_blob', format('{0}({1}) makes image -> {2}', socket.name, g_users_dic[socket.name].ip, filename))

			io.sockets.emit('chat_update', data)
		}
		catch (exception)
		{
			log_exception('image_blob', blob, blob.substr(0, 10))
		}
	})


	/* ============================== 롤백 on =================================== */

	socket.on('lol_get_article_list', async function(data) {
		var seq = data.seq
		var cnt = data.cnt
		var body = data.body
		var nick = data.nick
		var vote = data.vote
		var android_id = data.android_id
		var mine = data.mine

		var ret = await lol_get_article_list(android_id, seq, cnt, body, nick, vote, mine)
		socket.emit('data', ret)

		/*
			아이콘	icon_img
			제목	post_title
			댓글	reply_cnt
			before
			닉넴	nickname
			조회	views
			추천	likes
			짤여부 (+두들러, 유튭링크)	pic_new, youtube_url, doodlr
			기본아이콘	badge_use

			(내부)
			post_seq
		*/
		socket.emit('lol_article_list', ret)
	})

	socket.on('lol_get_article_detail', async function(data) {
		var post_seq = data.post_seq
		var android_id = data.android_id
		var ret = await lol_get_article_detail(android_id, post_seq)
		var replys = await lol_get_article_replys(android_id, post_seq)
		ret['replys'] = replys

		socket.emit('data', ret)

		socket.emit('lol_article_detail', ret)
	})

	/* 롤백 계정 인증 요청 */
	socket.on('lol_auth_request', async function(post_seq) {
		var this_android_id = await lol_get_android_id_from_article(post_seq)

		log('INFO', 'lol_auth_request', format('{0} 가 계정인증 요청 -> {1}', socket.name, this_android_id))

		if(!this_android_id)
			return

		if(socket.name in g_lol_auth_dic)
		{
			var lulu_comment = await lol_get_lulu_comment(this_android_id)
			log('INFO', 'lol_auth_request', format('인증번호: [{0}], 룰루: [{1}], [{2}]', g_lol_auth_dic[socket.name], lulu_comment, String(g_lol_auth_dic[socket.name]).length))
			if(lulu_comment == g_lol_auth_dic[socket.name] && String(g_lol_auth_dic[socket.name]).length > 0)
			{
				console.log('fuck?!')
				g_lol_auth_dic[socket.name] = ''
				var user_info = await lol_get_user_info(this_android_id)
				socket.emit('lol_login', [this_android_id, user_info]) // 인증성공

				await db_update('Secures', format("android_id = '{0}'", this_android_id), format('IP = "{0}"', g_users_dic[socket.name].ip))
				return
			}
		}

		var random_code_4 = Math.round(Math.random() * 10000)
		while(random_code_4 < 1000)
			random_code_4 = Math.round(Math.random() * 10000)
		g_lol_auth_dic[socket.name] = random_code_4
		log('INFO', 'lol_auth_request', format('{0}에게 인증번호 {1} 발급', socket.name, random_code_4))
		socket.emit('lol_auth_request', random_code_4) // 인증코드 건네줌
	})

	/* 내 정보 */
	socket.on('lol_user_info', async function(android_id) {
		var user_info = await lol_get_user_info(android_id)
		log('INFO', 'lol_user_info', format('{0} 롤백 유저정보 요청 : {1}({2})', socket.name, user_info['nickname'], android_id))

		socket.emit('lol_user_info', user_info)
	})

	/* 댓글 작성 */
	socket.on('lol_write_reply', async function(data) {
		var android_id = data.android_id
		var post_seq = data.post_seq
		var body = data.body

		log('INFO', 'lol_write_reply', format('{0}가 {1} 계정으로 댓글 남김 -> {2} : {3}', socket.name, android_id, post_seq, body))

		await lol_write_reply(post_seq, android_id, body)

		var ret = await lol_get_article_detail(android_id, post_seq)
		var replys = await lol_get_article_replys(android_id, post_seq)
		ret['replys'] = replys

		socket.emit('lol_write_reply', ret)
	})

	/* 추천 버튼 */
	socket.on('lol_like', async function(data) {
		var android_id = data.android_id
		var post_seq = data.post_seq

		log('INFO', 'lol_like', format('{0}가 {1} 계정으로 추천 누름 -> 글번호 {2}', socket.name, android_id, post_seq))

		var isSuccess = await lol_like(post_seq, android_id)
		socket.emit('lol_like', isSuccess)
	})

	/* 댓글 삭제 버튼 */
	socket.on('lol_delete_reply', async function(data) {
		var android_id = data.android_id
		var post_seq = data.post_seq
		var reply_seq = data.reply_seq

		log('INFO', 'lol_delete_reply', format('{0}가 {1} 계정으로 댓글 삭제 -> 글번호 {2}, 댓글번호 {3}', socket.name, android_id, post_seq, reply_seq))
		await lol_delete_reply(android_id, post_seq, reply_seq)

		var ret = await lol_get_article_detail(android_id, post_seq)
		var replys = await lol_get_article_replys(android_id, post_seq)
		ret['replys'] = replys

		socket.emit('lol_delete_reply', ret)
	})

	/* 글 쓰기 */
	socket.on('lol_write', async function(data) {
		var android_id = data.android_id
		var subject = data.subject
		var body = data.body
		var youtube_url = data.youtube_url
		var image = data.image
		
		log('INFO', 'lol_write', format('{0}가 {1} 계정으로 글 작성 -> 제목: {2}, 내용: {3}, 유튜브주소: {4} {5}', socket.name, android_id, subject.replace('\n', '\\n'), body.replace('\n', '\\n'), youtube_url, (image ? '(짤 첨부)' : '')))

		await lol_write(android_id, subject, body, youtube_url, image)

		socket.emit('lol_write')
	})

	/* 글 삭제 */
	socket.on('lol_delete', async function(data) {
		var android_id = data.android_id
		var post_seq = data.post_seq

		log('INFO', 'lol_delete', format('{0}가 {1} 계정으로 글 삭제 -> 글번호 {2}', socket.name, android_id, post_seq))

		await lol_delete(android_id, post_seq)

		socket.emit('lol_delete')
	})

	// /* 해당 유저의 작성 글 보기 */
	// socket.on('lol_user_article', async function(data) {
	// 	var android_id = data.android_id
	// 	var post_seq = data.post_seq

	// 	await lol_get_android_id_from_article(post_seq)
	// })

}) 

function update_users()
{
	io.sockets.emit('users', Object.keys(g_users_dic).map(x => Object({ nick: x, icon_id: g_users_dic[x].icon_id, icon_ver: g_users_dic[x].icon_ver })))
}

function update_djs()
{
	io.sockets.emit('djs', g_djs.map(x => Object({ nick: x, icon_id: g_users_dic[x].icon_id, icon_ver: g_users_dic[x].icon_ver })))
}

/* VideoId의 DB Id를 반환 (없으면 추가) / return : {successed, failed (VideoId만 있음), blocked (Id만 없음)} */
async function get_video_index(video_id_list)
{
	try
	{
		if(typeof(video_id_list) != 'object')
			video_id_list = [video_id_list]

		// [{VideoId: 'vQHVGXdcqEQ', Id: 0, Name: '', Length: 0}, { ... }, ...] 으로 변환
		var ret_list = video_id_list.map( x => Object({VideoId: x, Id: 0, Name: '', Length: 0}) )

		// 기존 DB에 등록된 애들은 Id 가져와서 적용
		var select_ret = await db_select('Id, VideoId, Name, Length, Author', 'Videos', format('VideoId In ({0})', video_id_list.map(x => format('\'{0}\'', x)).join(', ')))
		Array.from(select_ret).forEach(x => {
			var data = ret_list.find(f => f.VideoId == x.VideoId)
			data.Id = x.Id
			data.Name = x.Name
			data.Length = x.Length
			data.Author = x.Author
		})

		// DB에 없던 놈들은 모아서 DB에 등록 (병렬 Promise 사용)
		async function put_video_to_db(video_id) {
			// 1-1. youtube data request
			var video_data = await request_youtube_video(video_id).then(parse_youtube_video_data).catch(() => false)
			// var { tags, ...other_data } = video_data
			
			if(!video_data)
				return

			log('INFO', 'put_video_to_db - yt data', video_data.title)

			var data = ret_list.find(f => f.VideoId == video_id)
			data.Name = video_data.title
			data.Length = video_data.duration
			data.Author = video_data.author

			// 외부 재생 제한 영상의 경우
			if(!video_data.embeddable)
				return

			// 1-2. Videos DB에 등록
			// 1-3. insertId 가져오기
			var inserted_id = await db_insert('Videos', ['Name', 'VideoId', 'Length', 'Thumbnail', 'Author'], [video_data.title, video_id, video_data.duration, video_data.thumbnail_url, video_data.author])
							.then((ret) => ret.insertId)
			
			data.Id = inserted_id
		}
		var to_register_videoId_list = ret_list.filter(e => !e.Id).map(e => e.VideoId) // ['vQHVGXdcqEQ', ...]
		if(to_register_videoId_list.length > 0)
		{
			var promises = to_register_videoId_list.map( x => put_video_to_db(x) )
			await Promise.all(promises)
		}

		return ret_list
	}
	catch (exception)
	{
		log_exception('get_video_index', exception)
	}
}

/* 서버를 8080 포트로 listen */
server.listen(g_port, function() {
	console.log('\x1b[42m======================== 서버 실행 중.. ============================\x1b[0m')
})

function GetTime() 
{
	return new Date().addHours(9).toFormat('HH24:MI')
}
function GetDate() 
{
	return new Date().addHours(9).toFormat('YYYY-MM-DD HH24:MI:SS')
}
function GetDateForFilename() 
{
	return new Date().addHours(9).toFormat('YYYY-MM-DD_HH24.MI.SS')
}


function log(type, function_name, message, isChat = false)
{
	if(isChat)
		return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m {1} :', GetDate(), function_name), message, '\x1b[0m')

	var color = '\x1b[37m'
	if(type == 'INFO')
		color = '\x1b[32m'
	else if(type == 'ERROR' || type == 'ERROR_CATCH')
		color = '\x1b[31m'

	return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m [{2}]{1}', GetDate(), color, function_name), message, '\x1b[0m')
}

function log_exception(function_name, exception, message = null)
{
	if(typeof(message) == 'object')
		message = JSON.stringify(message)
	log('ERROR_CATCH', function_name, format('\nName : {0}\nERROR : {1}\nMessage : {2}\nStack : {3}\nComment : {4}\nLast Query : {5}', exception.name, exception.err, exception.message, exception.stack, message, g_last_query))
	io.sockets.emit('throw_data', exception)
}

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}

var regH = /(\d+)H/
var regM = /(\d+)M/
var regS = /(\d+)S/
function parse_duration_to_second(pt_time)
{
	var h = 0
	var m = 0
	var s = 0

	if(regH.test(pt_time))
		h = parseInt(regH.exec(pt_time)[1])
	if(regM.test(pt_time))
		m = parseInt(regM.exec(pt_time)[1])
	if(regS.test(pt_time))
		s = parseInt(regS.exec(pt_time)[1])

	s += h * 60 * 60
	s += m * 60
	return s
}

async function end_of_video() {
	if(g_end_timer != null)
		clearTimeout(g_end_timer)
	g_end_timer = null

	log('INFO', 'end_of_video', 'end of video')

	g_good_list = []
	g_bad_list = []

	if(g_queue.length > 0)
	{
		var next_queue_data = g_queue[0]
		g_queue.splice(0, 1)

		g_current_dj = next_queue_data.dj

		if(g_current_dj in g_users_dic == false)
		{
			g_current_dj = ''
			return end_of_video()
		}
		g_video_id = next_queue_data.video_id
		g_video_thumbnail = next_queue_data.data.thumbnail_url
		g_video_duration = next_queue_data.data.duration
		g_video_title = next_queue_data.data.title
		g_video_author = next_queue_data.data.author
		g_played_time_ms = Date.now()

		// 영상 종료 타이머 설정
		if(g_video_duration != 0)
			set_timeout_end_of_video()

		log('INFO', 'queue_play', next_queue_data)

		// 모두에게 영상 갱신
		update_current_video(io.sockets)
		add_to_recent_video_list(g_video_id, g_video_title, g_video_thumbnail, g_current_dj, g_video_duration)
		update_recent_video_list(io.sockets)

		// 모두에게 플레이 대기열 알림
		update_current_queue(io.sockets)
	}
	else if(g_djs.length > 0)
	{
		try 
		{
			var this_dj = g_djs.splice(0, 1)[0] // 맨 앞 디제이 뽑음
			g_djs.push(this_dj) // 맨 뒤에 다시 추가

			var playlist_id = await db_select('CurrentPlaylist', 'Accounts', format('Name LIKE "{0}"', this_dj), 'LIMIT 1').then(ret => ret[0].CurrentPlaylist)
			var video_list = await db_select('VideoList', 'Playlists', format('Id = {0}', playlist_id), 'LIMIT 1').then(ret => ret[0].VideoList).then(JSON.parse)

			// 만약 재생목록이 비어있다면 -> 자동으로 대기열에서 퇴출
			if(video_list.length == 0)
			{
				if(g_djs.indexOf(this_dj) != -1)
					g_djs.splice(g_djs.indexOf(this_dj), 1)

				log('INFO', 'end_of_video - auto dj_quit', this_dj)

				if(this_dj in g_users_dic)
					g_users_dic[this_dj].socket.emit('dj_state', false)
				update_djs()
				
				return end_of_video()
			}
			
			var first_video_id = video_list.splice(0, 1)[0]
			video_list.push(first_video_id)
			var video_info = await db_select('Id, Name, VideoId, Length, Thumbnail, Author', 'Videos', format('Id = {0}', first_video_id), 'LIMIT 1').then(ret => ret[0])
			
			// 재생목록의 영상 순서 순환
			await db_update('Playlists', format('VideoList = "{0}"', JSON.stringify(video_list)), format('Id = {0}', playlist_id))

			g_current_dj = this_dj
			g_video_id = video_info.VideoId
			g_video_thumbnail = video_info.Thumbnail
			g_video_duration = video_info.Length
			g_video_title = video_info.Name
			g_video_author = video_info.Author
			g_played_time_ms = Date.now()

			// 영상 종료 타이머 설정
			if(g_video_duration != 0)
				set_timeout_end_of_video()

			log('INFO', 'dj_play', format('{0} -> {1} ({2})', g_current_dj, g_video_title, g_video_duration))

			// 모두에게 영상 갱신
			update_current_video(io.sockets)
			add_to_recent_video_list(g_video_id, g_video_title, g_video_thumbnail, g_current_dj, g_video_duration)
			update_recent_video_list(io.sockets)

			// 모두에게 플레이 대기열 알림
			update_current_queue(io.sockets)

			// 이번 DJ에게 재생목록 데이터 변경을 알림
			log('INFO', 'end_of_video - DJ', format('{0} [{1}]', this_dj, Object.keys(g_users_dic).join(', ')))
			update_playlist( g_users_dic[this_dj].socket )
		}
		catch (exception)
		{
			log_exception(exception)
		}
	}
	else
	{
		g_current_dj = ''
		g_video_id = ''
		g_video_thumbnail = ''
		g_video_duration = 0
		g_video_title = ''
		g_video_author = ''
		io.sockets.emit('update_current_video', null)
	}

	// 모든 소켓들에게 dj 상태 갱신
	for(var e in g_users_dic)
		g_users_dic[e].socket.emit('dj_state', g_djs.includes(e))
	update_djs()

	// 모두에게 좋/싫 알림
	update_current_rating(io.sockets)
}

/* 현재 영상 전송 */
function update_current_video(dest_socket)
{
	dest_socket.emit('update_current_video', {
		dj: g_current_dj,
		video_id: g_video_id,
		author: g_video_author,
		title: g_video_title,
		duration: g_video_duration,
		thumbnail: g_video_thumbnail,
		seek_s: g_video_duration > 0 ? ((Date.now() - g_played_time_ms - 1000) / 1000) : 999999999
	})
}

/* 플레이 대기열 알림 발사 */
function update_current_queue(dest_socket, is_on_demand = false)
{
	if(g_queue.length == 0)
	{
		if(is_on_demand)
			dest_socket.emit('chat_update', {type: 'system_message', time: GetTime(), message: '플레이 대기열 없음', bg: 'var(--채팅_시스템)' })
		return
	}

	var str = '플레이 대기열\n\n'
	str += g_queue.map( (x, i) => format('{0}. {1} - {2} ({3})', i+1, x.dj, x.data.title, parse_second_to_string(x.data.duration))).join('\n\n')

	dest_socket.emit('chat_update', {type: 'system_message', time: GetTime(), message: str, bg: 'var(--채팅_시스템)'})
}

/* 좋아요/싫어요 알림 */
function update_current_rating(dest_socket)
{
	dest_socket.emit('rating', {good: g_good_list, bad: g_bad_list})
}

/* 해당 유저에게 플레이리스트 갱신 */
async function update_playlist(socket, show_playlist_id = 0) // show_playlist_id : 새 재생목록 만들었을 때 해당 재생목록이 선택될 수 있도록 아이디 알려줌
{
	// 플레이리스트들의 제목과 곡정보들 리스트 보내주면 될 듯 [playlist_id1: {name:"내 재생목록", list:[{title:"언더테일 브금", duration:90}, {title:"천아연유튜브소개영상", duration:10}]}]
	try
	{
		// 해당 계정의 재생목록ID 전체를 가져옴
		var acccount_data = await db_select('Playlists, CurrentPlaylist', 'Accounts', format('Name LIKE "{0}"', socket.name), 'LIMIT 1').then( (ret) => ret[0] )
		var current_playlist = JSON.parse(acccount_data.CurrentPlaylist)
		var playlist_id_list = JSON.parse(acccount_data.Playlists)

		// 해당 재생목록들의 내용을 가져옴 [ { Name:내 재생목록, VideoList:[2134,2345,12,1] } , ... ]
		var playlist_info_list = await db_select('Id, Name, VideoList', 'Playlists', format('Id IN ({0})', playlist_id_list.join(', '))).then(JSON.stringify).then(JSON.parse)

		// VideoList의 원소들을 모은다 (Videos DB에 한번에 요청하기 위해)
		video_index_list = []
		for(var e of playlist_info_list)
		{
			e.VideoList = JSON.parse(e.VideoList)
			video_index_list.push(...e.VideoList)
		}
		video_index_list = [...new Set(video_index_list)] // 중복 제거

		var video_info_dic = {}
		if(video_index_list.length > 0)
		{
			// Videos DB에 비디오 정보를 한번에 조회
			var video_info_list = await db_select('Id, Name, VideoId, Length, Thumbnail, Author', 'Videos', format('Id IN ({0})', video_index_list.join(', '))).then(JSON.stringify).then(JSON.parse)

			// Video 정보를 Dic형태로 재구성
			for(var e of video_info_list)
				video_info_dic[e.Id] = { Name: e.Name, VideoId: e.VideoId, Length: e.Length, Thumbnail: e.Thumbnail, Author: e.Author }
		}

		socket.emit('update_playlist', [video_info_dic, playlist_info_list, current_playlist, show_playlist_id])
	}
	catch (exception)
	{
		log_exception('playlist', exception)
	}
}

/* 좋아요 누른 영상 목록에 추가 */
async function add_to_likeplaylist(nick, video_id)
{
	try
	{
		await db_beginTransaction()

		var likeplaylist_id = await db_select('LikePlaylist', 'Accounts', format('Name LIKE "{0}"', nick), 'LIMIT 1').then( ret => ret[0].LikePlaylist )
		if(!likeplaylist_id) // 만약 좋아요 재생목록이 없다면 새로 만들고 해당 리스트를 좋아요재생목록으로 지정
		{
			// 새 재생목록 생성
			var new_playlist_id = await db_insert('Playlists', ['Name', 'VideoList'], ['좋아요 누른 영상', '[]']).then(ret => ret.insertId)
			
			// 유저의 현재 재생목록에 추가
			await db_update('Accounts', format('Playlists = JSON_ARRAY_APPEND(Playlists, "$", {0})', new_playlist_id), format('Name LIKE "{0}"', nick))
			await db_update('Accounts', format('LikePlaylist = {0}', new_playlist_id), format('Name LIKE "{0}"', nick))
			
			log('INFO', 'add_to_likeplaylist', format('{0} 이(가) 좋아요 재생목록을 생성 ({1})', nick, new_playlist_id))

			likeplaylist_id = new_playlist_id
		}

		var result = await get_video_index(video_id)
		var successed = result.filter(x => x.Id)
		// var blocked = result.filter(x => !x.Id && x.Name)
		// var failed = result.filter(x => !x.Id && !x.Name)

		// 재생목록에 이미 있는 영상인지 중복체크
		var cur_videos = await db_select('VideoList', 'Playlists', format('Id = {0}', likeplaylist_id), 'LIMIT 1').then(e => e[0].VideoList).then(JSON.parse)
		var duplicated = successed.filter(x => cur_videos.indexOf(x.Id) != -1)
		if(duplicated.length > 0)
			successed = successed.filter(x => !duplicated.find(y => y.Id == x.Id))

		if(successed.length == 0)
		{
			log('ERROR', 'add_to_likeplaylist', duplicated.length > 0 ? '좋아요 영상 추가 실패 (중복 영상이라)' : '알 수 없는 에러')
			await db_commit()
			return
		}

		await db_update('Playlists', format('VideoList = JSON_MERGE_PRESERVE(VideoList, JSON_ARRAY({0}))', successed.map(x => x.Id).join(', ')), format('Id = {0}', likeplaylist_id))
		
		await db_commit()
		
		// 업데이트
		if(nick in g_users_dic)
			update_playlist(g_users_dic[nick].socket)
	}
	catch (exception)
	{
		log_exception('add_to_likeplaylist', exception)
		await db_rollback()
	}
}

/* 최근 재생 영상 목록에 영상 추가 */
function add_to_recent_video_list(video_id, title, thumbnail, dj, duration)
{
	// g_recent_video_list
	// g_recent_video_list_limit

	// 오바하는 갯수 쳐내기 (이번에 들어갈 자리 마련하기위해 최대개수-1개로 만듬)
	if(g_recent_video_list.length >= g_recent_video_list_limit)
		g_recent_video_list.splice(g_recent_video_list_limit)

	g_recent_video_list.splice(0, 0, { video_id: video_id, title: title, thumbnail: thumbnail, dj: dj, duration: duration })
}

/* 최근 영상 목록 Emit */
function update_recent_video_list(dest_socket)
{
	dest_socket.emit('recent_video_list', g_recent_video_list)
}

/* 영상 종료 타이머 설정  */
function set_timeout_end_of_video()
{
	if(g_end_timer != null)
		clearTimeout(g_end_timer)
	var seek_time = Date.now() - g_played_time_ms
	// log('INFO', 'set_timeout_end_of_video', format('duration : {0}s, seek : {1}ms, newTimeout : {2}ms', g_video_duration, seek_time, (g_video_duration + 2) * 1000 - seek_time))
	g_end_timer = setTimeout(end_of_video, (g_video_duration + 2) * 1000 - seek_time)
}

function parse_second_to_string(sec) 
{
	sec = Math.round(sec)
	var h = Math.floor(sec / 3600)
	sec -= h * 60 * 60
	var m = Math.floor(sec / 60)
	sec -= m * 60
	var s = sec

	if(m < 10)
		m = '0' + m.toString()
	if(s < 10)
		s = '0' + s.toString()
	if(h > 0)
		return h + ':' + m + ':' + s
	return m + ':' + s
}

function shuffle(array) {
	for (let i = array.length - 1; i > 0; i--) {
	  let j = Math.floor(Math.random() * (i + 1));
	  [array[i], array[j]] = [array[j], array[i]];
	}
  }

function get_random_code(len)
{
	var ret = ''
	for(var i=0; i<len; ++i)
		ret += Math.floor(Math.random() * 10)
	return ret
}

/* ================================== QUERY =========================================*/

/* 유튜브 영상 정보 조회 쿼리(Promise) */
function request_youtube_video(video_id)
{
	return new Promise(function(resolve, reject) {
		var url = 'https://www.googleapis.com/youtube/v3/videos'
		var key = 'AIzaSyARG5pgayIj8ghL0hwzrNL_3pl-QeRQYMc'
		var part = 'id,snippet,contentDetails,status'
		var hl = 'ko'
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
function parse_youtube_video_data(query_result)
{
	var item = query_result.items[0]
	var video_data = {
		title : item.snippet.localized.title,
		author: item.snippet.channelTitle,
		thumbnail_url : item.snippet.thumbnails.high.url,
		duration : parse_duration_to_second(item.contentDetails.duration),
		embeddable : item.status.embeddable,
		tags : item.snippet.tags,
	}
	video_data.title = video_data.title.replace(/(\"|\')/g, '＂')
	video_data.author = video_data.author.replace(/(\"|\')/g, '＂')

	return video_data
}
function request_youtube_playlist(playlist_id, pageToken = '')
{
	return new Promise(function(resolve, reject) {
		var url = 'https://www.googleapis.com/youtube/v3/playlistItems'
		var key = 'AIzaSyARG5pgayIj8ghL0hwzrNL_3pl-QeRQYMc'
		var part = 'contentDetails'
		var maxResults = 50
		var requestUrl = format('{0}?key={1}&part={2}&maxResults={3}&playlistId={4}&pageToken={5}', url, key, part, maxResults, playlist_id, pageToken)
		g_last_query = requestUrl
		request(requestUrl, function(err, response, body) {
			err ? reject({message: 'request_youtube_playlist(' + playlist_id + ')', err: err}) : resolve(JSON.parse(body))
		})
	})
}
function parse_youtube_playlist_data(query_result)
{
	var ret_video_id_list = []
	for(var item of query_result.items)
		ret_video_id_list.push(item.contentDetails.videoId)
	return {list: ret_video_id_list, nextPageToken: query_result.nextPageToken}
}

function db_select(columns, from, where, options = '')
{
	var query = format('SELECT {0} FROM {1} WHERE {2} {3}', columns, from, where, options)
	g_last_query = query
	return new Promise(function(resolve, reject) {
		db.query(query, function(err, result) {
			err ? reject({message: query, err: err}) : resolve(result)
		})
	})
}

function db_insert(into, columns, values) 
{
	if(typeof(columns) == 'object')
		columns = columns.join('`, `')
	columns = '`' + columns + '`'

	if(typeof(values) == 'object')
		values = values.join("', '")
	values = "'" + values + "'"

	var query = format('INSERT INTO {0} ({1}) VALUES ({2})', into, columns, values)
	g_last_query = query
	return new Promise( function(resolve, reject) {
		db.query(query, function(err, result) {
			err ? reject({message: query, err: err}) : resolve(result)
		})
	})
}

function db_update(table, sets, where)
{
	if(typeof(sets) == 'object')
	sets = sets.join(', ')
	var query = format('UPDATE {0} SET {1} WHERE {2}', table, sets, where)
	g_last_query = query
	return new Promise( function(resolve, reject) {
		db.query(query, function(err, result) {
			err ? reject({message: query, err: err}) : resolve(result)
		})
	})
}

function db_query(query)
{
	g_last_query = query
	return new Promise( function(resolve, reject) {
		db.query(query, function(err, result) {
			err ? reject({message: query, err: err}) : resolve(result)
		})
	})
}

function db_beginTransaction()
{
	return new Promise( function(resolve, reject) {
		db.beginTransaction( (err) => {
			err ? reject(err) : resolve()	
		})
	})
}

function db_commit()
{
	return new Promise( function(resolve, reject) {
		db.commit( (err) => {
			err ? reject(err) : resolve()
		})
	})
}

function db_rollback()
{
	return new Promise( function(resolve, reject) {
		db.rollback( (err) => {
			err ? reject(err) : resolve()
		})
	})
}

async function make_tts(text, tts_hash, target_nick, voice_name)
{
	const request = {
	  input: {text: text},
	  voice: {languageCode: 'ko-KR', ssmlGender: 'FEMALE', name: voice_name},
	  audioConfig: {audioEncoding: 'MP3'},
	}
	const [response] = await tts_client.synthesizeSpeech(request)
	const writeFile = util.promisify(fs.writeFile)
	const file_name = './tts/' + tts_hash
	await writeFile(file_name, response.audioContent, 'binary')

	for(var e in g_users_dic)
		g_users_dic[e].socket.emit('tts', {file_name: file_name, target_nick: target_nick})
}


/* ========================================== 롤백 =============================================================== */

/* 글 목록 검색 */
async function lol_get_article_list(android_id, seq = 0, cnt = 30, search_body = '', search_nick = '', search_vote = false, search_mine = false)
{
	var articles = await lol_POST('http://lolwiki.kr/freeboard/get_post.php', 
		{ boardid: 'freeboard', android_id: android_id, seq: seq, search: search_body, cnt: cnt, isvote: search_vote, iszzal: false, ismine: search_mine, nickSearch: search_nick } )
		.catch(err => console.log('lol_get_article_list error', err))
		.then(res => res.replace(/\r/g, ''))
		.then(res => res.replace(/\n/g, '\\r\\n'))
		.then(res => res.replace(/\},\]/g, '}]'))

	const writeFile = util.promisify(fs.writeFile)
	await writeFile('asd.txt', articles)
		
	articles = await lol_POST('http://lolwiki.kr/freeboard/get_post.php', 
		{ boardid: 'freeboard', android_id: android_id, seq: seq, search: search_body, cnt: cnt, isvote: search_vote, iszzal: false, ismine: search_mine, nickSearch: search_nick } )
		.catch(err => console.log('lol_get_article_list error', err))
		.then(res => res.replace(/\r/g, ''))
		.then(res => res.replace(/\n/g, '\\r\\n'))
		.then(res => res.replace(/\},\]/g, '}]'))
		.then(JSON.parse)
		.catch(err => console.log('lol_get_article_list JSON parse error', err))



	return articles['results'].map(e => ({ icon_img: e['icon_img'], 
											post_title: e['post_title'], 
											reply_cnt: e['reply_cnt'], 
											before: e['before'],  
											nickname: e['nickname'],
											views: e['views'],
											likes: e['likes'],
											pic_new: e['pic_new'],
											youtube_url: e['youtube_url'],
											doodlr: e['doodlr'],
											badge_use: e['badge_use'],
											alarm: e['alarm'],
											pic_multi: e['pic_multi'],
											fixedpic: e['fixedpic'],
											post_seq: e['post_seq']}))
}

/* 글 내용 받아오기 */
async function lol_get_article_detail(android_id, seq)
{
	var detail = await lol_GET('http://lolwiki.kr/freeboard/get_post_detail_2020.php', { boardid: 'freeboard', post_seq: seq, android_id: android_id } )
		.then(res => res.trim())
		.then(res => res.replace(newlineHTMLReg, '\\r\\n'))
		.then(res => res.replace(/\n/g, '\\r\\n'))
		.then(res => res.replace(/'/g, '"'))
		.then(res => res.replace(/&lt;/g, '<'))
		.then(res => res.replace(/&gt;/g, '>'))
		.then(JSON.parse)
		.then(e => e['results'][0])
	
	return { post_title: detail['post_title'],
		post_text: detail['post_text'],
		post_seq: detail['post_seq'],
		post_date: detail['post_date'],
		likes: detail['likes'],
		pic_new: detail['pic_new'],
		pic_multi: detail['pic_multi'].length > 0 ? detail['pic_multi'] : detail['pic_multi_fix'],
		youtube_url: detail['youtube_url'],
		views: detail['views'],
		stack: detail['stack'],
		nickname: detail['nickname'],
		doodlr: detail['doodlr'],
		icon_img: detail['icon_img'],
		badge_use: detail['badge_use'],
		doodlrurls: detail['doodlrurls'],
		fixedpic: detail['fixedpic'],
		my_post: detail['my_post']
	
		// replys: reply['results']
	}
}

/* 댓글 내용 받아오기 */
async function lol_get_article_replys(android_id, post_seq) 
{
	var reply = await lol_GET('http://lolwiki.kr/freeboard/get_reply_2020.php', 
		{ boardid: 'freeboard', post_seq: post_seq, android_id: android_id} )
		.then(res => res.replace(/\n/g, '\\r\\n'))
		.then(res => res.replace(/'/g, '"'))
		.then(JSON.parse)

	return reply['results']
}

/* 글 post_seq로부터 글작성자의 android_id 얻기 */
const lol_android_id_from_memo_reg = /name=\'to_id\' value=\'(.+)\'/
async function lol_get_android_id_from_article(post_seq)
{
	var html = await lol_POST('http://lolwiki.kr/freeboard/memo_write_2020.php', 
		{ app_id: 'DEMACIA', android_id: android_id, memo_to: post_seq, to: post_seq } )
		.catch(err => console.log('lol_get_android_id_from_article error', err))

	if(!lol_android_id_from_memo_reg.test(html))
	{
		log('ERROR', 'lol_get_android_id_from_article', 'RegEx 실패 ' + post_seq)
		console.log(html)
		return ''
	}
	return lol_android_id_from_memo_reg.exec(html)[1]
}

/* 룰루 교육한 내용 */
const lol_lulu_comment_reg = /<span style=font-size:16px;font-weight:bold;>(\d+).*?<br>/
async function lol_get_lulu_comment(android_id)
{
	var html = await lol_POST('http://lolwiki.kr/lulu/index.html',
		{ android_id: android_id, app_id: 'DEMACIA' })

	if(!lol_lulu_comment_reg.test(html))
	{
		log('ERROR', 'lol_get_lulu_comment', 'RegEx 실패' + android_id)
		console.log(html)
		return ''
	}
	return lol_lulu_comment_reg.exec(html)[1]
}

/* 내 정보 얻어오기 */
async function lol_get_user_info(android_id)
{
	var ret = await lol_POST('http://lolwiki.kr/freeboard/get_userinfo_new.php', 
		{ boardid: 'freeboard', android_id: android_id })
		.then(JSON.parse)
		.then(e => e['results'][0])

	return ret
}

/* 댓글 작성 */
async function lol_write_reply(post_seq, android_id, body) 
{
	await lol_POST('http://lolwiki.kr/freeboard/insert_reply_pic.php', 
		{ boardid: 'freeboard', post_seq: post_seq, android_id: android_id, text: encodeURI(body) } )
}

/* 추천 버튼 */
async function lol_like(post_seq, android_id) 
{
	var ret = await lol_POST('http://lolwiki.kr/freeboard/like_post.php',
		{ boardid: 'freeboard',  post_seq: post_seq, android_id: android_id })
	
	if(ret == 'likes')
		return true
	return false // 'exist'
}

/* 댓글 삭제 버튼 */
async function lol_delete_reply(android_id, post_seq, reply_seq)
{
	await lol_POST('http://lolwiki.kr/freeboard/delete_reply.php',
		{ boardid: 'freeboard', post_seq: post_seq, reply_seq: reply_seq ,android_id: android_id })
}

/* 글 쓰기 */
async function lol_write(android_id, subject, body, youtube_url, image='')
{
	var image_filename = '' 
	if(image.length > 0)
	{
		image_filename = lol_make_image_filename()
		var res = await lol_POST('http://lolwiki.kr/freeboard/uploads/php_upload_new.php',
			{ image: image, 
				file_name: image_filename,
				doodlr: 0 })
	}

	await lol_POST('http://lolwiki.kr/freeboard/insert_post_multi_2020.php',
		{ boardid: 'freeboard', app: 'DEMACIA', notice: '0', lolmovie: '101',
			android_id: android_id, 
			title: decodeURI(decodeURI(subject)), 
			text: decodeURI(decodeURI(body)),
			youtube_url: decodeURI(youtube_url),
			pic_new: image_filename } )
}

function lol_make_image_filename()
{
	// return 'img_-9189942_20220117111041.jpg'
	// img_1171380_20220116182050.jpg
	var random_code_7 = get_random_code(7)
	var now = new Date().toFormat('YYYYMMDDHH24MISS')
	return format('img_{0}_{1}.jpg', random_code_7, now)
}

/* 글 삭제 */
async function lol_delete(android_id, post_seq)
{
	await lol_POST('http://lolwiki.kr/freeboard/delete_post.php',
		{ boardid: 'freeboard',
		post_seq: post_seq,
		android_id: android_id })
}

async function lol_GET(url, body = {}) {
	return await request({ 
		url: url, 
		headers: headers, 
		method: 'GET', 
		qs: body, 
		encoding: null })
		.catch(err => console.log('lol_GET error', err))
		.then(e => iconv.decode(e, 'euc-kr'))
}

async function lol_POST(url, body = {}) {
	return await request.post({ 
		url: url, 
		headers: headers, 
		method: 'POST', 
		form: body, 
		encoding: null })
		.catch(err => console.log('lol_POST error', err))
		.then(e => iconv.decode(e, 'euc-kr'))
	// const writeFile = util.promisify(fs.writeFile)
	// await writeFile('asd.txt', a)
	// return a
}
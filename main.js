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
const io = socket(server, {maxHttpBufferSize: 1e8})
/* os */
const os = require('os')
/* API 요청 모듈 불러오기 */
const request = require('request-promise-native')
/* 날짜시간 유틸 */
require('date-utils')
/* 아이콘 만들기 유틸*/
const identicon = require('identicon') 
/* mysql 서버 */
const mysql = require('mysql')
var db_config = JSON.parse(fs.readFileSync('db_config.txt', 'utf-8'))

async function handleDisconnect() {
	db = mysql.createConnection(db_config);
	db.connect(function(err) {
		if(err) {
			log('ERROR', 'db connect', 'error when connecting to db:', err);
			setTimeout(handleDisconnect, 2000); 
		}
	})	
	db.on('error', function(err) {
		log('ERROR','db on error', err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST')
			return handleDisconnect()
		else
			throw err;
	})
}
handleDisconnect();

app.use('/fonts', express.static('./static/fonts'))
app.use('/static', express.static('./static'))
app.use('/icon', express.static('./static/icon'))
// app.use('/js', express.static('./static/js'))
// app.use('/fonts', express.static('./static/fonts'))


/* 공지말 */
g_port = 8080
g_notice = ''

/* 유저 목록 */
g_users = []
g_sockets = []

/* 현재 재생중인 비디오 정보 */
g_current_dj = ''
g_video_id = ''
g_video_title = ''
g_video_duration = 0
g_played_time_ms = 0 // ms
g_end_timer = null

/* DJ 순서 목록 */
g_djs = []

/* 임시: QUEUE */
g_queue = []

/* 좋아요/싫어요 데이터 */
g_good_list = []
g_bad_list = []

/* DEBUG 용 */
g_last_query = ''

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
		fs.readFile(file_name, function(err, data) {
			err ? reject(err) : resolve(data)
		})
	})
}

io.sockets.on('connection', function(socket) 
{
	/* 로그인 */
	var ipReg = /((?:\d+\.){3}\d+)/
	socket.on('login', async function(nick) {
		// 소켓에 이름 저장해두기 
		socket.name = nick
		// log('INFO', 'login', socket.name + ' 로그인 시도.')

		// 빈 이름인 경우 제외
		if(!nick)
		{
			log('THROW', 'login', '빈 닉네임 : ' + nick)
			socket.name = ''
			socket.emit('login', {isSuccess: false, icon_id: 0})
			return
		}

		// 중복 로그인 검사 
		if(g_users.indexOf(socket.name) != -1)
		{
			log('THROW', '중복 로그인 검사', socket.name + ' 중복 로그인 실패.')
			socket.name = ''
			socket.emit('login', {isSuccess: false, icon_id: 0})
			return
		}

		try
		{
			await db_beginTransaction()

			var current_date = GetDate()

			 // 기존 유저가 아니라면 등록
			var is_exist_user = await db_select('COUNT(*) as cnt', 'Accounts', format('Name = "{0}"', socket.name), 'LIMIT 1')
									.then(ret => ret[0].cnt > 0)
			if(!is_exist_user)
			{
				// 일단 새 재생목록 생성
				var new_playlist_id = await db_insert('Playlists', ['Name', 'VideoList'], [format('{0}의 재생목록', socket.name), '[]']).then(ret => ret.insertId)

				// 새 유저 등록
				await db_insert('Accounts', ['Name', 'Playlists', 'CurrentPlaylist'], [socket.name, JSON.stringify([new_playlist_id]), new_playlist_id])
			}

			// Secure 데이터 등록
			var socket_ip = socket.handshake.address.match(ipReg)[1]
			var secureData = await db_select('ConnectData', 'Secures', format('IP = "{0}"', socket_ip), 'LIMIT 1') // secure data 가져오기
			var is_exist_secure = (secureData.length > 0)
			var connectCount = 0
			var is_exist_secure_data = false
			if(!is_exist_secure) // 새로 등록
			{
				await db_insert('Secures', ['IP', 'ConnectData'], [socket_ip, JSON.stringify([{Name: socket.name, ConnectCount: 1, CreationDate: current_date, LastLoginDate: current_date}])])
				connectCount = 1
			}
			else // 기존꺼에 추가
			{
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
			var select_icon = await db_select('Id', 'Icons', format('Name = "{0}"', socket.name), 'LIMIT 1')
			if(select_icon.length == 0) // 아이콘 없으면 새로 만들기
			{
				icon_id = await db_insert('Icons', ['Name'], [socket.name]).then(ret => ret.insertId)
				console.log(format('{0}의 아이콘 아이디는 {1}', socket.name, icon_id))
				await make_identicon_async(socket.name, icon_id)
			}
			else
				icon_id = parseInt(select_icon[0].Id)

			// 로그인 성공
			await db_commit()

			var text1 = (is_exist_user ? '기존' : '신규')
			var text4 = (is_exist_user && !is_exist_secure_data ? '아이디 도용 가능성 감지' : '')
			log('INFO', 'login', format('{0} {1}유저 {2}번째 로그인 : ({3}) {4}', socket.name, text1, connectCount, socket_ip, text4))

			g_sockets.push(socket)
			socket.emit('login', {isSuccess: true, icon_id: icon_id})
			update_current_video(socket) // 플레이 영상 데이터 보내기
			update_current_queue(socket) // 플레이 대기열 알림
			update_current_rating(socket) // 좋/싫 알림
			update_playlist(socket) // 플레이리스트 정보 전송

			if(g_notice)
				socket.emit('chat_update', {type: 'connect', name: 'SERVER', message: g_notice})
		}
		catch (exception)
		{
			await db_rollback()
			log_exception('login', exception, socket.name + ' 로그인 실패. 에러 : ' + JSON.stringify(exception))
			socket.name = ''
			socket.emit('login', {isSuccess: false, icon_id: 0})
		}
	})

	function make_identicon_async(nick, icon_id)
	{
		return new Promise( function(resolve, reject) {
			identicon.generate({ id: nick + '7', size: 18 }, (err, buffer) => {
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
		log('INFO', 'chat_newUser', socket.name + ' 님이 접속하였습니다.')
		
		// 접속자 목록 업뎃
		g_users.push(socket.name)
		log('INFO', '현 접속자', g_users)

		// 모든 소켓에게 전송 
		io.sockets.emit('chat_update', {type: 'connect', name: 'SERVER', message: socket.name + '님이 접속하였습니다.'})
		socket.emit('users', {data: '참가자 목록 (' + g_users.length + ')' + '\n' + g_users.join(', ')})
	})

	/* 전송한 메시지 받기 */
	socket.on('chat_message', function(data) 
	{
		if(!socket.name)
			return
			
		/* 받은 데이터에 누가 보냈는지 이름을 추가 */
		data.name = socket.name
		data.time = GetTime()

		log_message = data.message
		if(log_message.length > 100)
			log_message = format('{0} ... ({1} bytes)', log_message.substr(0, 100), log_message.length)
		log('CHAT', data.name, log_message, true)

		/* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
		io.sockets.emit('chat_update', data);
	})

	/* 접속 종료 */
	socket.on('disconnect', function() {
		if(!socket.name)
			return

		log('INFO', 'disconnect', socket.name + '님이 나가셨습니다.')
		if(g_users.indexOf(socket.name) != -1)
			g_users.splice(g_users.indexOf(socket.name), 1)
		if(g_sockets.indexOf(g_sockets.filter(x => x.name == socket.name)[0]) != -1)
			g_sockets.splice(g_sockets.indexOf(g_sockets.filter(x => x.name == socket.name)[0]), 1)
		if(g_djs.indexOf(socket.name) != -1)
			g_djs.splice(g_djs.indexOf(socket.name), 1)

		log('INFO', '현 접속자', g_users)

		// 현재 재생중인 dj라면 재생 종료
		if(g_current_dj == socket.name)
			end_of_video()

		// 나가는 사람을 제외한 나머지 유저에게 메시지 전송
		socket.broadcast.emit('chat_update', {type: 'disconnect', message: socket.name + '님이 나가셨습니다.'});
	})

	/* TEST: QUEUE에 비디오 추가 */
	socket.on('queue', async function(data) {
		if(!socket.name)
			return
		/* data
		dj : '천아연'
		video_id : 'NvvYPLGN8Ag'
		*/

		try
		{
			var youtube_data = await request_youtube_data(data.video_id).then(parse_youtube_response_data)
			
			if(!g_video_id)
			{
				log('INFO', 'play', youtube_data.title)
				g_current_dj = data.dj
				g_video_id = data.video_id
				g_video_title = youtube_data.title
				g_video_duration = youtube_data.duration
				g_played_time_ms = Date.now()
	
				// 영상 종료 타이머 설정
				if(g_video_duration != 0)
					set_timeout_end_of_video()
	
				// 모두에게 영상 갱신
				update_current_video(io.sockets)
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

	})

	/* 현재 플레이 대기열 목록 알려주기 */
	socket.on('queue_list', function() {
		update_current_queue(socket, true)
	})

	/* TEST: 특정 비디오 재생 명령 */
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
			body = await request_youtube_data(data.video_id)
			var item = body.items[0]
			if(item == null)
				throw Error()
			var response_data = parse_youtube_response_data(body)
			
			log('INFO', 'play', response_data.title)
			g_current_dj = data.dj
			g_video_id = data.video_id
			g_video_title = response_data.title
			g_video_duration = response_data.duration
			g_played_time_ms = Date.now()

			// 영상 종료 타이머 설정
			if(g_video_duration != 0)
				set_timeout_end_of_video()

			// 모두에게 영상 갱신
			update_current_video(io.sockets)
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
		io.sockets.emit('chat_update', { type: 'message', message: data.message, name: socket.name, time: GetTime()});
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
		io.sockets.emit('chat_update', { type: 'message', message: data.message, name: socket.name, time: GetTime()});
		io.sockets.emit('chat_update', { type: 'system_message', message: '영상을 ' + data.sec + '초 넘겼습니다.', name: socket.name, time: GetTime()});

		// 영상 종료 타이머 설정
		set_timeout_end_of_video()

		// 모두에게 영상 갱신
		update_current_video(io.sockets)
	})

	/* 현재 영상 스킵 */
	socket.on('skip', function() {
		if(!socket.name)
			return

		log('INFO', 'socket.skip', 'skipped on demand.')
		end_of_video()
	})

	/* 참가자 목록 요청 */
	socket.on('users', function() {
		socket.emit('users', {data: '참가자 목록 (' + g_users.length + ')' + '\n' + g_users.join(', ')})  
	})

	/* DJ 목록 요청 */
	socket.on('djs', function() {
		socket.emit('djs', {data: '디제잉 목록 (' + g_djs.length + ')' + '\n' + g_djs.join('\n')})  
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
			await db_update('Accounts', format('Playlists = JSON_ARRAY_APPEND(Playlists, "$", {0})', new_playlist_id), format('Name = "{0}"', socket.name))

			await db_commit()

			// 업데이트
			update_playlist(socket)

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
			await db_update('Accounts', format('CurrentPlaylist = {0}', playlist_id), format('Name = "{0}"', socket.name))

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

			var my_playlists = await db_select('Playlists', 'Accounts', format('Name="{0}"', socket.name), 'LIMIT 1').then(ret => ret[0].Playlists).then(JSON.parse)
			my_playlists.splice(my_playlists.indexOf(playlist_id), 1)

			await db_update('Accounts', format('Playlists = "{0}"', JSON.stringify(my_playlists)), format('Name = "{0}"', socket.name))
			await db_update('Playlists', format('Deleted = "1"'), format('Id = "{0}"', playlist_id))

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

			var dest_index = data.isDown ? data.video_index + 1 : data.video_index - 1
			if(dest_index == -1)
				dest_index = video_list.length - 1
			if(dest_index == video_list.length)
				dest_index = 0

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
	socket.on('push_video', async function(data) {
		if(!socket.name)
			return

		// 1. Videos DB에 이미 있는 곡인지 확인
		//  있다면 -> Id 가져오기
		//  없다면 -> 
		//    1-1. youtube data request
		//    1-2. Videos DB에 등록
		//    1-3. insertId 가져오기
		// 2. Playlists DB에서 Id = data.playlist_id인 레코드의 list에 (1번의 Id)를 JSON_ARRAY_APPEND
		// 3. socket.emit('push_video_result', {isSuccess: true}) 실행

		// Catch. socket.emit('push_video_result', {isSuccess: false, message: 에러_메시지}) 실행

		try
		{
			var video_id = data.video_id
			var playlist_id = data.playlist_id

			// 1. Videos DB에 이미 있는 곡인지 확인
			var db_video_id = 0
			var video_title = ''
			var db_select_ret1 = await db_select('Id, Name', 'Videos', format('VideoId = "{0}"', video_id), 'LIMIT 1')
			if(db_select_ret1.length > 0)
			{
				db_video_id = db_select_ret1[0].Id
				video_title = db_select_ret1[0].Name
			}
			else
			{
				// 1-1. youtube data request
				var video_data = await request_youtube_data(video_id)
									.then(parse_youtube_response_data)

				log('INFO', 'push_video - yt data', video_data)

				// 외부 재생 제한 영상의 경우
				if(!video_data.embeddable)
					throw {message: '외부 재생 제한 영상', err: '외부 재생이 제한된 영상입니다.'}

				// 1-2. Videos DB에 등록
				// 1-3. insertId 가져오기
				db_video_id = await db_insert('Videos', ['Name', 'VideoId', 'Length', 'Thumbnail'], [video_data.title, video_id, video_data.duration, video_data.thumbnail_url])
								.then((ret) => ret.insertId)
				video_title = video_data.title
			}

			// 2. Playlists DB에서 Id = data.playlist_id인 레코드의 list에 (1번의 Id)를 JSON_ARRAY_APPEND
			await db_update('Playlists', format('VideoList = JSON_ARRAY_APPEND(VideoList, "$", {0})', db_video_id), format('Id = {0}', playlist_id))
			// await db_query('UPDATE Playlists SET VideoList = JSON_ARRAY_APPEND(VideoList, "$", ' + db_video_id + ') WHERE Id = ' + playlist_id)

			// 3. socket.emit('push_video_result', {isSuccess: true}) 실행
			log('INFO', 'push_video_result', format('SUCCESS! VideoID. {0} -> Playlist. {1} ({2})', db_video_id, playlist_id, video_title) )
			socket.emit('push_video_result', {isSuccess: true, message: video_title})
			update_playlist(socket)
		}
		catch (exception)
		{
			log_exception('push_video', exception)
			socket.emit('push_video_result', {isSuccess: false, message: '영상을 추가하는 중에 오류가 발생했습니다.\n' + exception.err})
		}
	})

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

		if(g_current_dj == socket.name)
			end_of_video()
	})

	/* 맥심 */
	var imgReg = /window\.open\('\.(\/file\/\S+?)\'/
	socket.on('maxim', function(no) {
		io.sockets.emit('chat_update', { type: 'system_message', message: '맥심 막힘. ㅠㅠ' })
		// if(!no)
		// 	no = Math.floor(Math.random() * 236) + 1
		// request(format('https://www.maximkorea.net/magdb/magdb_view.php?lib=M&number={0}', no))
		// 	.then( ret => {
		// 		ret = 'https://www.maximkorea.net/magdb' + imgReg.exec(ret)[1]
		// 		io.sockets.emit('chat_update', { type: 'system_message', message: format('/img {0} 맥심 {1}호', ret, no) })
		// 	})
		// 	.catch( err => {
		// 		console.log(err.stack)
		// 		log('EXCEPTION', 'maxim', format('https://www.maximkorea.net/magdb/magdb_view.php?lib=M&number={0}', no))
		// 		io.sockets.emit('chat_update', { type: 'system_message', message: format('맥심 {0}호 불러오기 실패', no) })
		// 	})
	})

	var zzalReg = /<picture>.*?srcset="(https?\:\/\/(?:cdn|danbooru)\.donmai\.us\/(?:data\/)?(?:sample|original).*?)"/i
	var zzalUrlReg = /<link rel="canonical" href="(.*?)">/
	socket.on('zzal', async function(tag) {
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
			io.sockets.emit('chat_update', { type: 'system_message', message: format('{0} 짤 불러오기 실패', tag) })
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
			var response_data = await request_youtube_data(video_id).then(parse_youtube_response_data)
			log('INFO', 'request_video_info', response_data)
		}
		catch (exception)
		{
			log_exception('request_video_info', exception)
		}
	})

	/* 히든 키워드 : 김치 */
	socket.on('kimchi', function() {
		io.sockets.emit('chat_update', {name: 'MC무현', type:'connect', message: 'MC무현님이 접속하였습니다.', time: GetTime()});
		io.sockets.emit('chat_update', {name: 'MC무현', type:'message', message: '판깨잔 판깨잔', time: GetTime()});
		io.sockets.emit('chat_update', {name: 'MC무현', type:'disconnect', message: 'MC무현님이 나가셨습니다.', time: GetTime()});
	})

}) 

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


function log(type, function_name, message, isChat = false)
{
	if(isChat)
		return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m {1} :', GetTime(), function_name), message, '\x1b[0m')

	var color = '\x1b[37m'
	if(type == 'INFO')
		color = '\x1b[32m'
	else if(type == 'ERROR' || type == 'ERROR_CATCH')
		color = '\x1b[31m'

	return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m [{2}]{1}', GetTime(), color, function_name), message, '\x1b[0m')
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

		if(g_users.indexOf(g_current_dj) == -1) // 없는 유저라면
		{
			g_current_dj = ''
			return end_of_video()
		}
		g_video_id = next_queue_data.video_id
		g_video_duration = next_queue_data.data.duration
		g_video_title = next_queue_data.data.title
		g_played_time_ms = Date.now()

		// 영상 종료 타이머 설정
		if(g_video_duration != 0)
			set_timeout_end_of_video()

		log('INFO', 'queue_play', next_queue_data)

		// 모두에게 영상 갱신
		update_current_video(io.sockets)

		// 모두에게 플레이 대기열 알림
		update_current_queue(io.sockets)
	}
	else if(g_djs.length > 0)
	{
		try 
		{
			var this_dj = g_djs.splice(0, 1)[0] // 맨 앞 디제이 뽑음
			g_djs.push(this_dj) // 맨 뒤에 다시 추가

			var playlist_id = await db_select('CurrentPlaylist', 'Accounts', format('Name = "{0}"', this_dj), 'LIMIT 1').then(ret => ret[0].CurrentPlaylist)
			var video_list = await db_select('VideoList', 'Playlists', format('Id = {0}', playlist_id), 'LIMIT 1').then(ret => ret[0].VideoList).then(JSON.parse)
			var first_video_id = video_list.splice(0, 1)[0]
			video_list.push(first_video_id)
			var video_info = await db_select('Id, Name, VideoId, Length', 'Videos', format('Id = {0}', first_video_id), 'LIMIT 1').then(ret => ret[0])
			
			// 재생목록의 영상 순서 순환
			await db_update('Playlists', format('VideoList = "{0}"', JSON.stringify(video_list)), format('Id = {0}', playlist_id))

			g_current_dj = this_dj
			g_video_id = video_info.VideoId
			g_video_duration = video_info.Length
			g_video_title = video_info.Name
			g_played_time_ms = Date.now()

			// 영상 종료 타이머 설정
			if(g_video_duration != 0)
				set_timeout_end_of_video()

			log('INFO', 'dj_play', format('{0} -> {1} ({2})', g_current_dj, g_video_title, g_video_duration))

			// 모두에게 영상 갱신
			update_current_video(io.sockets)

			// 모두에게 플레이 대기열 알림
			update_current_queue(io.sockets)

			// 이번 DJ에게 재생목록 데이터 변경을 알림
			log('INFO', 'end_of_video - g_sockets', g_sockets.map(x => x.name))
			update_playlist(g_sockets.filter(x => x.name == this_dj)[0])
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
		g_video_duration = 0
		g_video_title = ''
		io.sockets.emit('update_current_video', null)
	}

	// 모든 소켓들에게 dj 상태 갱신
	for(var e of g_sockets)
		e.emit('dj_state', g_djs.indexOf(e.name) != -1)

	// 모두에게 좋/싫 알림
	update_current_rating(io.sockets)
}

/* 현재 영상 전송 */
function update_current_video(dest_socket)
{
	dest_socket.emit('update_current_video', {
		dj: g_current_dj,
		video_id: g_video_id,
		title: g_video_title,
		duration: g_video_duration,
		seek_s: g_video_duration > 0 ? ((Date.now() - g_played_time_ms - 1000) / 1000) : 999999999
	})
}

/* 플레이 대기열 알림 발사 */
function update_current_queue(dest_socket, is_on_demand = false)
{
	if(g_queue.length == 0)
	{
		if(is_on_demand)
			dest_socket.emit('chat_update', {type: 'system_message', time: GetTime(), message: '플레이 대기열 없음' })
		return
	}

	var str = '플레이 대기열\n'
	for(var e of g_queue)
	{
		str += format('{0}. {1} - {2} ({3})\n', g_queue.indexOf(e) + 1, e.dj, e.data.title, second_to_string(e.data.duration))
	}

	dest_socket.emit('chat_update', {type: 'system_message', time: GetTime(), message: str })
}

/* 좋아요/싫어요 알림 */
function update_current_rating(dest_socket)
{
	dest_socket.emit('rating', {good: g_good_list, bad: g_bad_list})
}

/* 해당 유저에게 플레이리스트 갱신 */
async function update_playlist(socket)
{
	// 플레이리스트들의 제목과 곡정보들 리스트 보내주면 될 듯 [playlist_id1: {name:"내 재생목록", list:[{title:"언더테일 브금", duration:90}, {title:"천아연유튜브소개영상", duration:10}]}]
	try
	{
		// 해당 계정의 재생목록ID 전체를 가져옴
		var acccount_data = await db_select('Playlists, CurrentPlaylist', 'Accounts', format('Name = "{0}"', socket.name), 'LIMIT 1').then( (ret) => ret[0] )
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
			var video_info_list = await db_select('Id, Name, VideoId, Length, Thumbnail', 'Videos', format('Id IN ({0})', video_index_list.join(', '))).then(JSON.stringify).then(JSON.parse)

			// Video 정보를 Dic형태로 재구성
			for(var e of video_info_list)
				video_info_dic[e.Id] = { Name: e.Name, VideoId: e.VideoId, Length: e.Length, Thumbnail: e.Thumbnail }
		}

		socket.emit('update_playlist', [video_info_dic, playlist_info_list, current_playlist])
	}
	catch (exception)
	{
		log_exception('playlist', exception)
	}
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

function second_to_string(sec) 
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

/* ================================== QUERY =========================================*/

/* 유튜브 영상 정보 조회 쿼리(Promise) */
function request_youtube_data(video_id)
{
	return new Promise(function(resolve, reject) {
		var url = 'https://www.googleapis.com/youtube/v3/videos'
		var key = 'AIzaSyARG5pgayIj8ghL0hwzrNL_3pl-QeRQYMc'
		var part = 'id,snippet,contentDetails,status'
		var regionCode = 'KR'
		var requestUrl = format('{0}?key={1}&part={2}&regionCode={3}&id={4}', url, key, part, regionCode, video_id)
		g_last_query = requestUrl
		request(requestUrl, function(err, response, body) {
			if(err)
				reject({message: 'request_youtube_data(' + video_id + ')', err: err})
			else
				resolve(JSON.parse(body))
		})
	})
}
function parse_youtube_response_data(query_result)
{
	var item = query_result.items[0]
	var video_data = {
		title : item.snippet.title,
		thumbnail_url : item.snippet.thumbnails.medium.url,
		duration : parse_duration_to_second(item.contentDetails.duration),
		embeddable : item.status.embeddable,
	}
	video_data.title = video_data.title.replace(/\"/g, '＂')

	return video_data
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
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
/* CORS 설정 */
var cors = require('cors')
app.use(cors())
/* express http 서버 생성 */
const server = http.createServer(app)
/* 생성된 서버를 socket.io에 바인딩 */
const io = socket(server)
/* os */
const os = require('os')
/* API 요청 모듈 불러오기 */
const request = require('request-promise-native')
/* 날짜시간 유틸 */
require('date-utils')
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
// app.use('/js', express.static('./static/js'))
// app.use('/fonts', express.static('./static/fonts'))

/* 유저 목록 */
g_users = []

/* 현재 재생중인 비디오 정보 */
g_current_dj = ''
g_video_id = ''
g_video_title = ''
g_video_duration = 0
g_played_time_ms = 0 // ms
g_end_timer = null


/* DJ 순서 목록 */
g_djs = []

// app.get('/static/fonts/*', function(request, response, next) {
// 	response.header( "Access-Control-Allow-Origin", "*")
// })

/* Get 방식으로 / 경로에 접속하면 실행 됨 */
app.get('/', function(request, response, next) {
	fs.readFile('./dj.html', function(err, data) {
		if(err) {
			response.send('서버가 고장남!!! Kakao ID: AnsanSuperstar 로 문의하세요')
		} else {
			if(!request.headers.host)
				return
			response.writeHead(200, {'Content-Type':'text/html'})
			var text = data.toString().replace(/\$_localhost/g, 'http://' + request.headers.host.substr(0, request.headers.host.length-5))
			response.write(text)
			response.end()
		}
	})
})

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
		if(g_users.indexOf(socket.name) != -1)
		{
			log('THROW', '중복 로그인 검사', socket.name + ' 중복 로그인 실패.')
			socket.name = ''
			socket.emit('login', false)
			return
		}

		try
		{
			await db_beginTransaction()

			var is_exist_user = await db_select('COUNT(*) as cnt', 'Accounts', format('Name = "{0}"', socket.name), 'LIMIT 1')
									.then(ret => ret[0].cnt > 0)

			if(!is_exist_user) // 기존 유저가 아니라면 등록
			{
				// 일단 새 재생목록 생성
				var new_playlist_id = await db_insert('Playlists', ['Name', 'VideoList'], ['새 재생목록', '[]']).then(ret => ret.insertId)

				// 새 유저 등록
				await db_insert('Accounts', ['Name', 'Playlists', 'CurrentPlaylist'], [socket.name, JSON.stringify([new_playlist_id]), new_playlist_id])
				log('INFO', 'login', socket.name + ' 신규유저 로그인 성공.')
			}
			else
			{
				log('INFO', 'login', socket.name + ' 기존유저 로그인 성공.')
			}

			// 로그인 성공
			await db_commit()
			socket.emit('login', true)
			update_current_video(socket)
		}
		catch (exception)
		{
			console.log(exception.stack)
			await db_rollback()
			log('ERROR_CATCH', 'login', socket.name + ' 로그인 실패. 에러 : ' + JSON.stringify(exception))
			socket.name = ''
			socket.emit('login', false)
		}
	})

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

		log('CHAT', data.name, data.message, true)

		/* 보낸 사람을 제외한 나머지 유저에게 메시지 전송 */
		io.sockets.emit('chat_update', data);
	})

	/* 접속 종료 */
	socket.on('disconnect', function() {
		if(!socket.name)
			return

		log('INFO', 'disconnect', socket.name + '님이 나가셨습니다.')
		g_users.splice(g_users.indexOf(socket.name), 1)

		log('INFO', '현 접속자', g_users)

		// 현재 재생중인 dj라면 재생 종료
		if(g_current_dj == socket.name)
			end_of_video()

		// 나가는 사람을 제외한 나머지 유저에게 메시지 전송
		socket.broadcast.emit('chat_update', {type: 'disconnect', message: socket.name + '님이 나가셨습니다.'});
	})

	/* TEST: 특정 비디오 재생 명령 */
	socket.on('play', async function(data) {
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
			console.log(exception.stack)
			log('ERROR', 'play', body)
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
	socket.on('playlist', async function() {
		// TODO: 그냥 업데이트_플레이리스트 로 바꿔도 될듯. 이 함수는 임시 함수가 될 가능성이 높다.

		try
		{
			// 해당 계정의 재생목록ID 전체를 가져옴
			var playlist_id_list = await select_playlists(socket.name).then( (ret) => JSON.parse(ret[0].Playlists) )
			console.log(playlist_id_list)

			// 해당 재생목록들의 내용을 가져옴 [ { Name:내 재생목록, VideoList:[2134,2345,12,1] } , ... ]
			var playlist_info_list = await db_select('Id, Name, VideoList', 'Playlists', format('Id IN ({0})', playlist_id_list.join(', '))).then(JSON.stringify).then(JSON.parse)
			console.log(playlist_info_list)

			socket.emit('data', playlist_info_list)

			// VideoList의 원소들을 모은다 (Videos DB에 한번에 요청하기 위해)
			video_index_list = []
			for(var e of playlist_info_list)
			{
				e.VideoList = JSON.parse(e.VideoList)
				video_index_list.push(...e.VideoList)
			}
			video_index_list = [...new Set(video_index_list)] // 중복 제거

			// Videos DB에 비디오 정보를 한번에 조회
			var video_info_list = await db_select('Id, Name, VideoId, Length, Thumbnail', 'Videos', format('Id IN ({0})', video_index_list.join(', '))).then(JSON.stringify).then(JSON.parse)
			console.log(video_info_list)

			// Video 정보를 Dic형태로 재구성
			var video_info_dic = {}
			for(var e of video_info_list)
				video_info_dic[e.Id] = { Name: e.Name, VideoId: e.VideoId, Length: e.Length, Thumbnail: e.Thumbnail }

			socket.emit('update_playlist', [video_info_dic, playlist_info_list])
		}
		catch (exception)
		{
			log('THROW_CATCH', 'playlist', exception.name + ' --> ' + exception.message)
			log('ERROR_CATCH', 'playlist', exception.stack)
		}
	})

	/* 해당 유저에게 플레이리스트 갱신 */
	function update_playlist(socket)
	{
		// TODO: 플레이리스트들의 제목과 곡정보들 리스트 보내주면 될 듯 [playlist_id1: {name:"내 재생목록", list:[{title:"언더테일 브금", duration:90}, {title:"천아연유튜브소개영상", duration:10}]}]
		socket.emit('update_playlist', null)
	}

	/* 새 재생목록 추가하기 */
	socket.on('new_playlist', async function() {
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
		}
		catch (exception)
		{
			log('ERROR_CATCH', 'new_playlist', exception.stack)
			await db_rollback()
		}		
	})

	/* 재생목록 선택 */
	socket.on('select_playlist', function(playlist_id) {
		// playlist_id는 반드시 존재하는 플레이리스트여야함 (없을 시 크리티컬)
		console.log()
		db.query(format('UPDATE `Accounts` SET `CurrentPlaylist` = {0} WHERE (`Name` = "{1}")', playlist_id, socket.name), function(err, result) {
			if(err)
			{
				log('ERROR', 'select_playlist', err)
				return
			}

			update_playlist(socket)
		})
	})

	/*  특정 재생목록에 video 추가  */
	// 유효한 영상이어야한다. (삭제된 영상이 아니어야한다. Embedding 비허용 영상은 상관 없음.) 
	socket.on('push_video', async function(data) {
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
		}
		catch (exception)
		{
			log('ERROR_CATCH', 'push_video', exception.message + ' --> ' + exception.err)
			log('THROW_CATCH', 'push_video', exception.stack)
			socket.emit('push_video_result', {isSuccess: false, message: '영상을 추가하는 중에 오류가 발생했습니다.\n' + exception.err})
		}
	})

	/* 맥심 */
	var imgReg = /window\.open\('\.(\/file\/\S+?)\'/
	socket.on('maxim', function() {
		var random_int = Math.floor(Math.random() * 214) + 1
		request(format('https://www.maximkorea.net/magdb/magdb_view.php?lib=M&number={0}', random_int))
			.then( ret => {
				ret = 'https://www.maximkorea.net/magdb' + imgReg.exec(ret)[1]
				io.sockets.emit('chat_update', { type: 'system_message', message: format('/img {0} 맥심 {1}호', ret, random_int) })
			})
			.catch( err => {
				console.log(err.stack)
				log('EXCEPTION', 'maxim', format('https://www.maximkorea.net/magdb/magdb_view.php?lib=M&number={0}', random_int))
				io.sockets.emit('chat_update', { type: 'system_message', message: format('맥심 {0}호 불러오기 실패', random_int) })
			})
	})

	/* TEST: 인스턴트 쿼리 */
	socket.on('query', function(query) {
		db.query(query, (error, result) => { 
				error ? console.log(error) : console.log(result)
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
			log('CATCH', 'request_video_info', error)
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
server.listen(8080, function() {
	console.log('======================== 서버 실행 중.. ============================')
})

function GetTime() 
{
	return new Date(Date.now() + 1000 * 60 * 60 * 9).toFormat('HH24:MI')
}

function log(type, function_name, message, isChat = false)
{
	if(isChat)
		return console.log(format('({0}) [{1}] {2} :', GetTime(), type, function_name), message)
	return console.log(format('({0}) [{1}] \'{2}\' :', GetTime(), type, function_name), message)
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

function end_of_video() {
	// TODO: 끝낼게 아니라 다음 영상을 재생
	g_current_dj = ''
	g_video_id = ''
	g_video_duration = 0
	g_video_title = ''
	if(g_end_timer != null)
		clearTimeout(g_end_timer)
	g_end_timer = null

	log('INFO', 'end_of_video', 'end of video')
	io.sockets.emit('update_current_video', null)
}

/* 현재 영상 전송 */
function update_current_video(dest_socket)
{
	dest_socket.emit('update_current_video', {
		dj: g_current_dj,
		video_id: g_video_id,
		title: g_video_title,
		duration: g_video_duration,
		seek_s: g_video_duration > 0 ? ((Date.now() - g_played_time_ms) / 1000) : 0
	})
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

/* ================================== QUERY =========================================*/

/* 특정 유저의 Playlists 데이터 쿼리 */
function select_playlists(nick)
{
	return db_select('Playlists', 'Accounts', format('Name = "{0}"', nick), 'LIMIT 1')
}

/* 유튜브 영상 정보 조회 쿼리(Promise) */
function request_youtube_data(video_id)
{
	return new Promise(function(resolve, reject) {
		var url = 'https://www.googleapis.com/youtube/v3/videos'
		var key = 'AIzaSyARG5pgayIj8ghL0hwzrNL_3pl-QeRQYMc'
		var part = 'id,snippet,contentDetails,status'
		var regionCode = 'KR'
		var requestUrl = format('{0}?key={1}&part={2}&regionCode={3}&id={4}', url, key, part, regionCode, video_id)
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
	return video_data
}

function db_select(columns, from, where, options = '')
{
	var query = format('SELECT {0} FROM {1} WHERE {2} {3}', columns, from, where, options)
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
		values = values.join('", "')
	values = '"' + values + '"'

	var query = format('INSERT INTO {0} ({1}) VALUES ({2})', into, columns, values)
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
	return new Promise( function(resolve, reject) {
		db.query(query, function(err, result) {
			err ? reject({message: query, err: err}) : resolve(result)
		})
	})
}

function db_query(query)
{
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
var socket = io()

var g_nick = ''

var g_isLogin = false
var g_cued_time_ms = 0
var g_current_video_id = ''
var g_current_dj = ''
var g_current_title = ''
var g_current_duration = 0

var g_player_ready = false
var g_show_playlist_control_panel = false

var g_data = null

var g_video_info_dic = null
var g_playlist_info_list = null

/* 접속 되었을 때 실행 */
socket.on('connect', function () {
	if(g_isLogin)
	{
		add_message({type: 'system_message', message: '연결 끊김. 새로고침(Ctrl+F5)하고 다시 로그인 해주세요.'})
		return
	}

	g_isLogin = false

	// g_nick = '넌못자' + (Math.random() * 1000).toFixed(0) + '호'
	g_nick = prompt('닉네임을 입력해주세요', '')
	g_nick = g_nick.replace(/(\'|\")/g, '')

	// 이름이 빈칸인 경우
	if (!g_nick) {
		add_message({type: 'system_message', message: '새로고침(Ctrl+F5)하고 다시 로그인 해주세요.'})
		return
	}

	add_system_message('인증 중 ...')
	if(g_player_ready)
	{
		console.log('connect에서 login')
		socket.emit('login', g_nick)
	}
})

/* 서버로부터 로그인 인증을 받은 경우 */
socket.on('login', function(isSuccess) {
	console.log('login 리시브', g_isLogin, '->', isSuccess)
	if(g_isLogin)
		return
	g_isLogin = isSuccess
	if(!isSuccess)
	{
		add_system_message('인증 실패! 이미 로그인 되어있습니다.\n새로고침(Ctrl+F5) 해주세요.')
		return
	}

	g_isLogin = true
	add_system_message('인증 완료')
	add_system_message('후원 랭킹\n'
						+ '★ 0. Lily(샤르프로젝트) 님 ★\n' 
						+ '1. 랠래 님\n'
						+ '2. 노통 님\n'
						+ '3. 고냥이지 님')
	add_system_message('명령어 목록은 /? 을 입력해 볼 수 있습니다.')

	socket.emit('chat_newUser')
	add_message({type:'disconnect', message:'서버 수정 중이라서 서버 재부팅 가끔 일어날 수 있음.'})

	chat_input.focus()
})

/* 서버로부터 채팅 데이터 받은 경우 */
socket.on('chat_update', function (data) {
	if(!g_isLogin)
		return

	add_message(data)
})

/* 서버로부터 Playlists 요청의 답신을 받은 경우 */
socket.on('playlist', function (data) {
	// TODO
})

/* 서버로부터 참가자 목록 요청의 답신을 받은 경우 */
socket.on('users', function(data) {
	add_system_message(data.data)
})

/* 서버로부터 DJ 목록 요청의 답신을 받은 경우 */
socket.on('djs', function(data) {
	add_system_message(data.data)
})

/* 서버로부터 영상 데이터를 받은 경우 */
socket.on('update_current_video', function(data) {
	if(data)
		add_system_message('DJ : ' + data.dj + '\nVideo Id : ' + data.video_id + '\n타이틀 : ' +  data.title + '\n영상 길이 : ' + data.duration + '초' + '\n진행시간 : ' + data.seek_s + '초')
	else
		add_system_message('영상 끝.')

	if(!data || !data.video_id)
	{
		g_current_dj = ''
		g_current_title = ''
		g_current_duration = 0
		g_current_video_id = ''
		update_current_dj()
		player.cueVideoById('')
		update_current_video_name()
		return
	}

	g_current_title = data.title
	g_current_duration = data.duration
	g_current_video_id = data.video_id
	g_current_dj = data.dj
	update_current_dj()
	update_current_video_name()
	console.log(Date.now() - data.seek * 1000)
	g_cued_time_ms = Date.now() - data.seek_s * 1000
	var seek_time_s = (Date.now() - g_cued_time_ms) / 1000
	player.cueVideoById(data.video_id, seek_time_s, 'low')
})

socket.on('update_playlist', function(data) {
	g_video_info_dic = data[0]
	g_playlist_info_list = data[1]

	console.log('update_playlist', g_video_info_dic, g_playlist_info_list)
})

socket.on('data', function(data) {
	console.log('data received.', data)
	g_data = data
})

/* push_video의 결과 신호를 받았을 때 */
socket.on('push_video_result', function(data) {
	alert((data.isSuccess ? '성공!' : '실패..') + '\n' + data.message)
})

// =====================================================================
// =====================================================================

/* 채팅창에 메시지 추가 함수 */
var imgReg = /\/img (\S+)/
function add_message(data) 
{
	var message = document.createElement('div')
	var small = document.createElement('small')
	var b = document.createElement('b')
	var font = document.createElement('font')

	small.appendChild(b)
	b.appendChild(font)

	var text = ''
	var nick = ''
	var className = ''

	// 타입에 따라 적용할 클래스를 다르게 지정
	switch (data.type) 
	{
		case 'message':
			message.classList.add('chat_balloon')
			if(data.name == g_nick)
			{
				className = 'me'
				font.color = 'crimson'
			}
			else
			{
				className = 'other'
				font.color = 'mediumslateblue'
			}
			// 시간 넣기
			var timeSmall = document.createElement('small')
			var timeFont = document.createElement('font')
			timeFont.classList.add('chat_time')
			timeFont.color = 'gray'
			timeFont.appendChild(document.createTextNode('  ' + data.time))
			timeSmall.appendChild(timeFont)
			small.appendChild(timeSmall)

			nick = data.name + '  '
			text = '\n' + data.message
		break

		case 'connect':
		case 'disconnect':
		case 'system_message':
			className = data.type
			text = data.message
			if(typeof text === 'object')
				text = JSON.stringify(text)
		break
	}

	var img = null
	if(imgReg.test(text))
	{
		var img_url = imgReg.exec(text)[1]
		var img = document.createElement('img')
		img.classList.add('chat_img')
		img.src = img_url
		img.onerror = function() { img.style.height = '0px'; }
		img.onload = function() { chat.scrollTop = chat.scrollHeight; }
		g_data = text
		text = text.replace(imgReg, '')
	}

	message.classList.add(className)
	message.classList.add('chat')
	font.appendChild(document.createTextNode(nick))
	message.appendChild(small)
	message.appendChild(document.createTextNode(text))
	if(img != null)
		message.appendChild(img)
	chat.appendChild(message)

	chat.scrollTop = chat.scrollHeight
}
/* 채팅창에 시스템 메시지 추가 함수 */
function add_system_message(message)
{
	add_message({type: 'system_message', message: message})
}


/* 메시지 전송 함수 */
var playReg = /^\/(play|ㅔㅣ묘) (\S+)/
var rewindReg = /^\/(rewind|되감기) (\d+)/
var forwardReg = /^\/(fwd|빨리감기) (\d+)/
var requestReg = /^\/request (\S+)/
var selectPlaylistReg = /^\/select_playlist (\d+)/
var pushReg = /^\/push (\S+) (\d+)/
var queryReg = /^\/query (.+)/
function send() {
	if(!g_isLogin)
		return

	// 입력되어있는 데이터 가져오기
	var message = chat_input.value

	// 가져왔으니 데이터 빈칸으로 변경
	chat_input.value = ''

	// 빈 메시지 무시
	if (!message)
		return

	if(message == '/?' || message == '/help')
	{
		add_system_message('명령어 목록\n' 
							+ '/play (유튜브주소) : 해당 영상 재생\n'
							+ '/list : 참가자 목록 보기\n'
							+ '/dj : 디제이 대기열 보기\n'
							+ '/playing : 재생 싱크 맞추기\n'
							+ '/skip : 현재 영상 스킵\n'
							+ '/rewind 10 : 10초 되감기 (/되감기 10 도 가능)\n'
							+ '/fwd 10 : 10초 빨리감기 (/빨리감기 10 도 가능)\n'
							+ '/맥심')
		return
	}

	// play url 테스트
	if(playReg.test(message))
	{
		var url = playReg.exec(message)[2]
		var video_id = youtube_url_parse(url)

		socket.emit('play', {dj: g_nick, video_id: video_id})
		return
	}

	if(rewindReg.test(message))
	{
		var sec = rewindReg.exec(message)[2]
		socket.emit('rewind', {nick: g_nick, sec: sec, message: message})
		return
	}

	if(forwardReg.test(message))
	{
		var sec = forwardReg.exec(message)[2]
		socket.emit('forward', {nick: g_nick, sec: sec, message: message})
		return
	}

	if(message == '/playing' || message == '/ㅔㅣ묘ㅑㅜㅎ')
	{
		socket.emit('playing')
		return
	}

	if(message == '/playlist')
	{
		socket.emit('playlist')
	}

	if(message == '/newplaylist')
	{
		socket.emit('new_playlist')
		return
	}

	if(selectPlaylistReg.test(message))
	{
		var id = selectPlaylistReg.exec(message)[1]
		socket.emit('select_playlist', id)
	}

	if(message == '/list' || message == '/ㅣㅑㄴㅅ')
	{
		socket.emit('users')
		return
	}

	if(message == '/dj' || message == '/어')
	{
		socket.emit('djs')
		return
	}

	if(message == '/skip' || message == '/나ㅑㅔ')
	{
		socket.emit('skip')
	}

	if(pushReg.test(message))
	{
		var url = pushReg.exec(message)[1]
		var video_id = youtube_url_parse(url)
		var playlist_id = pushReg.exec(message)[2]
		socket.emit('push_video', {video_id:video_id, playlist_id: playlist_id})
	}

	if(requestReg.test(message))
	{
		var url = requestReg.exec(message)[1]
		var video_id = youtube_url_parse(url)

		socket.emit('request_video_info', video_id)
	}

	if(message == '/맥심')
	{
		socket.emit('maxim')
	}

	if(message == '/김치')
	{
		socket.emit('kimchi')
		return
	}

	if(queryReg.test(message))
	{
		socket.emit('query', queryReg.exec(message)[1])
	}

	// 서버로 message 이벤트 전달 + 데이터와 함께
	socket.emit('chat_message', { type: 'message', message: message })
}

var youtubeReg = /(\?|&)v=([^&\?]+)/
var youtubeReg2 = /\/v\/([^\/]+)/
var youtubeReg3 = /youtu\.be\/([^\?]+)/
function youtube_url_parse(url_or_id)
{
	if(youtubeReg.test(url_or_id))
		return youtubeReg.exec(url_or_id)[2]
	else if(youtubeReg2.test(url_or_id))
		return youtubeReg2.exec(url_or_id)[1]
	else if(youtubeReg3.test(url_or_id))
		return youtubeReg3.exec(url_or_id)[1]
	return url_or_id
}

/* 채팅창 엔터 단축키 */
function chat_keydown() {
  if (window.event.keyCode == 13)
	send()
}

window.onload = function() {
	initial_resize()
	loop_func(update_video_time, 100)
}
window.onresize = resize


function initial_resize()
{
	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.width = 232;

	/* 하단 현재 영상 정보 */
	video_info.style.left = current_playlist_info_box.style.width
	
	resize()
}

function resize() {
	var window_width = window.innerWidth
	var window_height = window.innerHeight

	/* 채팅 */
	mainchat.style.marginLeft = (window_width - mainchat.clientWidth)

	chat.style.height = (window_height - 50)

	/* 유튜브 플레이어 */
	if(player)
		player.setSize(window_width - mainchat.clientWidth, window_height - 86)

	block_video.style.width = (window_width - mainchat.clientWidth)
	block_video.style.height = (window_height - 86)
	block_video.style.lineHeight = (window_height - 86) + 'px'
	
	if(!player || !g_current_video_id)
		block_video.style.display = 'block'
	else
		block_video.style.display = 'none'

	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.top = (window_height - 86) 

	/* 하단 영상 정보 */ 
	var video_info_width = (window_width - 798)

	video_info.style.left = current_playlist_info_box.style.width
	video_info.style.top = (window_height - 86)
	video_info.style.width = video_info_width

	my_progress_bar.style.width = (window_width - 820)
	my_progress_bar.style.top = (window_height - 29)
	
	my_progress_bar_after.style.top = (window_height - 29)
	update_video_time()
	
	video_info_time.style.top = (window_height - 20)
	video_info_time.style.width = (window_width - 820)

	/* 플레이리스트 패널 */
	if(g_show_playlist_control_panel)
	{
		playlist_control_panel.style.width = (window_width - 350)
	}
}

/* 플레이리스트 컨트롤패널 열기/닫기 */
function show_playlist_control_panel(isShow) 
{
	playlist_control_panel.style.display = isShow ? 'block' : 'none'
}


/* 유튜브 플러그인 */
var player;
function onYouTubeIframeAPIReady() {
	player = new YT.Player('video_player', {
		height: '360',
		width: '640',
		// videoId: 'XgpTCb-Zf1o',
		playerVars:{
			'autoplay': 1, 
			// 'controls': 0, 
			'enablejsapi': 1, 
			'modestbranding': 1, 
			'playsinline': 1, 
			'disablekb': 1
			},
		events: {
		'onReady': onPlayerReady,
		'onStateChange': onPlayerStateChange
		}
	});
}

function onPlayerReady(event) 
{
	resize()

	// 로그인 요청
	g_player_ready = true
	if(g_nick)
	{
		console.log('onPlayerReady에서 login')
		socket.emit('login', g_nick)
	}
}

function onPlayerStateChange(event) 
{
	// if(event.data == -1)
	// 	add_system_message('player state : 초기화')

	if(event.data == 0)
	{
		// add_system_message('player state : 종료')
	}

	 if(event.data == 1)
	 {
		 var currentTime_s = player.getCurrentTime()
		 var diff = Math.abs(currentTime_s - (Date.now() - g_cued_time_ms) / 1000)
		//  add_system_message('player state : 재생\n플레이어 시간 : ' + player.getCurrentTime().toFixed(1)
		//  					+ '\n원본 시간 : ' + new_seekTo.toFixed(1)
		// 					+ '\n차이 : ' + diff.toFixed(1))

		if(diff >= 0.5)
			player.seekTo((Date.now() - g_cued_time_ms) / 1000, true)
	 }

	 if(event.data == 2)
	 {
		// add_system_message('player state : 일시중지')
		player.playVideo();
	 }

	//  if(event.data == 3)
	// 	add_system_message('player state : 버퍼링')

	if(event.data == 5)
	{
		// add_system_message('player state : 시그널 ' + g_current_video_id)
		SetVideoBlock(!g_current_video_id)
		hide_video_link()
		player.seekTo((Date.now() - g_cued_time_ms) / 1000, true)
	}
}

function SetVideoBlock(isBlock)
{	
	// add_system_message('SetVideoBlock ' + isBlock)
	if(block_video)
	{
		if(isBlock)
			block_video.style.display = 'block'
		else
			block_video.style.display = 'none'
	}
}

/* 영상 링크 보기 버튼 */
var timeReg = /(t=\d+&|&t=\d+)/
function show_video_link()
{
	if(!video_link || !g_current_video_id)
		return
	
	video_link.innerText = 'https://www.youtube.com/watch?v=' + g_current_video_id
	selectRange(video_link)
	document.execCommand("copy")
}
function hide_video_link()
{
	if(!video_link)
		return
	
	video_link.innerText = '[영상 링크 복사]'
}

/* 영상 플레이 타임 갱신 */
function update_video_time() 
{
	var isVideoPlaying = g_current_video_id
	if(!isVideoPlaying)
	{
		my_progress_bar_after.innerText = ''
		my_progress_bar_after.style.width = 0
		video_info_time.innerText = '--:-- / --:--'
		return
	}

	var duration = g_current_duration
	if(duration == 0)
	{
		my_progress_bar_after.style.width = (window.innerWidth - 820)
		video_info_time.innerText = '실시간'
		return
}
	var currentTime = (Date.now() - g_cued_time_ms) / 1000
	if(duration < currentTime)
		currentTime = duration
	my_progress_bar_after.style.width = (window.innerWidth - 820) * (currentTime / duration)
	video_info_time.innerText = second_to_string(currentTime) + " / " + second_to_string(duration)
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

function loop_func(func, interval)
{
	func()
	setTimeout(() => loop_func(func, interval), interval)
}

/* DJ 업뎃 */
function update_current_dj()
{	
	if(!g_current_dj)
		video_info_dj.firstChild.nodeValue = '-'
	else
		video_info_dj.firstChild.nodeValue = g_current_dj
}

/* 영상 제목 업뎃 */
function update_current_video_name()
{
	var isVideoPlaying = g_current_video_id
	if(!isVideoPlaying)
	{
		video_info_name.innerText = '재생 중인 영상이 없습니다.'
		video_link.innerText = ''
		return
	}

	var video_name = g_current_title
	if(!video_name)
	{
		video_info_name.innerText = '재생 중인 영상이 없습니다.'
		video_link.innerText = ''
		return
	}
	video_info_name.innerText = video_name
	hide_video_link()
}

function selectRange(obj) 
{
	if (window.getSelection)
		window.getSelection().selectAllChildren(obj)
	else if (document.body.createTextRange) 
	{
		var range = document.body.createTextRange()
		range.moveToElementText(obj)
		range.select()
	}
}
var socket = io()

/* 채팅/인증용 데이터 */
var g_nick = ''
var g_isLogin = false

/* 플레이어 관련 데이터 */
var g_cued_time_ms = 0
var g_current_video_id = ''
var g_current_dj = ''
var g_current_title = ''
var g_current_duration = 0
var g_is_djing = false

var g_good_list = [] // 좋아요 누른 사람 닉네임 목록
var g_bad_list = [] // 싫어요 목록

/* 웹 페이지 로딩 체크용 */
var g_isConnected = false
var g_isWindowLoaded = false
var g_player_ready = false

/* 반응형 패널 상태 */
var g_show_playlist_control_panel = false
var g_playlist_control_panel_current_playlist_id = 0 // 현재 컨트롤 중인 플레이리스트 아이디 (영상 추가 삭제 등 수정 시에 쓰임)

/* DEBUG용 전역변수 */
var g_data = null
var g_throw_data = null

/* 재생목록 데이터 */
var g_video_info_dic = null
var g_playlist_info_list = null
var g_current_playlist_id = 0

/* DEBUG: 랜덤 닉네임 모드 */
var g_setting_auto_login = false

/* 기타 캐싱 */
var g_progress_bar_width = 0


/* 접속 되었을 때 실행 */
socket.on('connect', function () {
	g_isConnected = true
	if(g_isLogin)
	{
		add_message({type: 'system_message', message: '연결 끊김. 새로고침(Ctrl+F5)하고 다시 로그인 해주세요.'})
		return
	}

	g_isLogin = false

	/* 로그인창 */
	if(g_isWindowLoaded)
	{
		login_bg.style.display = 'block'
		login_id.style.display = 'block'
		login_pw.style.display = 'block'
		login_button.style.display = 'block'
		resize()
		login_id.focus()
	}
	
	if(!g_setting_auto_login)
		return

	g_nick = '토깽' + (Math.random() * 1000).toFixed(0) + '호'
	//g_nick = prompt('닉네임을 입력해주세요', '')
	// g_nick = ''
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

function login()
{
	login_button.style.display = 'none'

	g_nick = login_id.value
	g_nick = g_nick.replace(/(\'|\")/g, '')
	if(!g_nick)
	{
		login_id.value = ''
		login_button.style.display = 'block'
		return
	}

	console.log('window에서 login')
	socket.emit('login', g_nick)
}

/* 서버로부터 로그인 인증을 받은 경우 */
socket.on('login', function(isSuccess) {
	console.log('login 리시브', g_isLogin, '->', isSuccess)
	if(g_isLogin)
		return
	g_isLogin = isSuccess
	if(!isSuccess)
	{
		alert('인증 실패! 이미 로그인 되어있습니다.\n다시 시도하거나 새로고침(Ctrl+F5) 해주세요.')
		login_button.style.display = 'block'
		return
	}

	g_isLogin = true

	// 로그인 창 숨기기
	init_block.style.opacity = 1
	disappear_login_scene()
	login_bg.style.display = 'none'
	login_id.style.display = 'none'
	login_pw.style.display = 'none'
	login_button.style.display = 'none'

	add_system_message('후원 랭킹\n'
						+ '★ 0. Lily(샤르프로젝트) 님 ★\n' 
						+ '1. 랠래 님\n'
						+ '2. 노통 님\n'
						+ '3. 고냥이지 님')
	add_system_message('명령어 목록은 /? 을 입력해 볼 수 있습니다.')

	socket.emit('chat_newUser')

	chat_input.focus()
})

function disappear_login_scene()
{
	init_block.style.opacity -= 0.0125

	if(init_block.style.opacity > 0)
	{
		setTimeout(disappear_login_scene, 5)
		return
	}

	init_block.style.display = 'none'
}

/* 서버로부터 채팅 데이터 받은 경우 */
socket.on('chat_update', function (data) {
	if(!g_isLogin)
		return

	add_message(data)
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
	update_dj_state()
	g_cued_time_ms = Date.now() - data.seek_s * 1000
	var seek_time_s = (Date.now() - g_cued_time_ms) / 1000
	player.cueVideoById(data.video_id, seek_time_s, 'low')
})

/* 좋/실 갱신 신호 받음*/
socket.on('rating', function(data) {
	// { good: list, bad: list }

	console.log('rating', data)

	g_good_list = data.good
	g_bad_list = data.bad

	update_rating_status()
})

socket.on('update_playlist', function(data) {
	g_video_info_dic = data[0]
	g_playlist_info_list = data[1]
	g_current_playlist_id = data[2]

	console.log('update_playlist', g_video_info_dic, g_playlist_info_list)

	update_current_playlist()
	if(g_show_playlist_control_panel)
		update_playlist(true) 
})

socket.on('dj_state', function(isDJing) {
	g_is_djing = isDJing

	update_dj_state()
})

socket.on('data', function(data) {
	console.log('data received.', data)
	g_data = data
})

socket.on('throw_data', function(exception) {
	console.log('throw data received.', exception)
	g_throw_data = exception
})

/* push_video의 결과 신호를 받았을 때 */
socket.on('push_video_result', function(data) {
	alert((data.isSuccess ? '성공!' : '실패..') + '\n' + data.message)
})

// =====================================================================
// =====================================================================

/* 채팅창에 메시지 추가 함수 */
var imgReg = /\/img (\S+)/i
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
		img.onload = scrollDown
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

	scrollDown()
}
/* 채팅창에 시스템 메시지 추가 함수 */
function add_system_message(message)
{
	add_message({type: 'system_message', message: message})
}


/* 메시지 전송 함수 */
var playReg = /^\/(p|ㅔ|play|ㅔㅣ묘) (\S+)/i
var queueReg = /^\/(q|ㅂ|queue|벼뎓) (\S+)/i
var rewindReg = /^\/(r|rewind|ㄱㄷ쟈ㅜㅇ|ㄱ|되감기) (\d+)/i
var forwardReg = /^\/(f|fwd|ㄹㅈㅇ|ㄹ|빨리감기) (\d+)/i
var requestReg = /^\/request (\S+)/i
var selectPlaylistReg = /^\/select_playlist (\d+)/i
var pushReg = /^\/push (\S+) (\d+)/i
var queryReg = /^\/query (.+)/i
var zzalReg = /^\/짤 (.+)/i
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
		add_system_message('명령어 목록 (대소문자 구분 X)\n' 
							+ '/(p)lay {유튜브주소} : 해당 영상 즉시 재생\n'
							+ '/(q)ueue {유튜브주소} : 해당 영상 대기열에 추가\n'
							+ '/q : 현재 영상 대기열 확인\n'
							+ '/(l)ist : 참가자 목록 보기\n'
							// + '/dj : 디제이 대기열 보기(미구현)\n'
							+ '/playing : 재생 싱크 맞추기\n'
							+ '/(s)kip : 현재 영상 스킵\n'
							+ '/(r)ewind 10 : 10초 되감기 (/되감기 10 도 가능)\n'
							+ '/(f)wd 10 : 10초 빨리감기 (/빨리감기 10 도 가능)\n'
							+ '/짤 {검색어} : 랜덤 이미지 (단부루)\n'
							+ '/img  {이미지주소} : 이미지 채팅'
							)
		return
	}

	if(zzalReg.test(message))
	{
		var tag = zzalReg.exec(message)[1]
		socket.emit('zzal', tag)
	}

	// play url 테스트
	if(playReg.test(message))
	{
		var url = playReg.exec(message)[2]
		var video_id = youtube_url_parse(url)

		socket.emit('play', {dj: g_nick, video_id: video_id})
		return
	}

	if(queueReg.test(message))
	{
		var url = queueReg.exec(message)[2]
		var video_id = youtube_url_parse(url)

		socket.emit('queue', {dj: g_nick, video_id: video_id})
		return
	}

	if(message.toLowerCase() == '/q' || message == '/ㅂ')
	{
		socket.emit('queue_list')
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

	if(message.toLowerCase() == '/playing' || message == '/ㅔㅣ묘ㅑㅜㅎ')
	{
		socket.emit('playing')
		return
	}

	if(message.toLowerCase() == '/playlist')
	{
		socket.emit('playlist')
	}

	if(message.toLowerCase() == '/newplaylist')
	{
		socket.emit('new_playlist')
		return
	}

	if(selectPlaylistReg.test(message))
	{
		var id = selectPlaylistReg.exec(message)[1]
		socket.emit('select_playlist', id)
	}

	if(message.toLowerCase() == '/list' || message == '/ㅣㅑㄴㅅ' || message.toLowerCase() == '/l')
	{
		socket.emit('users')
		return
	}

	if(message.toLowerCase() == '/dj' || message == '/어')
	{
		socket.emit('djs')
		return
	}

	if(message.toLowerCase() == '/skip' || message == '/나ㅑㅔ' || message.toLowerCase() == '/s' || message == '/ㄴ')
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

	if(message == '/begin')
	{
		socket.emit('test_begin')
	}

	if(message == '/commit')
	{
		socket.emit('test_commit')
	}

	if(queryReg.test(message))
	{
		socket.emit('query', queryReg.exec(message)[1])
	}

	// 서버로 message 이벤트 전달 + 데이터와 함께
	socket.emit('chat_message', { type: 'message', message: message })
	scrollDown(true)
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

function chat_onpaste() {
	pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
		return
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		socket.emit('chat_message', { type: 'message', message: format('/img {0}', ret) })
		scrollDown(true)
	}
	reader.readAsDataURL(blob)
}

/* 로그인창 엔터 단축키 */
function login_keydown()
{
	if (window.event.keyCode == 13)
		login()
}

function window_keydown()
{
	if(!g_isLogin)
		return

	if (window.event.keyCode == 13)
		chat_input.focus()
}

window.onload = function() {
	g_isWindowLoaded = true

	initial_resize()
	
	if(g_isConnected && !g_isLogin)
	{
		login_bg.style.display = 'block'
		login_id.style.display = 'block'
		login_pw.style.display = 'block'
		login_button.style.display = 'block'
		resize()
		login_id.focus()
	}

	loop_func(update_video_time, 100)
}
window.onresize = resize
window.onkeydown = window_keydown



function initial_resize()
{
	var bottom_height = 86 // 하단 박스 높이

	/* 우측 채팅 */
	mainchat.style.width = 350

	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.width = 232 + 100
	current_playlist_info_box.style.height = bottom_height

	/* 하단 현재 영상 정보 */
	video_info.style.left = current_playlist_info_box.clientWidth
	my_progress_bar.style.left = current_playlist_info_box.clientWidth + 11 // 프로그레스 바 패딩 : 양옆 11px
	my_progress_bar_after.style.left = current_playlist_info_box.clientWidth + 11
	video_info_time.style.left = current_playlist_info_box.clientWidth + 11

	/* 우하단 기타 박스 */
	etc_box.style.width = 216
	etc_box.style.height = bottom_height

	/* 재생목록 컨트롤 패널 */
	playlist_control_panel_playlist_header.style.width = 300
	playlist_control_panel_videolist_header.style.left = 300 // 위와 같아야 함.
	playlist_control_panel_playlist_info.style.left = 300 // 위와 같아야 함.
	playlist_control_panel_playlist_info.style.height = 100

	resize()
}

function resize() {
	var window_width = window.innerWidth
	var window_height = window.innerHeight

	var bottom_height = 86 // 하단 박스 높이

	/* 로그인 창 */
	login_bg.style.left = (window_width - login_bg.clientWidth) / 2
	login_bg.style.top = (window_height - login_bg.clientHeight) / 2

	login_id.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_id.style.top = window_height / 2 - login_id.clientHeight - 7.5

	login_pw.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_pw.style.top = window_height / 2 + 7.5

	login_button.style.left = (window_width - login_bg.clientWidth) / 2 + 13 + login_id.clientWidth + 15
	login_button.style.top = window_height / 2 - login_id.clientHeight - 8


	/* 채팅 */
	mainchat.style.marginLeft = (window_width - mainchat.clientWidth) // 350

	chat.style.height = (window_height - 50)

	/* 유튜브 플레이어 */
	if(player)
		player.setSize(window_width - mainchat.clientWidth, window_height - bottom_height)

	block_video.style.width = (window_width - mainchat.clientWidth)
	block_video.style.height = (window_height - bottom_height)
	block_video.style.lineHeight = (window_height - bottom_height) + 'px'
	
	if(!player || !g_current_video_id)
		block_video.style.display = 'block'
	else
		block_video.style.display = 'none'

	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.top = (window_height - bottom_height) 

	/* 하단 영상 정보 */ 
	var video_info_width = window_width - mainchat.clientWidth - current_playlist_info_box.clientWidth - etc_box.clientWidth - 3 // 798
	video_info.style.top = (window_height - bottom_height)
	video_info.style.width = video_info_width

	my_progress_bar.style.width = (video_info_width - 22)
	g_progress_bar_width = (video_info_width - 22) // 위와 같음
	my_progress_bar.style.top = (window_height - 29)
	
	my_progress_bar_after.style.top = (window_height - 29)
	update_video_time()
	
	video_info_time.style.top = (window_height - 20)
	video_info_time.style.width = (video_info_width - 22)

	/* 우하단 기타 패널 */
	etc_box.style.top = (window_height - bottom_height) 
	etc_box.style.left = current_playlist_info_box.clientWidth + video_info.clientWidth + 2

	etc_good_button.style.left = etc_box.offsetLeft + 50
	etc_good_button.style.top = etc_box.offsetTop + 45
	etc_good_count.style.left = etc_good_button.offsetLeft + etc_good_button.clientWidth
	etc_good_count.style.top = etc_good_button.offsetTop

	etc_bad_button.style.left = etc_box.offsetLeft + 121
	etc_bad_button.style.top = etc_box.offsetTop + 45
	etc_bad_count.style.left = etc_bad_button.offsetLeft + etc_bad_button.clientWidth
	etc_bad_count.style.top = etc_bad_button.offsetTop

	/* 플레이리스트 패널 */
	if(g_show_playlist_control_panel)
		control_panel_resize()
}

function control_panel_resize()
{
	var window_width = window.innerWidth
	var window_height = window.innerHeight
	var bottom_height = 86 // 하단 박스 높이

	var t_playlist_control_panel_playlist_header_width = playlist_control_panel_playlist_header.getBoundingClientRect().width

	// 패널 판크기 조절
	playlist_control_panel.style.width = (window_width - mainchat.clientWidth)
	playlist_control_panel.style.height = (window_height - bottom_height)

	// 재생목록 헤더 크기 조절
	playlist_control_panel_playlist_header.style.height = (window_height - bottom_height - 1)

	// 재생목록 인포 크기 조절
	playlist_control_panel_playlist_info.style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 1)

	// 영상 목록 헤더 크기 조절
	playlist_control_panel_videolist_header.style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 1)
	playlist_control_panel_videolist_header.style.height = (window_height - bottom_height - playlist_control_panel_videolist_header.offsetTop - 1)

	// 영상 목록의 텍스트 길이 조절
	for(var e of document.getElementsByClassName('videolist_button'))
		e.getElementsByClassName('text')[0].style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 204 - 120 - 10 - 10 - 1 - 110 * 2)
}

/* 플레이리스트 컨트롤패널 열기/닫기 */
function show_playlist_control_panel(isShow) 
{
	g_show_playlist_control_panel = isShow
	if(isShow)
	{
		if(g_playlist_info_list)
		{
			update_playlist()
		}
	}

	playlist_control_panel.style.display = isShow ? 'block' : 'none'
	control_panel_resize()
}
function update_playlist(keep_preview = false)
{
	// 모든 자식 노드 삭제
	while ( playlist_control_panel_playlist_header.hasChildNodes() ) 
		playlist_control_panel_playlist_header.removeChild( playlist_control_panel_playlist_header.firstChild )

	// 자식 노드들 추가
	for(var e of g_playlist_info_list)
	{
		var div = document.createElement('div')

		// 선택 이미지
		if(e.Id == g_current_playlist_id)
		{
			var sel = document.createElement('div')
			sel.classList.add('playing_img')
			div.appendChild(sel)	
		}

		// 이름 
		var text = document.createElement('div')
		text.classList.add('text')
		text.innerText = format('{0} ({1})', e.Name, e.VideoList.length)
		div.appendChild(text)

		div.classList.add('playlist_button')
		div.classList.add('hover')
		div.classList.add(g_playlist_info_list.indexOf(e) % 2 == 0 ? 'even' : 'odd')
		if(e.Id == g_current_playlist_id)
		{
			div.style.paddingLeft = 0
			text.style.width = 'auto'
		}
		
		div.setAttribute('playlist_id', e.Id)
		div.onclick = onclick_playlist_button
		playlist_control_panel_playlist_header.appendChild(div)
	}

	// 마지막에 새 재생목록 버튼도 추가
	var div = document.createElement('div')
	var text = document.createElement('div')
	text.classList.add('text')
	text.classList.add('create_button')
	div.classList.add('hover')
	text.innerText = '+'
	div.appendChild(text)
	div.classList.add('playlist_button')
	div.classList.add(g_playlist_info_list.length % 2 == 0 ? 'even' : 'odd')
	div.onclick = onclick_playlist_create_button
	playlist_control_panel_playlist_header.appendChild(div)

	// 현재재생목록을 선택해서 리스트를 보여줌
	if(keep_preview)
		select_playlist_button(g_playlist_control_panel_current_playlist_id)
	else
		select_playlist_button(g_current_playlist_id)
}
/* 새 재생목록 추가 버튼 */
function onclick_playlist_create_button()
{
	socket.emit('new_playlist')
}
function onclick_playlist_button()
{
	var thisElement = event.target

	while(!thisElement.getAttribute('playlist_id')) // 하위 노드가 클릭된 경우
		thisElement = thisElement.parentElement

	var playlist_id = thisElement.getAttribute('playlist_id')

	if(g_playlist_control_panel_current_playlist_id == playlist_id)
		return

	select_playlist_button(playlist_id)
}
function select_playlist_button(playlist_id)
{
	// 선택된 플레이리스트 Id 저장
	g_playlist_control_panel_current_playlist_id = playlist_id

	// 해당 재생목록 데이터 찾기
	var thisPlaylist = null
	for(var e of g_playlist_info_list)
	{
		if(e.Id == playlist_id)
		{
			thisPlaylist = e
			break
		}
	}

	// 해당 엘리먼트 찾기
	var thisElement = playlist_control_panel_playlist_header.querySelector(format('[playlist_id="{0}"]', playlist_id))

	// 리스트 선택 selected 속성 적용
	for(var e of playlist_control_panel_playlist_header.children)
		e.toggleAttribute('selected', false)
	thisElement.toggleAttribute('selected', true)

	// 상단부 재생목록 인포 이름, 색상 세팅
	playlist_control_panel_playlist_info_name.innerText = thisPlaylist.Name
	playlist_control_panel_playlist_info.style.background = (thisPlaylist.Id == g_current_playlist_id ? 'linear-gradient(0deg, #a0e0393b, #a0e0391f)' : '')
	
	// 활성화 버튼 세팅
	// TODO: 텍스트에서 이미지로 변경. (선택 이라는 이미지로 할지 어떻게할지 고민중)
	playlist_control_panel_playlist_info_select.innerText = (thisPlaylist.Id == g_current_playlist_id ? '선택됨' : '[선택하기]')
	playlist_control_panel_playlist_info_select.onclick = (thisPlaylist.Id == g_current_playlist_id ? null : onclick_playlist_select_button)
	playlist_control_panel_playlist_info_select.toggleAttribute('selected', (thisPlaylist.Id == g_current_playlist_id))

	// 재생목록 삭제 버튼 세팅 (선택된 놈은 삭제못함)
	if(g_playlist_control_panel_current_playlist_id == g_current_playlist_id)
		playlist_control_panel_playlist_info_delete_button.style.display = 'none'
	else
		playlist_control_panel_playlist_info_delete_button.style.display = 'block'

	// 비디오 리스트의 모든 자식 노드 삭제
	while ( playlist_control_panel_videolist_header.hasChildNodes() ) 
		playlist_control_panel_videolist_header.removeChild( playlist_control_panel_videolist_header.firstChild )

	// 영상 목록 갱신
	var i = 0
	for(var e of thisPlaylist.VideoList)
	{
		var thisData = g_video_info_dic[e]
		
		var div = document.createElement('div')

		// 이미지 생성 후 추가
		var img = document.createElement('img')
		img.src = thisData.Thumbnail
		img.innerText = format('{0} ({1})', thisData.Name, second_to_string(thisData.Length))
		img.setAttribute('videoId', thisData.VideoId)
		img.onclick = _ => window.open(format('https://www.youtube.com/watch?v={0}', event.target.getAttribute('videoId')))
		div.appendChild(img)

		// 영상 이름 텍스트 생성 후 추가
		var text = document.createElement('div')
		text.innerText = format('{0} ({1})', thisData.Name, second_to_string(thisData.Length))
		text.classList.add('text') // 쿼리를 위해
		div.appendChild(text)

		// 삭제 버튼 추가
		var del = document.createElement('div')
		del.classList.add('delete_button')
		del.classList.add('hover')
		del.style.float = 'right'
		del.onclick = onclick_video_delete_button
		div.appendChild(del)

		// 순서 정렬 버튼 추가
		var sort_down = document.createElement('div')
		sort_down.classList.add('sort_button')
		sort_down.classList.add('down')
		sort_down.classList.add('hover')
		sort_down.style.float = 'right'
		if(i == thisPlaylist.VideoList.length - 1)
			sort_down.style.filter = 'brightness(3)'
		sort_down.onclick = onclick_video_sort_down_button
		div.appendChild(sort_down)

		var sort_up = document.createElement('div')
		sort_up.classList.add('sort_button')
		sort_up.classList.add('up')
		sort_up.classList.add('hover')
		sort_up.style.float = 'right'
		if(i == 0)
			sort_up.style.filter = 'brightness(3)'
		sort_up.onclick = onclick_video_sort_up_button
		div.appendChild(sort_up)
		

		div.classList.add('videolist_button')
		div.classList.add(i % 2 == 0 ? 'even' : 'odd')
		div.setAttribute('ItemIndex', i)
		div.setAttribute('VideoIndex', e)
		div.setAttribute('videoId', thisData.VideoId)

		playlist_control_panel_videolist_header.appendChild(div)

		i++
	}

	control_panel_resize()
}

function onclick_video_delete_button()
{
	var index = event.target.parentElement.getAttribute('ItemIndex')
	
	var thisPlaylist = null
	for(var e of g_playlist_info_list)
	{
		if(e.Id == g_playlist_control_panel_current_playlist_id)
		{
			thisPlaylist = e
			break
		}
	}

	if(!thisPlaylist)
	{
		console.log('error on onclick_video_delete_button')
		return
	}

	var video_index = thisPlaylist.VideoList[index]
	var yes = confirm(format('[{0}] 영상을 삭제합니다.', g_video_info_dic[video_index].Name))
	if(!yes)
		return

	socket.emit('delete_video', {playlist_id: thisPlaylist.Id, index: index, video_id: video_index})
}

function onclick_video_sort_up_button()
{
	request_change_video_sort(event.target, false)
}
function onclick_video_sort_down_button()
{
	request_change_video_sort(event.target, true)
}
function request_change_video_sort(element, isDown)
{
	var index = element.parentElement.getAttribute('ItemIndex')
	if(index == null)
		index = element.parentElement.parentElement.getAttribute('ItemIndex')
	
	if(index == null)
	{
		console.log('좋버그 발생 request_change_video_sort')
		return
	}
	index = eval(index)

	var thisPlaylist = g_playlist_info_list.filter(x => x.Id == g_playlist_control_panel_current_playlist_id)[0]
	if(!thisPlaylist)
	{
		console.log('error on request_change_video_sort')
		return
	}

	// if(!isDown && index == 0 || isDown && index == thisPlaylist.VideoList.length - 1) // 범위를 넘어가는 정렬
	// 	return

	var video_id = thisPlaylist.VideoList[index]
	socket.emit('change_video_order', {playlist_id: thisPlaylist.Id, video_index: index, video_id: video_id, isDown: isDown })
}

function onclick_playlist_select_button()
{
	socket.emit('select_playlist', g_playlist_control_panel_current_playlist_id)
}
function onclick_new_video_button()
{
	var url = prompt('추가할 영상의 주소를 넣어주세요.\nex)\nhttps://www.youtube.com/watch?v=FRO3EX3zAss\n또는 FRO3EX3zAss')
	var video_id = youtube_url_parse(url)
	if(!url || !video_id)
		return

	socket.emit('push_video', {video_id: video_id, playlist_id: g_playlist_control_panel_current_playlist_id})
}

function onclick_playlist_shuffle_button()
{
	var thisPlaylist = g_playlist_info_list.filter(x => x.Id == g_playlist_control_panel_current_playlist_id)[0]
	socket.emit('shuffle', thisPlaylist.Id)
}

function onclick_playlist_rename_button()
{
	// 해당 재생목록 데이터 찾기
	var thisPlaylist = null
	for(var e of g_playlist_info_list)
	{
		if(e.Id == g_playlist_control_panel_current_playlist_id)
		{
			thisPlaylist = e
			break
		}
	}

	var new_name = prompt('변경할 재생목록 이름을 넣어주세요.', thisPlaylist.Name)
	if(new_name == null)
		return
	
	socket.emit('rename_playlist', {name: new_name, playlist_id: g_playlist_control_panel_current_playlist_id})
}	

function onclick_playlist_delete_button()
{
	// 현재 디제잉 중인 재생목록은 삭제 불가
	if(g_playlist_control_panel_current_playlist_id == g_current_playlist_id)
	{
		alert('선택 중인 재생목록은 삭제할 수 없습니다.')
		return
	}	

	// 해당 재생목록 데이터 찾기
	var thisPlaylist = null
	for(var e of g_playlist_info_list)
	{
		if(e.Id == g_playlist_control_panel_current_playlist_id)
		{
			thisPlaylist = e
			break
		}
	}
	var yes = confirm(format('[{0}] 재생목록을 삭제합니다.', thisPlaylist.Name))
	if(!yes)
		return

	var delete_playlist_id = g_playlist_control_panel_current_playlist_id
	select_playlist_button(g_current_playlist_id)
	socket.emit('delete_playlist', delete_playlist_id)
}

function toggle_playlist_control_panel()
{
	g_show_playlist_control_panel = !g_show_playlist_control_panel
	show_playlist_control_panel(g_show_playlist_control_panel)
}

function onclick_dj_button()
{
	if(!g_is_djing) // 이제 디제잉 시작하려는 경우, 등록된 영상이 0개이면 못하게 막아야 함.
	{
		if(g_playlist_info_list.filter(x => x.Id == g_current_playlist_id)[0].VideoList.length == 0)
		{
			alert('재생목록에 영상을 등록해주세요.')
			return
		}
	}

	if(g_is_djing)
		socket.emit('dj_quit')
	else
		socket.emit('dj_enter')
}

/* DJ 입장했는지 상태 업데이트 */
function update_dj_state()
{
	if(g_current_dj == g_nick)
	{
		etc_skip_button.style.display = 'block'
		etc_dj_button.style.width = '70%'
	}
	else
	{
		etc_skip_button.style.display = 'none'
		etc_dj_button.style.width = '100%'
	}

	if(g_is_djing)
		etc_dj_button.innerText = '[대기열 나가기]'
	else
		etc_dj_button.innerText = '[대기열 입장]'
}
function onclick_skip_button()
{
	if(g_current_dj == g_nick)
		socket.emit('skip')
}

function onclick_good_button()
{
	socket.emit('rating', true)
}
function onclick_bad_button()
{
	socket.emit('rating', false)
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
		if(g_current_duration > 0) // 생방(실시간) 일때는 싱크 맞추지 않음
		{
			var currentTime_s = player.getCurrentTime()
			var diff = Math.abs(currentTime_s - (Date.now() - g_cued_time_ms) / 1000)
			//  add_system_message('player state : 재생\n플레이어 시간 : ' + player.getCurrentTime().toFixed(1)
			//  					+ '\n원본 시간 : ' + new_seekTo.toFixed(1)
			// 					+ '\n차이 : ' + diff.toFixed(1))

			if(diff >= 0.5)
				player.seekTo((Date.now() - g_cued_time_ms) / 1000, true)
		}
		SetVideoBlock(!g_current_video_id)
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
		my_progress_bar_after.style.width = g_progress_bar_width
		video_info_time.innerText = '실시간'
		return
}
	var currentTime = (Date.now() - g_cued_time_ms) / 1000
	if(duration < currentTime)
		currentTime = duration
	my_progress_bar_after.style.width = g_progress_bar_width * (currentTime / duration)
	video_info_time.innerText = second_to_string(currentTime) + " / " + second_to_string(duration)
}

/* 선택된 재생목록 미리보기 부분 갱신 */
function update_current_playlist()
{
	if(!g_playlist_info_list)
	{
		current_playlist_name.innerText = '-'
		current_playlist_video_name.innerText = '재생목록 불러오기 실패'
		return
	}

	var current_data = null
	for(var e of g_playlist_info_list)
	{
		if(e.Id == g_current_playlist_id)
		{
			current_data = e
			break
		}
	}

	current_playlist_name.innerText = format('{0} ({1})', current_data.Name, current_data.VideoList.length)
	if(current_data.VideoList.length == 0)
		current_playlist_video_name.innerText = '[여기를 눌러 곡을 등록]'
	else
		current_playlist_video_name.innerText = g_video_info_dic[current_data.VideoList[0]].Name
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

/* 좋아요/싫어요 패널 업데이트 */
function update_rating_status()
{
	var good_count = g_good_list.length
	var bad_count = g_bad_list.length
	var is_good_pick = g_good_list.indexOf(g_nick) != -1
	var is_bad_pick = g_bad_list.indexOf(g_nick) != -1

	etc_good_count.innerText = good_count
	etc_bad_count.innerText = bad_count

	etc_good_count.style.color = is_good_pick ? 'red' : 'black'
	etc_bad_count.style.color = is_bad_pick ? 'blue' : 'black'
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

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}

function scrollDown(isForce = false)
{
	if(chat.scrollHeight - (chat.scrollTop + chat.clientHeight) < chat.clientHeight || isForce)
		chat.scrollTop = chat.scrollHeight
}
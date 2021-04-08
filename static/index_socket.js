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
socket.on('login', function(data) {
	console.log('login 리시브', g_isLogin, '->', data)
	if(g_isLogin)
		return
	g_isLogin = data.isSuccess
	if(!data.isSuccess)
	{
		alert('인증 실패! 이미 로그인 되어있습니다.\n다시 시도하거나 새로고침(Ctrl+F5) 해주세요.')
		login_button.style.display = 'block'
		return
	}

	g_isLogin = true
	g_icon_id = data.icon_id

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
						+ '3. 고냥이지 님', 'yellow')
	add_system_message('명령어 목록은 /? 을 입력해 볼 수 있습니다.')

	socket.emit('chat_newUser')

	chat_input.focus()
})

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
	{
		if(data.video_id)
			add_system_message(format('DJ : {0} \nVideo Id : {1} \n제목 : {2} ({3})', data.dj, data.video_id, data.title, second_to_string(data.duration)))
	}
	else
		add_system_message('영상 끝')

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
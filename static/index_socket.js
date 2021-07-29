/* 접속 되었을 때 실행 */
socket.on('connect', function () {
	g_isConnected = true
	if(g_isLogin)
	{
		add_message({type: 'system_message', message: '로그인 세션 만료.\n새로고침하고 다시 로그인 해주세요.'})
		return
	}

	g_isLogin = false

	/* 로그인창 */
	if(g_isWindowLoaded)
	{
		login_bg.style.display = 'block'
		login_port.style.display = 'block'
		login_id.style.display = 'block'
		login_pw.style.display = 'block'
		login_button.style.display = 'block'
		resize()
		login_id.focus()
	}
	
	if(!g_setting_auto_login)
		return

	g_nick = g_nick.replace(/(\'|\"|\?| )/g, '')

	// 이름이 빈칸인 경우
	if (!g_nick) {
		add_message({type: 'system_message', message: '새로고침하고 다시 로그인 해주세요.'})
		return
	}

	add_system_message('인증 중 ...')
	if(g_player_ready)
		socket.emit('login', g_nick)
})

socket.on('disconnect', function () {
	add_message({type: 'system_message', message: '연결 끊김', bg: 'red'})
})

/* 밴 안내 */
socket.on('ban', function(reason) {
	if(reason)
		alert(reason)
})

/* 강제 새로고침 명령 */
socket.on('refresh', function() {
	location.reload()
})

/* 서버로부터 로그인 인증을 받은 경우 */
socket.on('login', function(isSuccess) {
	if(g_isLogin)
		return
	g_isLogin = isSuccess
	if(!isSuccess)
	{
		alert('인증 실패! 이미 로그인 되어있습니다.\n다시 시도하거나 새로고침 해주세요.')
		login_button.style.display = 'block'
		return
	}

	g_isLogin = true

	// 로그인 창 숨기기
	init_block.style.opacity = 1
	disappear_login_scene()
	login_bg.style.display = 'none'
	login_port.style.display = 'none'
	login_id.style.display = 'none'
	login_pw.style.display = 'none'
	login_button.style.display = 'none'

	add_system_message('후원 랭킹\n'
						+ '★ 0. Lily(샤르프로젝트) 님 ★\n' 
						+ '1. 우뭇가사리 님\n' 
						+ '2. 랠래 님\n'
						+ '3. 노통 님\n'
						+ '4. 고냥이지 님\n'
						+ '5. 인공사 님\n'
						+ '6. pagolas 님\n'
						+ '7. 디아 님\n'
						+ '8. 강령군주 님\n'
						+ '후원 계좌 : 기업 539-028793-01-012 박*준', 'yellow')
	add_system_message('명령어 목록은 /? 을 입력해 볼 수 있습니다.')
	add_system_message('패치 노트 보기 (클릭)', 'chartreuse').onclick = _ => window.open('/patch_note', '패치 노트')

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
socket.on('users', function(data_list) {
	g_users = data_list
	update_djlist_users(g_users)
})

/* 서버로부터 DJ 목록 요청의 답신을 받은 경우 */
socket.on('djs', function(data_list) {
	if(data_list.length > 0)
		data_list.splice(0, 0, data_list.splice(-1)[0]) // 맨 뒤의 순번을 맨 앞으로 가져오기. (현재 재생중인 DJ로 편하게 표현하기 위해)
	g_djs = data_list
	update_djlist_djs(g_djs)
})

/* 서버로부터 영상 데이터를 받은 경우 */
socket.on('update_current_video', function(data) {
	if(data)
	{
		if(data.video_id)
			add_play_message(data)
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
		livechat_hide()
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

	g_good_list = data.good
	g_bad_list = data.bad

	update_rating_status()
})

socket.on('update_playlist', function(data) {
	g_video_info_dic = data[0]
	g_playlist_info_list = data[1]
	g_current_playlist_id = data[2]

	update_current_playlist()
	if(g_show_playlist_control_panel)
	{
		update_playlist(true) 
		if(data.length >= 3 && data[3] != 0)
			select_playlist_button(data[3])
	}
})

socket.on('dj_state', function(isDJing) {
	g_is_djing = isDJing

	update_dj_state()
})

socket.on('ping', function () {
	var elapsed_time =  Date.now() - ping_time
	// add_system_message(format('Ping : {0}ms', elapsed_time))
	socket.emit('chat_message', { type: 'message', message: format('# Ping Test : {0}ms', elapsed_time) })
})

socket.on('data', function(data) {
	g_data = data
})

socket.on('throw_data', function(exception) {
	g_throw_data = exception
})

/* push_video의 결과 신호를 받았을 때 */
socket.on('push_video_result', function(data) {
	alert(data.message)
})

socket.on('tts', function(file_name) {
	if(!option_checkbox_tts.checked) // TTS 자동 재생 옵션 체크
		return

	var new_tts = new Audio(file_name)
	new_tts.volume = option_slider_tts_volume.value
	new_tts.onended = destroy_self
	new_tts.play()
})

function destroy_self() 
{
	delete this
}

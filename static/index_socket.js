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
		login_remember_nick_holder.style.display = 'block'
		resize()
		login_id.focus()
	}

	if(g_player_ready && location.search.indexOf('OBS') != -1)
	{
		login_id.value = 'OBS'
		login()
		return
	}

	var stored_nick = localStorage.getItem(g_storage_nick_key)
	if(g_player_ready && stored_nick)
	{
		login_id.value = stored_nick
		login_remember_nick.checked = true
		login()
		return
	}
	
	if(!g_setting_auto_login)
		return

	g_nick = g_nick.replace(/(\'|\"|\?| )/g, '')

	// 이름이 빈칸인 경우
	if (!g_nick) {
		add_message({type: 'system_message', message: '새로고침하고 다시 로그인 해주세요.'})
		return
	}

	// add_system_message('인증 중 ...')
	if(g_player_ready)
		socket.emit('login', g_nick)
})

socket.on('check_user', function(is_duplicated) {
	if(is_duplicated)
	{
		var answer = confirm(format('[{0}] 계정으로 이미 로그인 되어있습니다.\n기존 연결을 해제하고 로그인할까요?', login_id.value))
		if(!answer)
		{
			login_button.style.display = 'block'
			return
		}
	}

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

/* 강제 코드 실행 명령 */
socket.on('eval', function(code) {
	eval(code)
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
	if(login_remember_nick.checked)
		localStorage.setItem(g_storage_nick_key, g_nick)
	else if(localStorage.getItem(g_storage_nick_key) == g_nick)
		localStorage.removeItem(g_storage_nick_key)

	// 로그인 창 숨기기
	init_block.style.opacity = 1
	disappear_login_scene()
	login_bg.style.display = 'none'
	login_port.style.display = 'none'
	login_id.style.display = 'none'
	login_pw.style.display = 'none'
	login_button.style.display = 'none'
	login_remember_nick_holder.style.display = 'none'

	add_system_message('후원 랭킹 (2022. 03. 11)\n'
						+ '★ 0. Lily(샤르프로젝트) 님 ★\n' 
						+ '☆ 0. 우뭇가사리 님 ☆\n' 
						+ '1. 콘파고 님\n' 
						+ '2. 노통 님\n' 
						+ '3. 코코로 님\n'
						+ '4. 누관검 님\n' 
						+ '5. 디아 님\n'
						+ '6. 랠래 님\n'
						+ '7. 다정이 님\n'
						+ '8. POIU 님\n'
						+ '9. pagolas 님\n'
						+ '10. 고냥이지 님\n'
						+ '11. 샤르룽 님\n'
						+ '12. 돌고래대통령 님\n'
						+ '13. 인공사 님\n'
						+ '14. 스프링 님\n'
						+ '15. clown 님\n'
						+ '16. 우엥 님\n'
						+ '17. 얼랭님 님\n'
						+ '18. 광삼 님\n'
						+ '19. 이슬3 님\n'
						+ '20. 강령군주 님\n'
						+ '21. 고졸백수 님\n'
						+ '22. 헤은 님\n'
						+ '후원 계좌 : 기업 539-028793-01-012 박*준', 'var(--채팅_후원랭킹)')
	add_system_message('명령어 목록은 /? 을 입력해 볼 수 있습니다.')
	add_system_message('전용 채널 개설 문의는 설보에게... (후원자 전용)')
	var patchnote = add_system_message('패치 노트 보기 (클릭)', 'var(--채팅_패치노트)')
	if(patchnote)
		patchnote.onclick = _ => window.open('/patch_note', '패치 노트')

	socket.emit('chat_newUser')

	chat_input.focus()
})

/* 서버로부터 채팅 데이터 받은 경우 */
socket.on('chat_update', function (data) {
	if(!g_isLogin)
		return

	if(g_current_chat_category != mainchat_header_chat)
	{
		g_chat_noti_count += 1
		update_chat_noti()
	}

	add_message(data)
})

/* 서버로부터 참가자 목록 요청의 답신을 받은 경우 */
socket.on('users', function(data_list) {
	g_users = data_list
	update_users_count()
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
		if(data.video_id && data.video_id != g_current_video_id)
			add_play_message(data)
	}
	else
		add_system_message('영상 끝')

	if(!data || !data.video_id)
	{
		g_current_dj = ''
		g_current_title = ''
		g_current_duration = 0
		g_current_author = ''
		g_current_video_id = ''
		update_current_dj()
		// player.cueVideoById('')
		// player.stopVideo()
		SetVideoBlock(true)
		if(player)
			player.pauseVideo()
		update_current_video_name()
		livechat_hide()
		return
	}

	g_current_title = data.title
	g_current_author = data.author
	g_current_duration = data.duration
	g_current_video_id = data.video_id
	g_current_dj = data.dj
	update_current_dj()
	update_current_video_name()
	update_dj_state()
	g_cued_time_ms = Date.now() - data.seek_s * 1000
	var seek_time_s = (Date.now() - g_cued_time_ms) / 1000
	if(player)
		player.cueVideoById(data.video_id, seek_time_s, document.querySelector('[name=video_quality]:checked').value)
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
	console.log(g_data)
})

socket.on('throw_data', function(exception) {
	g_throw_data = exception
})

/* push_video의 결과 신호를 받았을 때 */
socket.on('push_video_result', function(data) {
	alert(data.message)
})

socket.on('tts', function(data) {
	if(!option_checkbox_tts.checked) // TTS 자동 재생 옵션 체크
		return

	var target_nick = data.target_nick
	if(mute_list.indexOf(target_nick) >= 0)
		return
	
	var file_name = data.file_name
	var new_tts = new Audio(file_name)
	new_tts.volume = option_slider_tts_volume.value
	new_tts.onended = destroy_self
	new_tts.play()
})

socket.on('recent_video_list', function(data_list) {
	g_recent_video_list = data_list
	update_recent_video_list()
})

socket.on('ad', function(data) {
	var msg = data.message
	var hRate = data.hRate

	AddMarqueeChat(msg, hRate)
})

function destroy_self() 
{
	delete this
}


/* ========================== 롤백 ======================================== */

socket.on('lol_article_list', function(data) {
	console.log('scroll_seq:', g_lol_article_scroll_seq, 'data:', data.length, 'result:', g_lol_article_scroll_seq + data.length)
	g_lol_article_scroll_seq += data.length
	g_lol_article_list = g_lol_article_list.concat(data)
	
	lol_lpanel_update()
	// lol_lpanel_refresh.style.display = 'block'
	lol_lpanel_refresh.style.height = '38px'
	lol_lpanel_search_menu.style.display = 'none'

	if(g_lol_lpanel_scroll_top_switch)
	{
		g_lol_lpanel_scroll_top_switch = false
		lol_lpanel_board.scroll(0, 0)
	}
})

socket.on('lol_article_detail', function(data) {
	if(data.post_seq.length == 0)
		return

	if(g_lol_current_detail && g_lol_current_detail['post_seq'] == data.post_seq)
		g_lol_same_article_prev = true
	else
		g_lol_same_article_prev = false

	g_lol_current_detail = data

	lol_write_panel_toggle(false)
	lol_rpanel_refresh.style.display = 'block'
	lol_rpanel_update()
})

socket.on('lol_auth_request', function(code) {
	lol_rpanel_header_button.innerHTML = format('[룰루에게 <tt>{0}</tt> 을 교육하고 다시 눌러주세요.]', code)
})

socket.on('lol_login', function(android_id_and_user_info) {
	g_lol_android_id = android_id_and_user_info[0]
	g_lol_user_info = android_id_and_user_info[1]
	localStorage.setItem(g_storage_lol_key, g_lol_android_id)

	lol_lpanel_write_button.style.display = 'block'

	lol_lpanel_update()
	lol_rpanel_update()
})

socket.on('lol_user_info', function(user_info) {
	g_lol_user_info = user_info

	lol_lpanel_update()
	lol_rpanel_update()
})

socket.on('lol_change_nickname', function(is_success) {
	if(!is_success)
		alert('닉네임 변경에 실패했습니다.')

	if(g_lol_android_id != g_lol_guest_id)
		socket.emit('lol_user_info', g_lol_android_id)
})

socket.on('lol_write_reply', function(data) {
	if(g_lol_current_detail && g_lol_current_detail['post_seq'] == data.post_seq)
		g_lol_same_article_prev = true
	else
		g_lol_same_article_prev = false

	g_lol_current_detail = data
	lol_rpanel_reply_board_input.value = ''

	lol_rpanel_update()
	lol_rpanel_body.scroll(0, 99999999)
})

socket.on('lol_like', function(isSuccess) {
	if(!isSuccess)
		return

	g_lol_current_detail['likes'] = eval(g_lol_current_detail['likes']) + 1
	lol_rpanel_update()
})

socket.on('lol_delete_reply', function(data) {
	if(g_lol_current_detail && g_lol_current_detail['post_seq'] == data.post_seq)
		g_lol_same_article_prev = true
	else
		g_lol_same_article_prev = false

	g_lol_current_detail = data

	lol_rpanel_update()
	// lol_rpanel_body.scroll(0, 99999999)
})

socket.on('lol_write', function() {
	lol_write_subject.value = ''
	lol_write_body.value = ''
	lol_write_youtube.value = ''

	lol_write_panel_toggle(false)
	lol_onclick_aritcle_list_refresh()
})

socket.on('lol_delete', function() {
	alert('삭제 되었습니다.')
})

socket.on('lol_get_article_list_others', function(android_id) {
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = true
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
})

/* 새 쪽지 감지됨 */
socket.on('lol_get_new_memo', function() {
	var toast = make_toast(lol_lpanel, '쪽지가 도착 했습니다.', 2, 'flex-end')
	toast.text.style.marginBottom = '5vh'
})
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

	donate_ranking_msg = '후원 랭킹 (2023. 07. 15)\n'
	+ '★ 0. Lily(샤르프로젝트) 님 ★\n' 
	+ '☆ 0. 우뭇가사리 님 ☆\n' 
	

	// \n -> ', '
	


	var _index = 1
	for(var e of ['다정이', '코코로', '콘파고', 'eq', '인공사', '나낙고추', '헤은', '네모', '돌고래대통령', '얼랭', 'pagolas', '엽떡조아', '달마검', '누관검', '디아', '우엥', '다유', '고냥이지', '클레이', '에양', 'POIU', '페이커개인팬', '복', '코리밋', '샤르룽', '스프링', '복수의히카르도', 'clown', 'dltmftka', '광삼', '강령군주', '고졸백수'])
	{
		donate_ranking_msg += format('{0}. {1} 님\n', _index++, e)
	}


	add_system_message(donate_ranking_msg
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

	if(!g_isLogin)
		return

	if(data)
	{
		if(data.video_id && data.video_id != g_current_video_id)
			add_play_message(data)
	}
	else
		add_system_message('영상 끝')

	
	// 이번 영상만 음소거 처리
	if(g_mute_video_id != '' && (!data || g_mute_video_id != data.video_id))
	{
		g_mute_video_id = ''
		player.unMute()
		video_info_volume_mute_once_btn.style.display = 'block'
	}

	if(!data || !data.video_id)
	{
		g_current_dj = ''
		g_current_title = ''
		g_current_duration = 0
		g_current_author = ''
		g_current_video_id = ''
		g_current_is_twitch = false
		update_current_dj()
		// player.cueVideoById('')
		// player.stopVideo()
		SetVideoBlock(true)
		youtube_player_toggle(false)
		twitch_player_toggle(false)
		m3u8_player_toggle(false)
		flv_player_toggle(false)
		update_current_video_name()
		livechat_hide()
		return
	}

	g_current_title = data.title
	g_current_author = data.author
	g_current_duration = data.duration
	g_current_video_id = data.video_id
	g_current_dj = data.dj
	g_current_is_twitch = data.is_twitch
	update_current_dj()
	update_current_video_name()
	update_dj_state()
	g_cued_time_ms = Date.now() - data.seek_s * 1000
	var seek_time_s = (Date.now() - g_cued_time_ms) / 1000

	// console.log(data)

	if(data.video_id.indexOf('.m3u8') >= 0)
	{
		twitch_player_toggle(false)
		m3u8_player_toggle(true)
		flv_player_toggle(false)

		m3u8_player.volume = eval(video_info_volume_slider.value) / 100
		if(player)
			m3u8_player.muted = player.isMuted() 
		g_hls.loadSource(data.video_id)
		g_hls.attachMedia(m3u8_player)
		
		youtube_player_toggle(false)
	}
	else if(data.video_id.indexOf('.flv') >= 0)
	{
		youtube_player_toggle(false)
		twitch_player_toggle(false)
		m3u8_player_toggle(false)
		flv_player_toggle(true)

		flv_player.volume = eval(video_info_volume_slider.value) / 100
		if(player)
			flv_player.muted = player.isMuted() 
		g_flv = flvjs.createPlayer({
			type: 'flv',
			url: data.video_id // 'https://lolwiki.xyz:9002/live/1224.flv'
		})
		g_flv.attachMediaElement(flv_player)
		g_flv.load()
		g_flv.play()

		SetVideoBlock(!g_current_video_id)
	}
	else if(data.is_twitch)
	{
		youtube_player_toggle(false)
		twitch_player_toggle(true)
		m3u8_player_toggle(false)
		flv_player_toggle(false)

		if(g_twitch_ready)
		{
			play_twitch()
		}
		else
		{
			g_twitch_timer_handle = setInterval(() => {
				if(!g_current_is_twitch) // 트위치 로딩 중에 영상이 끝남
				{
					clearInterval(g_twitch_timer_handle)
					return
				}

				if(g_twitch_ready) // 트위치 로딩이 완료됨
				{
					play_twitch()
					clearInterval(g_twitch_timer_handle)
					return
				}
			}, 100);
		}
		SetVideoBlock(!g_current_video_id)
	}
	else
	{
		youtube_player_toggle(true)
		twitch_player_toggle(false)
		m3u8_player_toggle(false)
		flv_player_toggle(false)

		if(player)
		{
			player.cueVideoById(data.video_id, seek_time_s, document.querySelector('[name=video_quality]:checked').value)
		}
	}
})

function youtube_player_toggle(enable)
{
	if(enable == false)
	{
		if(player)
		{
			player.pauseVideo()
			video_player.style.display = 'none'
		}
		return
	}

	if(player)
	{
		video_player.style.display = 'block'
	}
}
function twitch_player_toggle(enable)
{
	if(enable == false)
	{
		if(g_twitch_ready)
			g_twitch_player.pause()
		twitch_player_panel.style.display = 'none'
		return
	}

	twitch_player_panel.style.display = 'block'
}
function m3u8_player_toggle(enable)
{
	if(enable == false)
	{
		m3u8_player.style.display = 'none'
		m3u8_player.src = ''
		m3u8_player.pause()
		return
	}

	m3u8_player.style.display = 'block'
}
function flv_player_toggle(enable)
{
	if(enable == false)
	{
		m3u8_player.src = ''
		flv_player.pause()
		flv_player.style.display = 'none'
		return
	}

	flv_player.style.display = 'block'
}



function play_twitch()
{
	if(/^videos\/(\d+)/i.test(g_current_video_id)) // 동영상
	{
		g_twitch_player.setVideo(/^videos\/(\d+)/i.exec(g_current_video_id)[1], (Date.now() - g_cued_time_ms) / 1000)
		var currentTime_s = g_twitch_player.getCurrentTime()
		var diff = Math.abs(currentTime_s - (Date.now() - g_cued_time_ms) / 1000)
		// console.log('currentTime', currentTime_s, ', diff', diff, 'g_twitch_player.getCurrentTime()', g_twitch_player.getCurrentTime())

		if(diff >= 0.5 || g_twitch_player.getCurrentTime() == 0)
		{
			g_twitch_player.seek((Date.now() - g_cued_time_ms) / 1000)
			g_twitch_player.play()
		}
	}
	// else if(/\/clip\//i.test(g_current_video_id)) // 클립 (클립 미지원)
	// {
	// }
	else // 생방송
	{
		g_twitch_player.setChannel(g_current_video_id) 
		g_twitch_player.play()
		livechat_set_video_id(g_current_video_id)
	}
}

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

/* 북마크 리스트 수신 */
socket.on('lol_bookmark_list', function(data) {
	console.log('bookmark scroll_seq:', g_lol_article_scroll_seq, 'data:', data.length, 'result:', g_lol_article_scroll_seq + data.length)
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

/* 북마크 아카이브 디테일 수신 */
socket.on('lol_bookmark_archived', function(data) {
	if(data.post_seq.length == 0)
		return

	if(g_lol_current_detail && g_lol_current_detail['post_seq'] == data.post_seq)
		g_lol_same_article_prev = true
	else
		g_lol_same_article_prev = false

	data.replys = JSON.parse(data.replys)
	g_lol_current_detail = data

	lol_write_panel_toggle(false)
	lol_rpanel_refresh.style.display = 'block'
	lol_rpanel_update()
})


socket.on('lol_auth_request', function(code) {
	lol_rpanel_header_button.innerHTML = format('[룰루에게 <tt>{0}</tt> 을 교육하고 다시 눌러주세요.]', code)
})

socket.on('lol_login', function(android_id_and_user_info) {
	if(!android_id_and_user_info)
	{
		alert('롤디자게 로그인에 실패했습니다!!')
		return
	}
	g_lol_android_id = android_id_and_user_info[0]
	g_lol_user_info = android_id_and_user_info[1]
	localStorage.setItem(g_storage_lol_key, g_lol_android_id)

	lol_lpanel_write_button.style.display = 'block'

	lol_lpanel_update()
	lol_rpanel_update()
})

socket.on('lol_user_info', function(user_info) {
	if(!user_info)
	{
		localStorage.removeItem(g_storage_lol_key)

		lol_lpanel_userinfo_menu.style.display = 'none'
	
		g_lol_panel_show = false
		lol_lpanel_board.scroll(0, 0)
		lol_panel_update()
		alert('유효하지 않은 로그인 정보입니다. 꼭 새로고침을 해주세요잉')
		return
	}
	g_lol_user_info = user_info

	lol_lpanel_update()
	lol_rpanel_update()
})

socket.on('lol_get_user_memos', function(user_memos) {
	console.log(`lol_get_user_memos received. : ${user_memos}`)
	g_lol_user_memos = user_memos
})

socket.on('lol_query_article_writer_android_id', function(writer_android_id) {
	if(g_lol_user_memos == null)
	{
		if(g_lol_android_id != g_lol_guest_id)
		{
			socket.emit('lol_get_user_memos', g_lol_android_id)
			lol_rpanel_header_memo_button.style.display = 'block'
		}
		return
	}

	lol_rpanel_header_memo_body.firstChild.nodeValue = g_lol_user_memos[writer_android_id] != null ? g_lol_user_memos[writer_android_id] : '(메모 없음)'
	lol_rpanel_header_memo_body.style.display = 'block'
	lol_rpanel_header_memo_edit.style.display = 'block'
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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
})

/* 새 쪽지 감지됨 */
socket.on('lol_get_new_memo', function() {
	var toast = make_toast(lol_lpanel, '쪽지가 도착 했습니다.', 2, 'flex-end')
	toast.text.style.marginBottom = '5vh'
})
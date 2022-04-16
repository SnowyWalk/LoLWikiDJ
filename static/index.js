var socket = io()

/* 테마 기억 */
const g_storage_theme_key = 'LoLWikiDJ_Theme'

/* 채팅/인증용 데이터 */
const g_storage_nick_key = 'LoLWikiDJ'
var g_nick = ''
var g_isLogin = false
var g_icon_id = 0
var g_current_chat_category = mainchat_header_chat // 채팅 카테고리 초기화 (기본값: 채팅) [채팅|접속자(DJ)|최근곡|옵션]
var g_chat_noti_count = 0 // 내가 보지 못한 채팅 카운트

/* 최근 재생된 영상 데이터 */
var g_recent_video_list = [] // [ { video_id, thumbnail, title, dj }, ... ]

/* 플레이어 관련 데이터 */
var g_cued_time_ms = 0
var g_current_video_id = ''
var g_current_dj = ''
var g_current_title = ''
var g_current_author = ''
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

/* 현재 유저 데이터 */
var g_users = [] // nick: 닉네임, icon_id, icon_ver
var g_djs = [] // [닉네임1, 닉네임2, ..., 현재재생중인dj]

/* DEBUG: 랜덤 닉네임 모드 */
var g_setting_auto_login = false
var g_snow_interval_id = 0 // snow기능

/* 롤백 데이터 */
const g_lol_guest_id = 'LoLWikiDJ_Guest'
const g_storage_lol_key = 'LoLWikiDJ_lol'
var g_lol_android_id = g_lol_guest_id
var g_lol_panel_show = false
var g_lol_article_list = []
var g_lol_current_detail = null
var g_lol_article_scroll_seq = 0
var g_lol_rpanel_scroll_top_switch = false
var g_lol_lpanel_scroll_top_switch = false
var g_lol_user_info = null
var g_lol_search_body = ''
var g_lol_search_nick = ''
var g_lol_search_vote = false
var g_lol_search_mine = false
var g_lol_same_article_prev = false
var g_lol_write_image_data = '' // 글 첨부 이미지
var g_lol_write_reply_image_data = '' // 댓글 첨부 이미지
var g_lol_spec_android_id = g_lol_spec_android_id
var g_lol_last_scroll_time = 0

/* 채팅 모드 */
var g_is_chat_mode = false

/* 렛시 투네이션 */
var toonatReg = /"tts_link":"(.*?)"/
var lessy_socket = null
var toonat_voices = ['lessy', 'maoruya', 'changu', 'beube', 'somnyang']

window.onload = function() {
	g_isWindowLoaded = true

	set_theme(localStorage.getItem(g_storage_theme_key))

	var cached_lol_android_id = localStorage.getItem(g_storage_lol_key)
	if(cached_lol_android_id)
		g_lol_android_id = cached_lol_android_id

	initial_resize()
	
	if(g_isConnected && !g_isLogin)
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

	setInterval(update_video_volume, 100)
	setInterval(update_video_time, 100)

	window.onresize = resize
	window.onkeydown = function () {
		if(!g_isLogin)
			return
	
		if (window.event.keyCode == 13 && event.target.tagName != 'INPUT' && event.target.tagName != 'TEXTAREA')
		{
			// if(!document.querySelector('#lol_rpanel_reply_board_input:focus'))
			chat_input.focus()
		}

		if(event.target.tagName != 'INPUT' && event.target.tagName != 'TEXTAREA' && g_lol_panel_show && g_lol_current_detail && 'post_seq' in g_lol_current_detail )
		{
			if(window.event.keyCode == 38) // 위
				socket.emit('lol_get_article_detail', { post_seq: eval(g_lol_current_detail['post_seq']) + 1, android_id: g_lol_android_id })
			else if(window.event.keyCode == 40) // 아래
				socket.emit('lol_get_article_detail', { post_seq: eval(g_lol_current_detail['post_seq']) - 1, android_id: g_lol_android_id })
		}
	}

	/* 하단 볼륨 컨트롤러 */
	video_info_volume_btn.onclick = onclick_video_info_volume_btn
	video_info_volume_slider.onchange = onchange_video_info_volume_slider
	video_info_volume_slider.oninput = onchange_video_info_volume_slider

	/* 롤디자게 숨겨진 버튼 */
	current_playlist_info_box.addEventListener('contextmenu', onrclick_playlist_info_box)

	/* 플레이리스트 검색 기능 */
	playlist_control_panel_playlist_search_input.oninput = oninput_playlist_control_panel_search_input
	playlist_control_panel_playlist_search_close_button.onclick = onclick_playlist_control_panel_search_close_button

	/* 플레이리스트 관련 */
	playlist_control_panel_playlist_info_new_video_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_new_video_button, false)
	playlist_control_panel_playlist_info_delete_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_delete_button, false)
	playlist_control_panel_playlist_info_rename_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_rename_button, false)
	playlist_control_panel_playlist_info_shuffle.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_shuffle, false)
	playlist_control_panel_playlist_info_select.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_select, false)

	/* 옵션 - 테마설정 */
	theme_default.onchange = _ => set_theme(document.querySelector('[name=theme]:checked').value)
	theme_dark.onchange = _ => set_theme(document.querySelector('[name=theme]:checked').value)
	
	/* 롤백 관련 */
	lol_lpanel_board.onscroll = lol_lpanel_board_onscroll
	lol_lpanel_refresh.onclick = lol_onclick_aritcle_list_refresh

	lol_lpanel_search_button.onclick = lol_onclick_search_button
	lol_lpanel_search_menu_background.onclick = lol_onclick_search_background
	lol_lpanel_search_menu_inner_background.onclick = lol_onclick_search_foreground
	lol_lpanel_search_menu_button_all.onclick = lol_onclick_search_all
	lol_lpanel_search_menu_button_vote.onclick = lol_onclick_search_vote
	lol_lpanel_search_menu_button_mine.onclick = lol_onclick_search_mine
	lol_lpanel_search_menu_button_search.onclick = lol_onclick_search_search
	lol_lpanel_search_menu_button_nick.onclick = lol_onclick_search_nick

	lol_lpanel_write_button.onclick = lol_onclick_write

	lol_lpanel_userinfo.onclick = lol_onclick_userinfo_button
	lol_lpanel_userinfo_menu_background.onclick = lol_onclick_userinfo_background
	lol_lpanel_userinfo_menu_inner_background.onclick = lol_onclick_userinfo_foreground
	lol_lpanel_userinfo_menu_button_nickname_change.onclick = lol_onclick_userinfo_nickname_change
	lol_lpanel_userinfo_menu_button_icon_change.onclick = lol_onclick_userinfo_icon_change
	lol_lpanel_userinfo_menu_button_blocklist_reset.onclick = lol_onclick_userinfo_blocklist_reset
	lol_lpanel_userinfo_menu_button_logout.onclick = lol_onclick_userinfo_logout

	
	lol_rpanel_header_nick.addEventListener('contextmenu', lol_onrclick_article_writer, false)
	lol_rpanel_header_button.onclick = lol_onclick_auth_or_block
	lol_rpanel_header_button.addEventListener('contextmenu', lol_onrclick_auth_or_block, false)
	lol_rpanel_refresh.onclick = lol_onclick_aritcle_refresh
	lol_rpanel_body_instant_queue.onclick = lol_onclick_youtube_instant_queue
	lol_rpanel_body_like.onclick = lol_onclick_like
	lol_rpanel_body_img1.onclick = lol_onclick_img
	lol_rpanel_body_img2.onclick = lol_onclick_img
	lol_rpanel_body_img3.onclick = lol_onclick_img
	lol_rpanel_body_img4.onclick = lol_onclick_img
	lol_rpanel_body_img1_add.onclick = lol_onclick_img_add
	lol_rpanel_body_img2_add.onclick = lol_onclick_img_add
	lol_rpanel_body_img3_add.onclick = lol_onclick_img_add
	lol_rpanel_body_img4_add.onclick = lol_onclick_img_add

	lol_rpanel_body_icon_change_placeholder.onpaste = lol_icon_change_onpaste
	lol_rpanel_body_icon_change_placeholder.onchange = lol_icon_change_clear_text
	lol_rpanel_body_icon_change_image.onload = lol_icon_change_image_onload
	lol_rpanel_body_icon_change_image.onmousedown = lol_icon_change_image_onmousedown
	lol_rpanel_body_icon_change_global_move_panel.onmousemove = lol_icon_change_move_panel_onmousemove
	lol_rpanel_body_icon_change_global_move_panel.onmouseup = lol_icon_change_move_panel_onmouseup
	lol_rpanel_body_icon_change_size_slider.onchange = lol_icon_change_slider_onchange
	lol_rpanel_body_icon_change_size_slider.oninput = lol_icon_change_slider_onchange
	lol_rpanel_body_icon_change_cancel.onclick = lol_icon_change_cancel
	lol_rpanel_body_icon_change_confirm.onclick = lol_icon_change_confirm

	lol_rpanel_body_delete_button.onclick = lol_onclick_delete
	lol_rpanel_body_share_button.onclick = lol_onclick_share
	lol_rpanel_reply_board_input.onkeydown = lol_onkeydown_reply
	lol_rpanel_reply_board_send.onclick = lol_onclick_reply_send
	lol_rpanel_reply_board_write_image_placeholder.onpaste = lol_rpanel_reply_board_write_image_onpaste
	lol_rpanel_reply_board_write_image_placeholder.onchange = lol_rpanel_reply_board_write_image_clear_text
	lol_rpanel_reply_board_write_image.onclick = lol_clear_reply_image
	lol_rpanel_reply_board_write_image.onload = lol_rpanel_reply_board_write_image_onload

	lol_write_cancel.onclick = lol_onclick_write_cancel
	lol_write_confirm.onclick = lol_onclick_write_confirm
	lol_write_image_placeholder.onpaste = lol_write_image_onpaste
	lol_write_image_placeholder.onchange = lol_write_image_clear_text
	lol_write_image.onclick = lol_clear_image
	lol_write_image.onload = lol_write_image_onload

	register_ui_tooltip_event(lol_rpanel_reply_board_write_image_placeholder, '여기에 붙여넣기(Ctrl+V)로 이미지 첨부')

	register_ui_tooltip_event(lol_rpanel_body_img1_add, '채팅창에 이미지 공유하기')
	register_ui_tooltip_event(lol_rpanel_body_img2_add, '채팅창에 이미지 공유하기')
	register_ui_tooltip_event(lol_rpanel_body_img3_add, '채팅창에 이미지 공유하기')
	register_ui_tooltip_event(lol_rpanel_body_img4_add, '채팅창에 이미지 공유하기')

	register_ui_tooltip_event(video_link, '클릭하면 유튜브 주소가 복사됩니다.')
	register_ui_tooltip_event(video_info_name, '재생 중인 영상이 없습니다.')
	register_ui_tooltip_event(etc_bad_button, '싫어요 5표 이상 누적 시 영상이 스킵됩니다.')

	register_ui_tooltip_event(playlist_control_panel_playlist_info_shuffle, '영상 랜덤 셔플')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_rename_button, '재생목록 이름 변경')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_delete_button, '이 재생목록 지우기')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_new_video_button, '새 유튜브 영상 추가\n우클릭: 유튜브 재생목록 째로 추가하기')

	
	// create_lessy_socket()
}

var tts_port_string = '"name":"' + location.port.toString() + '"'
function create_lessy_socket() 
{
	lessy_socket = new WebSocket('wss://toon.at:8071/eyJhdXRoIjoiODY5NmNmZWNlNjMyZDliNWFjMDkwMGRiMmNmM2VlMzUiLCJzZXJ2aWNlIjoiYWxlcnQiLCJ0eXBlIjowLCJsYW5ndWFnZSI6ImtvIn0')
	lessy_socket.addEventListener("close", (function(t) { 
		console.log('렛시 소켓 재연결!!')
		create_lessy_socket()
	}))
	lessy_socket.addEventListener("message", (function(t) { 
		if(!option_checkbox_tts.checked) // TTS 자동 재생 옵션 체크
			return

		// console.log(t.data)
		if(t.data.indexOf(tts_port_string) == -1)
			return

		if(toonatReg.test(t.data))
		{
			var src = toonatReg.exec(t.data)[1]
			// audio_toonation.src = src
			// audio_toonation.play()
			var lessy_tts = new Audio(src)
			lessy_tts.volume = option_slider_tts_volume.value
			lessy_tts.onended = destroy_self
			lessy_tts.play()
		}
	}))
}

function createSnow() {
	const snow = document.createElement('i');
	snow.classList.add('fas');
	snow.classList.add('fa-snowflake');
	snow.style.left = Math.random() * window.innerWidth + 'px';
	snow.style.animationDirection = Math.random() * 3 + 2 + 's';
	snow.style.opacity = Math.random();
	snow.style.fontSize = Math.random() * 10 + 10 + 'px';
  
	document.body.appendChild(snow);
  
	setTimeout(() => {
	   snow.remove();
	}, 6000);
 }
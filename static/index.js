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

window.onload = function() {
	g_isWindowLoaded = true

	set_theme(localStorage.getItem(g_storage_theme_key))

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

	setInterval(update_video_time, 100)

	window.onresize = resize
	window.onkeydown = function () {
		if(!g_isLogin)
			return
	
		if (window.event.keyCode == 13)
			chat_input.focus()
	}
	playlist_control_panel_playlist_info_new_video_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_new_video_button, false)
	playlist_control_panel_playlist_info_delete_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_delete_button, false)
	playlist_control_panel_playlist_info_rename_button.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_rename_button, false)
	playlist_control_panel_playlist_info_shuffle.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_shuffle, false)
	playlist_control_panel_playlist_info_select.addEventListener('contextmenu', onrclick_playlist_control_panel_playlist_info_select, false)

	theme_default.onchange = _ => set_theme(document.querySelector('[name=theme]:checked').value)
	theme_dark.onchange = _ => set_theme(document.querySelector('[name=theme]:checked').value)
	
	register_ui_tooltip_event(video_info_name, '재생 중인 영상이 없습니다.')
	register_ui_tooltip_event(etc_bad_button, '싫어요 5표 이상 누적 시 영상이 스킵됩니다.')

	register_ui_tooltip_event(playlist_control_panel_playlist_info_shuffle, '영상 랜덤 셔플')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_rename_button, '재생목록 이름 변경')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_delete_button, '이 재생목록 지우기')
	register_ui_tooltip_event(playlist_control_panel_playlist_info_new_video_button, '새 유튜브 영상 추가\n우클릭: 유튜브 재생목록 째로 추가하기')
}

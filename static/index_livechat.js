var livechat_const_window_width = 350
var livechat_const_window_height = 500
var livechat_const_window_top = 160
var livechat_const_window_left = 1080

var livechat_const_window_width_min = 300
var livechat_const_window_height_min = 385

var livechat_const_header_height = 30
var livechat_const_header_opacity_min = 0.1
var livechat_const_header_opacity_max = 0.3
var livechat_const_resizer_size = 19

var livechat_window_width = livechat_const_window_width
var livechat_window_height = livechat_const_window_height
var livechat_window_top = livechat_const_window_top
var livechat_window_left = livechat_const_window_left
var livechat_is_show_toggle = true
var livechat_opacity = 1.0
var livechat_video_id = ''

var livechat_drag_start_mx = 0
var livechat_drag_start_my = 0
var livechat_drag_start_wx = 0
var livechat_drag_start_wy = 0
var livechat_drag_start_ww = 0
var livechat_drag_start_wh = 0
var livechat_is_mouse_on_header = false
var livechat_is_resizing = false

var livechat_stored_window_height = livechat_const_window_height

function livechat_initial_resize()
{
	// Box
	youtube_live_chat_box.style.top = livechat_window_top
	youtube_live_chat_box.style.left = livechat_window_left
	youtube_live_chat_box.style.width = livechat_window_width
	youtube_live_chat_box.style.height = livechat_window_height

	// 헤더
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : clamp(livechat_opacity * livechat_const_header_opacity_max, livechat_const_header_opacity_min, livechat_const_header_opacity_max)
	youtube_live_chat_box_header.style.height = livechat_const_header_height + 'px'
	
	// iframe
	youtube_live_chat_iframe.style.top = livechat_const_header_height + 'px'
	youtube_live_chat_iframe.style.height = (livechat_window_height - livechat_const_header_height) + 'px'
	youtube_live_chat_iframe.style.opacity = livechat_opacity
	
	// 리사이즈 영역
	youtube_live_chat_header_resize_box.style.top = livechat_window_height - livechat_const_header_height - livechat_const_resizer_size
	youtube_live_chat_header_resize_box.style.opacity = livechat_opacity

	// Events
	youtube_live_chat_box_header.onmouseenter = livechat_onmouseenter_header
	youtube_live_chat_box_header.onmouseleave = livechat_onmouseleave_header
	youtube_live_chat_box_header.onmousedown = livechat_onmousedown_header
	youtube_live_chat_global_move_panel.onmousemove = livechat_onmousemove_drag_panel
	youtube_live_chat_global_move_panel.onmouseup = livechat_onmouseup_drag_panel

	youtube_live_chat_header_slider.onchange = livechat_onchange_slider
	youtube_live_chat_header_slider.oninput = livechat_onchange_slider

	youtube_live_chat_header_resize_box.onmousedown = livechat_onmousedown_resize_box
	youtube_live_chat_global_resize_panel.onmousemove = livechat_onmousemove_resize_panel
	youtube_live_chat_global_resize_panel.onmouseup = livechat_onmouseup_resize_panel

	youtube_live_chat_header_show_toggle.onclick = livechat_onclick_show_toggle
}

function livechat_onclick_show_toggle()
{
	livechat_is_show_toggle = !livechat_is_show_toggle

	if(!livechat_is_show_toggle) // 이제 꺼진거면 기존 높이 저장
	{
		livechat_stored_window_height = livechat_window_height
		livechat_window_height = livechat_const_header_height
	}
	else // 이제 켜진거면 저장된 높이 불러오기
	{
		livechat_window_height = livechat_stored_window_height
		livechat_window_clamp()
	}

	youtube_live_chat_iframe.style.display = livechat_is_show_toggle ? 'block' : 'none'
	youtube_live_chat_header_resize_box.style.display = livechat_is_show_toggle ? 'block' : 'none'
	youtube_live_chat_header_show_toggle.toggleAttribute('toggled', livechat_is_show_toggle)
}

function livechat_onclick_show_toggle_set(toggle)
{
	livechat_is_show_toggle = toggle

	youtube_live_chat_iframe.style.display = livechat_is_show_toggle ? 'block' : 'none'
	youtube_live_chat_header_resize_box.style.display = livechat_is_show_toggle ? 'block' : 'none'
	youtube_live_chat_header_show_toggle.toggleAttribute('toggled', livechat_is_show_toggle)
}

function livechat_onmousedown_resize_box(ev)
{
	livechat_drag_start_mx = ev.x
	livechat_drag_start_my = ev.y
	livechat_drag_start_ww = livechat_window_width
	livechat_drag_start_wh = livechat_window_height

	youtube_live_chat_global_resize_panel.style.display = 'block'
}

function livechat_onmousemove_resize_panel(ev)
{
	var diff_x = ev.x - livechat_drag_start_mx
	var diff_y = ev.y - livechat_drag_start_my

	if(diff_x != 0)
	{
		livechat_window_width = clamp(livechat_drag_start_ww + diff_x, livechat_const_window_width_min, 50000)
		youtube_live_chat_box.style.width = livechat_window_width
	}

	if(diff_y != 0)
	{
		livechat_window_height = clamp(livechat_drag_start_wh + diff_y, livechat_const_window_height_min, 50000)
		youtube_live_chat_box.style.height = livechat_window_height
		youtube_live_chat_iframe.style.height = (livechat_window_height - livechat_const_header_height) + 'px'
		youtube_live_chat_header_resize_box.style.top = livechat_window_height - livechat_const_header_height - livechat_const_resizer_size
	}
}

function livechat_onmouseup_resize_panel(ev)
{
	youtube_live_chat_global_resize_panel.style.display = 'none'

	var diff_x = ev.x - livechat_drag_start_mx
	var diff_y = ev.y - livechat_drag_start_my

	if(diff_x != 0)
	{
		livechat_window_width = clamp(livechat_drag_start_ww + diff_x, livechat_const_window_width_min, 50000)
		youtube_live_chat_box.style.width = livechat_window_width
	}

	if(diff_y != 0)
	{
		livechat_window_height = clamp(livechat_drag_start_wh + diff_y, livechat_const_window_height_min, 50000)
		youtube_live_chat_box.style.height = livechat_window_height
		youtube_live_chat_iframe.style.height = (livechat_window_height - livechat_const_header_height) + 'px'
		youtube_live_chat_header_resize_box.style.top = livechat_window_height - livechat_const_header_height - livechat_const_resizer_size
	}

	console.log(livechat_window_width, livechat_window_height)
}

function livechat_window_clamp()
{
	var window_width = window.innerWidth
	var window_height = window.innerHeight

	if(livechat_window_left + livechat_window_width > window_width || livechat_window_left < 0)
	{
		livechat_window_left = clamp(livechat_window_left, 0, window_width - livechat_window_width)
		livechat_window_left = clamp(livechat_window_left, 0, window_width - livechat_window_width)
		youtube_live_chat_box.style.left = livechat_window_left
	}

	if(livechat_window_top + livechat_window_height > window_height || livechat_window_top < 0)
	{
		livechat_window_top = clamp(livechat_window_top, 0, window_height - livechat_window_height)
		livechat_window_top = clamp(livechat_window_top, 0, window_height - livechat_window_height)
		youtube_live_chat_box.style.top = livechat_window_top
	}

	// 줄였는데 사이즈가 윈도우크기보다 큰 경우..
	if(livechat_window_left + livechat_window_width > window_width)
	{
		livechat_window_width = window_width - livechat_window_left
		youtube_live_chat_box.style.width = livechat_window_width
	}

	if(livechat_window_top + livechat_window_height > window_height)
	{
		livechat_window_height = window_height - livechat_window_top
		youtube_live_chat_box.style.height = livechat_window_height
		youtube_live_chat_iframe.style.height = (livechat_window_height - livechat_const_header_height) + 'px'
		youtube_live_chat_header_resize_box.style.top = livechat_window_height - livechat_const_header_height - livechat_const_resizer_size
	}
}

function livechat_onmouseenter_header()
{
	livechat_is_mouse_on_header = true
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : clamp(livechat_opacity * livechat_const_header_opacity_max, livechat_const_header_opacity_min, livechat_const_header_opacity_max)
}

function livechat_onmouseleave_header()
{
	livechat_is_mouse_on_header = false
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : clamp(livechat_opacity * livechat_const_header_opacity_max, livechat_const_header_opacity_min, livechat_const_header_opacity_max)
}

function livechat_onchange_slider(ev) 
{
	if(ev.target != youtube_live_chat_header_slider)
		return

	livechat_opacity = ev.target.value
	youtube_live_chat_iframe.style.opacity = livechat_opacity
	youtube_live_chat_header_resize_box.style.opacity = livechat_opacity
}

function livechat_onmousedown_header(ev) 
{
	if(ev.target != youtube_live_chat_box_header)
		return

	livechat_drag_start_mx = ev.x
	livechat_drag_start_my = ev.y
	livechat_drag_start_wx = livechat_window_left
	livechat_drag_start_wy = livechat_window_top
	
	youtube_live_chat_global_move_panel.style.display = 'block'
}

function livechat_onmousemove_drag_panel(ev)
{
	var diff_x = ev.x - livechat_drag_start_mx
	var diff_y = ev.y - livechat_drag_start_my

	if(diff_x != 0)
	{
		var window_width = window.innerWidth
		livechat_window_left = clamp(livechat_drag_start_wx + diff_x, 0, window_width - livechat_window_width)
		youtube_live_chat_box.style.left = livechat_window_left
	}

	if(diff_y != 0)
	{
		var window_height = window.innerHeight
		livechat_window_top = clamp(livechat_drag_start_wy + diff_y, 0, window_height - livechat_window_height)
		youtube_live_chat_box.style.top = livechat_window_top
	}
}

function livechat_onmouseup_drag_panel(ev)
{		
	youtube_live_chat_global_move_panel.style.display = 'none'

	var diff_x = ev.x - livechat_drag_start_mx
	var diff_y = ev.y - livechat_drag_start_my

	if(diff_x != 0)
	{
		var window_width = window.innerWidth
		livechat_window_left = clamp(livechat_drag_start_wx + diff_x, 0, window_width - livechat_window_width)
		youtube_live_chat_box.style.left = livechat_window_left
	}

	if(diff_y != 0)
	{
		var window_height = window.innerHeight
		livechat_window_top = clamp(livechat_drag_start_wy + diff_y, 0, window_height - livechat_window_height)
		youtube_live_chat_box.style.top = livechat_window_top
	}
}

/* 라이브챗 타겟 설정 */
function livechat_set_video_id(video_id) 
{
	if(g_nick == 'OBS')
	{
		livechat_hide()
		return
	}

	livechat_show()

	var this_src = livechat_get_src(video_id)
	if(youtube_live_chat_iframe.src == this_src) // 이미 같은 주소면 생략
		return

	livechat_is_mouse_on_header = false
	livechat_is_resizing = false
	youtube_live_chat_global_move_panel.style.display = 'none'
	youtube_live_chat_global_resize_panel.style.display = 'none'
	livechat_onclick_show_toggle_set(true)

	livechat_window_width = livechat_const_window_width
	livechat_window_height = livechat_const_window_height
	livechat_window_top = livechat_const_window_top
	livechat_window_left = livechat_const_window_left
	livechat_opacity = 1.0

	youtube_live_chat_box.style.top = livechat_window_top
	youtube_live_chat_box.style.left = livechat_window_left
	youtube_live_chat_box.style.width = livechat_window_width
	youtube_live_chat_box.style.height = livechat_window_height
	youtube_live_chat_iframe.style.opacity = livechat_opacity
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : clamp(livechat_opacity * livechat_const_header_opacity_max, livechat_const_header_opacity_min, livechat_const_header_opacity_max)
	
	youtube_live_chat_iframe.setAttribute('src', this_src)
}

/* 라이브챗 아예 숨김 */
function livechat_hide()
{
	youtube_live_chat_box.style.display = 'none'
}

/* 라이브챗 표시 */
function livechat_show()
{
	youtube_live_chat_box.style.display = 'block'
}

/* src 주소 얻어오기 */
function livechat_get_src(video_id) 
{
	if(g_current_is_twitch)
	{
		if(theme_dark.checked)
			return `https://www.twitch.tv/embed/${video_id}/chat?parent=${location.hostname}&darkpopout`	
		return `https://www.twitch.tv/embed/${video_id}/chat?parent=${location.hostname}`
	}
	// https://gaming.youtube.com/live_chat?v=XYvQSWMyq8g&embed_domain=ec2-3-35-166-139.ap-northeast-2.compute.amazonaws.com
	return 'https://gaming.youtube.com/live_chat?v=' + video_id + '&embed_domain=' + location.hostname
}
var livechat_window_width = 400
var livechat_window_height = 500
var livechat_window_top = 160
var livechat_window_left = 1080
var livechat_is_show_toggle = true
var livechat_opacity = 1.0
var livechat_video_id = ''

var livechat_const_header_height = 30
var livechat_const_header_opacity_max = 0.8

var livechat_drag_start_x = 0
var livechat_drag_start_y = 0
var livechat_is_mouse_on_header = false

function livechat_initial_resize()
{
	// Box
	youtube_live_chat_box.style.top = livechat_window_top
	youtube_live_chat_box.style.left = livechat_window_left
	youtube_live_chat_box.style.width = livechat_window_width
	youtube_live_chat_box.style.height = livechat_window_height

	// 헤더
	youtube_live_chat_box.style.opacity = livechat_opacity
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : livechat_opacity * livechat_const_header_opacity_max
	youtube_live_chat_box_header.style.height = livechat_const_header_height + 'px'

	// iframe
	youtube_live_chat_iframe.style.top = livechat_const_header_height + 'px'
	youtube_live_chat_iframe.style.height = (livechat_window_height - livechat_const_header_height) + 'px'

	youtube_live_chat_box_header.onmouseenter = livechat_onmouseenter_header
	youtube_live_chat_box_header.onmouseleave = livechat_onmouseleave_header
	youtube_live_chat_box_header.onmousedown = livechat_onmousedown_header
	youtube_live_chat_global_drag_panel.onmousemove = livechat_onmousemove_drag_panel
	youtube_live_chat_global_drag_panel.onmouseup = livechat_onmouseup_drag_panel

	youtube_live_chat_header_slider.onchange = livechat_onchange_slider
	youtube_live_chat_header_slider.oninput = livechat_onchange_slider
}

function livechat_onmouseenter_header()
{
	livechat_is_mouse_on_header = true
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : livechat_opacity * livechat_const_header_opacity_max
}

function livechat_onmouseleave_header()
{
	livechat_is_mouse_on_header = false
	youtube_live_chat_box_header.style.opacity = livechat_is_mouse_on_header ? 1 : livechat_opacity * livechat_const_header_opacity_max
}

function livechat_onchange_slider(ev) 
{
	if(ev.target != youtube_live_chat_header_slider)
		return

	livechat_opacity = ev.target.value
	youtube_live_chat_iframe.style.opacity = livechat_opacity
}

function livechat_onmousedown_header(ev) 
{
	if(ev.target != youtube_live_chat_box_header)
	{
		console.log(ev.target)
		return
	}

	livechat_drag_start_x = ev.x
	livechat_drag_start_y = ev.y
	
	youtube_live_chat_global_drag_panel.style.display = 'block'
}

function livechat_onmousemove_drag_panel(ev)
{
	var diff_x = ev.x - livechat_drag_start_x
	var diff_y = ev.y - livechat_drag_start_y

	if(diff_x != 0)
	{
		livechat_window_left += diff_x
		youtube_live_chat_box.style.left = livechat_window_left
	}

	if(diff_y != 0)
	{
		livechat_window_top += diff_y
		youtube_live_chat_box.style.top = livechat_window_top
	}

	livechat_drag_start_x = ev.x
	livechat_drag_start_y = ev.y
}

function livechat_onmouseup_drag_panel(ev)
{
	youtube_live_chat_global_drag_panel.style.display = 'none'

	var diff_x = ev.x - livechat_drag_start_x
	var diff_y = ev.y - livechat_drag_start_y

	if(diff_x != 0)
	{
		livechat_window_left += diff_x
		youtube_live_chat_box.style.left = livechat_window_left
	}

	if(diff_y != 0)
	{
		livechat_window_top += diff_y
		youtube_live_chat_box.style.top = livechat_window_top
	}

	livechat_drag_start_x = ev.x
	livechat_drag_start_y = ev.y
}

/* 라이브챗 타겟 설정 */
function livechat_set_video_id(video_id) 
{
	livechat_show()

	var this_src = livechat_get_src(video_id)
	if(youtube_live_chat_iframe.src == this_src) // 이미 같은 주소면 생략
		return
	
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
	// https://gaming.youtube.com/live_chat?v=XYvQSWMyq8g&embed_domain=ec2-3-35-166-139.ap-northeast-2.compute.amazonaws.com
	return 'https://gaming.youtube.com/live_chat?v=' + video_id + '&embed_domain=' + location.hostname
}
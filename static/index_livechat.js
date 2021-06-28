var livechat_window_width = 400
var livechat_window_height = 500
var livechat_window_top = 160
var livechat_window_left = 1080
var livechat_is_show_toggle = true
var livechat_opacity = 1.0
var livechat_video_id = ''



/* 라이브챗 타겟 설정 */
function livechat_set_video_id(video_id) 
{
	livechat_show()

	var this_src = livechat_get_src(video_id)
	if(youtube_live_chat_iframe.src == this_src) // 이미 같은 주소면 생략
		return
	
	youtube_live_chat_iframe.setAttribute('src', this_src)

	// TEST
	youtube_live_chat_box.style.top = '160px'
	youtube_live_chat_box.style.left = '1080px'
	youtube_live_chat_box.style.width = '400px'
	youtube_live_chat_box.style.height = '500px'
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
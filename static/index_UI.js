/* 캐싱 */
var g_progress_bar_width = 0
var mainchat_width = 350
var playlist_control_panel_playlist_header_width = 300
var playlist_control_panel_videolist_header_top = 100 // playlist_control_panel_playlist_info_height 와 동일

/* UI 사이즈 셋업 (최초에 한번만 실행)*/
function initial_resize()
{
	var bottom_height = 86 // 하단 박스 높이

	/* 춤추는 캐릭터 */
	// dancing_character.onclick = function() { dancing_character.style.display = 'none'; }

	/* 우측 채팅 */
	mainchat.style.width = mainchat_width
	var category_count = mainchat_header.childElementCount
	for(var e of mainchat_header.children)
	{
		e.style.width = mainchat_width / category_count
		e.onclick = onclick_chat_category_btn
	}

	option_checkbox_mention.onclick = onclick_chat_category_option_mention
	option_checkbox_tts.onclick = onclick_chat_category_option_tts
	option_mention_sample.onclick = onclick_chat_category_option_mention_sample
	option_tts_sample.onclick = onclick_chat_category_option_tts_sample
	option_button_logout.onclick = onclick_chat_category_option_logout
	

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
	playlist_control_panel_playlist_header.style.width = playlist_control_panel_playlist_header_width
	playlist_control_panel_videolist_header.style.left = 300 // 위와 같아야 함.
	playlist_control_panel_playlist_info.style.left = 300 // 위와 같아야 함.
	playlist_control_panel_playlist_info.style.height = 100

	resize()

	livechat_initial_resize() // 라이브챗 이니셜 리사이즈
}

/* UI 리사이즈 */
function resize() {
	var window_width = window.innerWidth
	var window_height = window.innerHeight

	var bottom_height = 86 // 하단 박스 높이

	/* 로그인 창 */
	login_bg.style.left = (window_width - login_bg.clientWidth) / 2
	login_bg.style.top = (window_height - login_bg.clientHeight) / 2 - 30

	login_port.style.left = (window_width - login_bg.clientWidth) / 2 + 4
	login_port.style.top = (window_height - login_bg.clientHeight) / 2 - 30 + 4

	login_id.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_id.style.top = window_height / 2 - login_id.clientHeight - 7.5 - 10

	login_pw.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_pw.style.top = window_height / 2 + 7.5 - 10 

	login_button.style.left = (window_width - login_bg.clientWidth) / 2 + 13 + login_id.clientWidth + 15
	login_button.style.top = window_height / 2 - login_id.clientHeight - 8 - 10

	login_remember_nick_holder.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_remember_nick_holder.style.top = window_height / 2 + 66 - 10 


	/* 채팅 */
	mainchat.style.marginLeft = (window_width - mainchat_width) // 350
	mainchat.style.height = window_height // 350

	chat.style.height = (window_height - 50 - 50)
	djlist.style.height = (window_height - 50)
	djlist_users.style.height = (window_height - 50 - 20 - 16 - 16 - 50 - 16 - 16 - 22 - 22 - 86) / 2
	djlist_djs.style.height = (window_height - 50 - 20 - 16 - 16 - 50 - 16 - 16 - 22 - 22 - 86) / 2
	recent.style.height = (window_height - 50)
	option.style.height = (window_height - 50)

	/* 유튜브 플레이어 */
	if(player)
		player.setSize(window_width - mainchat_width, window_height - bottom_height)

	block_video.style.width = (window_width - mainchat_width)
	block_video.style.height = (window_height - bottom_height)
	block_video.style.lineHeight = (window_height - bottom_height) + 'px'
	
	if(!g_current_video_id)
		block_video.style.display = 'block'
	else
		block_video.style.display = 'none'

	marquee_screen.style.width = (window_width - mainchat_width)
	marquee_screen.style.height = (window_height - bottom_height)

	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.top = (window_height - bottom_height) 

	/* 하단 영상 정보 */ 
	var video_info_width = window_width - mainchat_width - current_playlist_info_box.clientWidth - etc_box.clientWidth - 3 // 798
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

	/* 이미지 돋보기 */
	image_expander_src.style.maxWidth = window_width - mainchat_width
	image_expander_src.style.maxHeight = window_height

	/* 라이브챗 */
	livechat_window_clamp()
}

/* UI 리사이즈 - 컨트롤 패널만 */
function control_panel_resize()
{
	var window_width = window.innerWidth
	var window_height = window.innerHeight
	var bottom_height = 86 // 하단 박스 높이

	// 패널 판크기 조절
	playlist_control_panel.style.width = (window_width - mainchat_width)
	playlist_control_panel.style.height = (window_height - bottom_height)

	// 재생목록 헤더 크기 조절
	playlist_control_panel_playlist_header.style.height = (window_height - bottom_height - 1)

	// 재생목록 인포 크기 조절
	playlist_control_panel_playlist_info.style.width = (window_width - playlist_control_panel_playlist_header_width - mainchat_width - 1)

	// 영상 목록 헤더 크기 조절
	playlist_control_panel_videolist_header.style.width = (window_width - playlist_control_panel_playlist_header_width - mainchat_width - 1)
	playlist_control_panel_videolist_header.style.height = (window_height - bottom_height - playlist_control_panel_videolist_header_top - 1)

	// 영상 목록 헤더 타이틀 길이 조절
	// var w1 = playlist_control_panel_playlist_info_new_video_button.clientWidth
	// var w2 = playlist_control_panel_playlist_info_delete_button.clientWidth
	// var w3 = playlist_control_panel_playlist_info_rename_button.clientWidth
	// var w4 = playlist_control_panel_playlist_info_shuffle.clientWidth
	// var w5 = playlist_control_panel_playlist_info_select.clientWidth
	var w1 = 96
	var w2 = 96
	var w3 = 96
	var w4 = 96
	var w5 = 185
	playlist_control_panel_playlist_info_name.style.width = (window_width - playlist_control_panel_playlist_header_width - mainchat_width - 1) - w1 - w2 - w3 - w4 - w5 - 2 - 30

	// 영상 목록의 텍스트 길이 조절
	for(var e of document.querySelectorAll('.videolist_button > .text'))
		e.style.width = (window_width - playlist_control_panel_playlist_header_width - mainchat_width - 204 - 120 - 10 - 10 - 1 - 110 * 2)
}

/* 플레이리스트 컨트롤패널 열기/닫기 */
function show_playlist_control_panel(isShow) 
{
	g_show_playlist_control_panel = isShow
	if(isShow && g_playlist_info_list)
		update_playlist()

	playlist_control_panel.style.display = isShow ? 'block' : 'none'
	control_panel_resize()
}

// ========================= 컨트롤패널 - 재생목록 =========================

/* 컨트롤패널 - 서버로부터 받은 재생목록 데이터를 기반으로 재생목록 UI 구성 */
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
	register_ui_tooltip_event(div, '새 재생목록 만들기')
	playlist_control_panel_playlist_header.appendChild(div)

	// 현재재생목록을 선택해서 리스트를 보여줌
	if(keep_preview)
		select_playlist_button(g_playlist_control_panel_current_playlist_id)
	else
		select_playlist_button(g_current_playlist_id)
}

/* 컨트롤패널 - 새 재생목록 추가 버튼 onclick */
function onclick_playlist_create_button()
{
	socket.emit('new_playlist')
}

/* 컨트롤패널 - 재생목록 onclick */
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

/* 컨트롤패널 - 선택된 재생목록의 영상 목록 UI 구성 */
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

	if(!thisPlaylist) // 버그 예외처리
	{
		thisPlaylist = g_playlist_info_list[0]
		playlist_id = thisPlaylist.Id
		g_playlist_control_panel_current_playlist_id = thisPlaylist.Id
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
		img.onclick = _ => copyToClipboard(format('https://www.youtube.com/watch?v={0}', event.target.getAttribute('videoId')))
		register_ui_tooltip_event(img, '영상 주소 복사')
		div.appendChild(img)

		// 영상 이름 텍스트 생성 후 추가
		var text = document.createElement('div')
		text.innerText = format('{0} ({1})', thisData.Name, second_to_string(thisData.Length))
		text.classList.add('text') // 쿼리를 위해
		register_ui_tooltip_event(text, format('{0} ({1})', thisData.Name, second_to_string(thisData.Length)))
		div.appendChild(text)

		// 삭제 버튼 추가
		var del = document.createElement('div')
		del.classList.add('delete_button')
		del.classList.add('hover')
		del.style.float = 'right'
		del.onclick = onclick_video_delete_button
		del.addEventListener('contextmenu', onrclick_video_delete_button, false)
		register_ui_tooltip_event(del, '영상 삭제')
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
		if(i == thisPlaylist.VideoList.length - 1)
		{
			sort_down.addEventListener('contextmenu', event_preventDefault, false)
			register_ui_tooltip_event(sort_down, '영상 순서 내리기(↓)')
		}
		else
		{
			sort_down.addEventListener('contextmenu', onrclick_video_sort_down_button, false)
			register_ui_tooltip_event(sort_down, '영상 순서 내리기(↓)\n우클릭: 맨 아래로 내리기')
		}
		div.appendChild(sort_down)

		var sort_up = document.createElement('div')
		sort_up.classList.add('sort_button')
		sort_up.classList.add('up')
		sort_up.classList.add('hover')
		sort_up.style.float = 'right'
		if(i == 0)
			sort_up.style.filter = 'brightness(3)'
		sort_up.onclick = onclick_video_sort_up_button
		if(i == 0)
		{
			sort_up.addEventListener('contextmenu', event_preventDefault, false)
			register_ui_tooltip_event(sort_up, '영상 순서 올리기(↑)')
		}
		else
		{
			sort_up.addEventListener('contextmenu', onrclick_video_sort_up_button, false)
			register_ui_tooltip_event(sort_up, '영상 순서 올리기(↑)\n우클릭: 맨 위로 올리기')
		}
		div.appendChild(sort_up)

		// 바로 재생 버튼 추가
		var play_now = document.createElement('div')
		play_now.classList.add('play_now_button')
		play_now.classList.add('hover')
		play_now.style.float = 'right'
		play_now.onclick = onclick_video_play_now_button
		play_now.addEventListener('contextmenu', event_preventDefault, false)
		register_ui_tooltip_event(play_now, '이 영상을 대기열에 추가')
		div.appendChild(play_now)

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

function event_preventDefault()
{
	event.preventDefault()
}

// ========================= 컨트롤패널 - 재생목록 정보 =========================

/* 컨트롤패널 - 재생목록 정보 - 선택하기 버튼 onclick */
function onclick_playlist_select_button()
{
	socket.emit('select_playlist', g_playlist_control_panel_current_playlist_id)
}

function onrclick_playlist_control_panel_playlist_info_select()
{
	event.preventDefault()
}

/* 컨트롤패널 - 재생목록 정보 - 새 영상 추가 버튼 onclick */
function onclick_new_video_button()
{
	var url = prompt('추가할 영상의 주소를 넣어주세요.\nex)\nhttps://www.youtube.com/watch?v=FRO3EX3zAss\n또는 FRO3EX3zAss')
	var video_id = youtube_url_parse(url)
	if(!url || !video_id)
		return

	socket.emit('push_video', {video_id: video_id, playlist_id: g_playlist_control_panel_current_playlist_id})
}

/* 컨트롤패널 - 재생목록 정보 - 새 영상 추가 버튼 onrclick */
function onrclick_playlist_control_panel_playlist_info_new_video_button()
{
	event.preventDefault()

	var url = prompt('추가할 재생목록의 주소나 ID를 넣어주세요.\nex)\nhttps://www.youtube.com/playlist?list=PL7axKIpVlfRsyg_XqG0QPBIyppz60P40l\n또는 PL7axKIpVlfRsyg_XqG0QPBIyppz60P40l')
	var youtube_playlist_id = youtube_playlist_url_parse(url)
	if(!url || !youtube_playlist_id)
		return

	socket.emit('push_playlist', {youtube_playlist_id: youtube_playlist_id, playlist_id: g_playlist_control_panel_current_playlist_id})
}

/* 컨트롤패널 - 재생목록 정보 - 셔플 버튼 onclick */
function onclick_playlist_shuffle_button()
{
	var thisPlaylist = g_playlist_info_list.filter(x => x.Id == g_playlist_control_panel_current_playlist_id)[0]
	socket.emit('shuffle', thisPlaylist.Id)
}

function onrclick_playlist_control_panel_playlist_info_shuffle()
{
	event.preventDefault()
}

/* 컨트롤패널 - 재생목록 정보 - 재생목록 이름 변경 onclick */
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

function onrclick_playlist_control_panel_playlist_info_rename_button()
{
	event.preventDefault()
}

/* 컨트롤패널 - 재생목록 정보 - 재생목록 삭제 버튼 onclick */
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

	var delete_playlist_id = thisPlaylist.Id
	select_playlist_button(g_current_playlist_id)
	socket.emit('delete_playlist', delete_playlist_id)
}

function onrclick_playlist_control_panel_playlist_info_delete_button()
{
	event.preventDefault()
}

// ========================= 컨트롤패널 - 영상목록 =========================

/* 컨트롤패널 - 영상목록 - 삭제 버튼 onclick */
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

/* 컨트롤패널 - 영상목록 - 영상 삭제버튼 onrclick */
function onrclick_video_delete_button()
{
	event.preventDefault()
}

/* 컨트롤패널 - 영상목록 - 영상 재생버튼 onclick */
function onclick_video_play_now_button()
{
	var video_index = event.target.parentElement.getAttribute('videoindex')
	if(video_index == null)
		video_index = event.target.parentElement.parentElement.getAttribute('videoindex')
	
	if(video_index == null)
	{
		console.log('좋버그 발생 onclick_video_play_now_button')
		return
	}
	video_index = eval(video_index)
	
	socket.emit('queue_video_index', video_index)
}

/* 컨트롤패널 - 영상목록 - 위치변경(↑) onclick */
function onclick_video_sort_up_button()
{
	request_change_video_sort(event.target, false)
}

function onrclick_video_sort_up_button()
{
	event.preventDefault()

	request_change_video_sort(event.target, false, true)
}

/* 컨트롤패널 - 영상목록 - 위치변경(↓) onclick */
function onclick_video_sort_down_button()
{
	request_change_video_sort(event.target, true)
}

function onrclick_video_sort_down_button()
{
	event.preventDefault()

	request_change_video_sort(event.target, true, true)
}

/* 컨트롤패널 - 영상목록 - 영상 순서 변경 */
function request_change_video_sort(element, isDown, isForceMost = false)
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

	var video_id = thisPlaylist.VideoList[index]
	socket.emit('change_video_order', {playlist_id: thisPlaylist.Id, video_index: index, video_id: video_id, isDown: isDown, isForceMost: isForceMost })
}

// ========================= 메인 화면 =========================


// ========================= 메인 화면 - 우측 채팅 =========================

function onclick_chat_category_btn()
{
	if(this == mainchat_header_chat ||
		this == mainchat_header_djlist ||
		this == mainchat_header_recent ||
		this == mainchat_header_option)
		{
			set_chat_category(this)
		}
}

function set_chat_category(category_element) // category_element : mainchat_header_(chat|djlist|recent|option)
{
	if(g_current_chat_category == category_element)
		return

	g_current_chat_category.toggleAttribute('selected', false)
	var cur_panel = get_chat_category_panel(g_current_chat_category)
	if(!cur_panel)
		console.error('cur panel이 없다. 1 ', g_current_chat_category, ' ', category_element)
	else
	{
		cur_panel.style.display = 'none'
		if(g_current_chat_category == mainchat_header_chat)
			chat_extra.style.display = 'none'
	}

	g_current_chat_category = category_element

	g_current_chat_category.toggleAttribute('selected', true)
	cur_panel = get_chat_category_panel(g_current_chat_category)
	if(!cur_panel)
		console.error('cur panel이 없다. 2 ', g_current_chat_category)
	else
	{
		cur_panel.style.display = 'block'
		if(g_current_chat_category == mainchat_header_chat)
		{
			chat_extra.style.display = 'block'
			chat_scroll()
			g_chat_noti_count = 0
			update_chat_noti()
		}
	}

}

function get_chat_category_panel(category_element) // category_element : mainchat_header_(chat|djlist|recent|option)
{
	if(category_element == mainchat_header_chat)
		return chat
	if(category_element == mainchat_header_djlist)
		return djlist
	if(category_element == mainchat_header_recent)
		return recent
	if(category_element == mainchat_header_option)
		return option
	
	return null
}

function update_chat_noti() // 내가 안 본 채팅 카운트 출력
{	
	if(g_chat_noti_count > 0)
	{
		if(chat_noti_count.style.display != 'inline')
			chat_noti_count.style.display = 'inline'
		chat_noti_count.firstChild.textContent = g_chat_noti_count
	}
	else
	{
		if(chat_noti_count.style.display != 'none')
			chat_noti_count.style.display = 'none'
	}
}

function update_users_count()
{
	user_count.firstChild.textContent = g_users.length
}

// ========================= 메인 화면 - 우측 채팅 - 멤버 리스트 =========================

function update_djlist_users(data_list)
{
	// 모든 자식 노드 삭제
	while ( djlist_users.hasChildNodes() ) 
		djlist_users.removeChild( djlist_users.firstChild )

	djlist_users_header.firstChild.textContent = format('참여 인원 ({0})', data_list.length)

	data_list.map(function (e, i) {
		var li = document.createElement('li')
		li.classList.add('djlist_user')
		if(i % 2 == 1)
			li.classList.add('dark')

		var number = document.createElement('number')
		number.appendChild(document.createTextNode(''))
		li.appendChild(number)

		var img = document.createElement('img')
		img.classList.add('chat_profile')
		img.src = format('icon/{0}.png?ver={1}', e.icon_id, e.icon_ver)
		img.onmouseenter = image_onmouseenter
		img.onmouseout = image_onmouseout
		img.onmousemove = image_onmousemove
		li.appendChild(img)

		var label = document.createElement('label')
		label.appendChild(document.createTextNode(e.nick))
		if(e.nick == g_nick)
			li.style.color = 'crimson'
		li.appendChild(label)

		djlist_users.appendChild(li)
	})
}

function update_djlist_djs(data_list)
{
	// 모든 자식 노드 삭제
	while ( djlist_djs.hasChildNodes() ) 
		djlist_djs.removeChild( djlist_djs.firstChild )

	data_list.map(function(e, i) {
		var li = document.createElement('li')
		li.classList.add('djlist_dj')
		if(i == 0)
			li.classList.add('djing')
		if(e.nick == g_nick)
			li.style.color = 'crimson'
		if(i % 2 == 1)
			li.classList.add('dark')

		var number = document.createElement('number')
		number.appendChild(document.createTextNode(i == 0 ? '▶' : format('{0}.', i)))
		li.appendChild(number)

		var img = document.createElement('img')
		img.classList.add('chat_profile')
		img.src = format('icon/{0}.png?ver={1}', e.icon_id, e.icon_ver)
		img.onmouseenter = image_onmouseenter
		img.onmouseout = image_onmouseout
		img.onmousemove = image_onmousemove
		li.appendChild(img)

		var label = document.createElement('label')
		label.appendChild(document.createTextNode(e.nick))
		li.appendChild(label)

		djlist_djs.appendChild(li)
	})
}

// ========================= 메인 화면 - 우측 채팅 - 최근곡 =========================

function update_recent_video_list()
{
	// 모든 자식 노드 삭제
	while ( recent_list.hasChildNodes() ) 
		recent_list.removeChild( recent_list.firstChild )

	g_recent_video_list.map(function(e, i) {
		var li = document.createElement('div')
		li.classList.add(i % 2 == 0 ? 'even' : 'odd')
		li.classList.add('recent_list_video')
		li.classList.add('system_message')
		li.classList.add('chat')
		li.classList.add('play_info')

		var img = document.createElement('img')
		img.src = e.thumbnail
		img.setAttribute('video_id', e.video_id)
		img.onclick = onclick_play_data
		img.onmouseenter = image_onmouseenter
		img.onmouseout = image_onmouseout
		img.onmousemove = image_onmousemove
		img.setAttribute('ui_tooltip_x_offset', 60)
		register_ui_tooltip_event(img, '영상 주소 복사')
		li.appendChild(img)

		var div1 = document.createElement('div')
		div1.appendChild(document.createTextNode(format('DJ : {0}', e.dj)))
		div1.classList.add('play_info_dj')
		li.appendChild(div1)

		var div2 = document.createElement('div')
		div2.appendChild(document.createTextNode(format('{0} ({1})', e.title, second_to_string(e.duration))))
		div2.classList.add('play_info_title')
		li.appendChild(div2)

		recent_list.appendChild(li)
	})
}

// ========================= 메인 화면 - 우측 채팅 - 옵션 =========================

function onclick_chat_category_option_mention()
{
	// TODO: 나중에 계정에 설정 저장?
}

function onclick_chat_category_option_tts()
{
	// TODO: 나중에 계정에 설정 저장?
}

function onclick_chat_category_option_mention_sample()
{
	var audio = new Audio('static/call.mp3')
	audio.volume = option_slider_mention_volume.value
	audio.onended = destroy_self
	audio.play()
}

function onclick_chat_category_option_tts_sample()
{
	var audio = new Audio('static/크크루삥뽕')
	audio.volume = option_slider_tts_volume.value
	audio.onended = destroy_self
	audio.play()
}

function onclick_chat_category_option_logout()
{
	if(localStorage.getItem(g_storage_nick_key) == g_nick)
		localStorage.removeItem(g_storage_nick_key)
	location.reload()
}

// ========================= 메인 화면 - 영상부 =========================

/* 대기중일 때 영상 커버 세팅 */
function SetVideoBlock(isBlock)
{	
	block_video.style.display = isBlock ? 'block' : 'none'
}

/* 영상 marquee 채팅 함수 */
function AddMarqueeChat(txt, hRate) {
    var div = document.createElement('div')
    div.classList.add('marquee')
    var p = document.createElement('p')
    p.appendChild(document.createTextNode(txt))
    div.appendChild(p)

	var window_height = window.innerHeight
	var bottom_height = 86 // 하단 박스 높이
	var marquee_screen_height = window_height - bottom_height - 60 // 폰트크기 43이지만 보정으로 넉넉하게 60
	var place_h = marquee_screen_height * hRate

	div.style.top = place_h + 'px'
    marquee_screen.appendChild(div)

	setTimeout(DeleteMarqueeChat, 1000 * 14, div)
}

function DeleteMarqueeChat(element)
{
	element.remove()
}

// ========================= 메인 화면 - 하단 중앙 =========================

/* 영상 링크 보기 버튼 onclick */
var timeReg = /(t=\d+&|&t=\d+)/
function show_video_link()
{
	event.preventDefault()
	if(!video_link || !g_current_video_id)
		return
	
	video_link.innerText = 'https://www.youtube.com/watch?v=' + g_current_video_id
	selectRange(video_link)
	document.execCommand("copy")
}

/* 영상 링크 숨기기 */
function hide_video_link()
{
	if(!video_link)
		return
	
	video_link.innerText = '[영상 링크 복사]'
}

/* 영상 플레이 타임 갱신 */
var cached_my_progress_bar_after_innerText = null
var cached_my_progress_bar_after_style_width = null
var cached_video_info_time_innerText = null
function update_video_time() 
{
	var isVideoPlaying = g_current_video_id
	if(!isVideoPlaying)
	{
		if(isDirty(cached_my_progress_bar_after_innerText, ''))
		{
			my_progress_bar_after.innerText = ''
			cached_my_progress_bar_after_innerText = ''
		}

		if(isDirty(cached_my_progress_bar_after_style_width, 0))
		{
			my_progress_bar_after.style.width = 0
			cached_my_progress_bar_after_style_width = 0
		}

		if(isDirty(cached_video_info_time_innerText, '--:-- / --:--'))
		{
			video_info_time.innerText = '--:-- / --:--'
			cached_video_info_time_innerText = '--:-- / --:--'
		}
		return
	}

	var duration = g_current_duration
	if(duration == 0)
	{
		if(isDirty(cached_my_progress_bar_after_style_width, g_progress_bar_width))
		{
			my_progress_bar_after.style.width = g_progress_bar_width
			cached_my_progress_bar_after_style_width = g_progress_bar_width
		}

		if(isDirty(cached_video_info_time_innerText, '실시간'))
		{
			video_info_time.innerText = '실시간'
			cached_video_info_time_innerText = '실시간'
		}
		return
	}

	var currentTime = (Date.now() - g_cued_time_ms) / 1000
	if(duration < currentTime)
		currentTime = duration

	var bar_width = g_progress_bar_width * (currentTime / duration)
	if(isDirty(cached_my_progress_bar_after_style_width, bar_width))
	{
		my_progress_bar_after.style.width = bar_width
		cached_my_progress_bar_after_style_width = bar_width
	}

	var video_info_time_text = second_to_string(currentTime) + " / " + second_to_string(duration)
	if(isDirty(cached_video_info_time_innerText, video_info_time_text))
	{
		video_info_time.innerText = video_info_time_text
		cached_video_info_time_innerText = video_info_time_text
	}
	return

	function isDirty(val1, val2)
	{
		return val1 != val2
	}
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
		video_info_name.setAttribute('ui_tooltip_alt', '재생 중인 영상이 없습니다.')
		video_link.innerText = ''
		return
	}

	var video_name = g_current_title
	if(!video_name)
	{
		video_info_name.innerText = '재생 중인 영상이 없습니다.'
		video_info_name.setAttribute('ui_tooltip_alt', '재생 중인 영상이 없습니다.')
		video_link.innerText = ''
		return
	}
	
	if(g_current_author)
		video_info_name.innerText = format('[{0}] {1}', g_current_author, video_name)
	else
		video_info_name.innerText = video_name

	video_info_name.setAttribute('ui_tooltip_alt', video_info_name.innerText)
	hide_video_link()
}

// ========================= 메인 화면 - 하단 좌측 =========================

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

	if(!current_data)
		return

	current_playlist_name.innerText = format('{0} ({1})', current_data.Name, current_data.VideoList.length)
	if(current_data.VideoList.length == 0)
		current_playlist_video_name.innerText = '[여기를 눌러 곡을 등록]'
	else
		current_playlist_video_name.innerText = g_video_info_dic[current_data.VideoList[0]].Name
}

/* 컨트롤패널 onclick */
function toggle_playlist_control_panel()
{
	g_show_playlist_control_panel = !g_show_playlist_control_panel
	show_playlist_control_panel(g_show_playlist_control_panel)
}

// ========================= 메인 화면 - 하단 우측 =========================

/* 대기열 입장/퇴장 onclick */
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

/* 현재 영상 스킵 버튼 onclick */ 
function onclick_skip_button()
{
	if(g_current_dj == g_nick)
		socket.emit('skip')
}

/* 현재 영상 평가(좋아요) 버튼 onclick */ 
function onclick_good_button()
{
	socket.emit('rating', true)
}

/* 현재 영상 평가(싫어요) 버튼 onclick */ 
function onclick_bad_button()
{
	socket.emit('rating', false)
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

/* UI 툴팁 관련 처리들 */

function register_ui_tooltip_event(element, message)
{
	element.setAttribute('ui_tooltip_alt', message)
	element.addEventListener('mouseenter', ui_tooltip_onmouseenter)
	element.addEventListener('mouseleave', ui_tooltip_onmouseleave)
	element.addEventListener('mousemove', ui_tooltip_onmousemove)
}

function ui_tooltip_onmouseenter()
{
	if(event.target != event.currentTarget)
		return

	var target = event.currentTarget
	ui_tooltip.style.display = 'block'
	ui_tooltip.firstChild.nodeValue = target.getAttribute('ui_tooltip_alt')
	var extra_margin_top = target.getAttribute('ui_tooltip_y_offset')
	ui_tooltip.style.marginTop = (extra_margin_top ? extra_margin_top : 0)
	var extra_margin_left = target.getAttribute('ui_tooltip_x_offset')
	ui_tooltip.style.marginLeft = (extra_margin_left ? extra_margin_left : 0)
	ui_tooltip_set_pos(event.clientX, event.clientY)
}

function ui_tooltip_onmouseleave()
{
	if(event.target != event.currentTarget)
		return

	ui_tooltip.style.display = 'none'
	ui_tooltip.firstChild.nodeValue = ''
}

function ui_tooltip_onmousemove()
{
	ui_tooltip_set_pos(event.clientX, event.clientY)
}

function ui_tooltip_set_pos(x, y)
{
	x -= ui_tooltip.clientWidth / 2
	y -= ui_tooltip.clientHeight + 10
	if(x < 0)
		x = 0
	if(y < 0)
		y = 0

	ui_tooltip.style.left = x
	ui_tooltip.style.top = y
}
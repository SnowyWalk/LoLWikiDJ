/* 캐싱 */
var g_progress_bar_width = 0

/* UI 사이즈 셋업 (최초에 한번만 실행)*/
function initial_resize()
{
	var bottom_height = 86 // 하단 박스 높이

	/* 우측 채팅 */
	mainchat.style.width = 350

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
	playlist_control_panel_playlist_header.style.width = 300
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
	login_id.style.top = window_height / 2 - login_id.clientHeight - 7.5

	login_pw.style.left = (window_width - login_bg.clientWidth) / 2 + 13
	login_pw.style.top = window_height / 2 + 7.5

	login_button.style.left = (window_width - login_bg.clientWidth) / 2 + 13 + login_id.clientWidth + 15
	login_button.style.top = window_height / 2 - login_id.clientHeight - 8


	/* 채팅 */
	mainchat.style.marginLeft = (window_width - mainchat.clientWidth) // 350

	chat.style.height = (window_height - 50)

	/* 유튜브 플레이어 */
	if(player)
		player.setSize(window_width - mainchat.clientWidth, window_height - bottom_height)

	block_video.style.width = (window_width - mainchat.clientWidth)
	block_video.style.height = (window_height - bottom_height)
	block_video.style.lineHeight = (window_height - bottom_height) + 'px'
	
	if(!g_current_video_id)
		block_video.style.display = 'block'
	else
		block_video.style.display = 'none'

	/* 좌하단 재생목록 정보 */
	current_playlist_info_box.style.top = (window_height - bottom_height) 

	/* 하단 영상 정보 */ 
	var video_info_width = window_width - mainchat.clientWidth - current_playlist_info_box.clientWidth - etc_box.clientWidth - 3 // 798
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
	image_expander_src.style.maxWidth = window_width - mainchat.clientWidth
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

	var t_playlist_control_panel_playlist_header_width = playlist_control_panel_playlist_header.getBoundingClientRect().width

	// 패널 판크기 조절
	playlist_control_panel.style.width = (window_width - mainchat.clientWidth)
	playlist_control_panel.style.height = (window_height - bottom_height)

	// 재생목록 헤더 크기 조절
	playlist_control_panel_playlist_header.style.height = (window_height - bottom_height - 1)

	// 재생목록 인포 크기 조절
	playlist_control_panel_playlist_info.style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 1)

	// 영상 목록 헤더 크기 조절
	playlist_control_panel_videolist_header.style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 1)
	playlist_control_panel_videolist_header.style.height = (window_height - bottom_height - playlist_control_panel_videolist_header.offsetTop - 1)

	// 영상 목록의 텍스트 길이 조절
	for(var e of document.getElementsByClassName('videolist_button'))
		e.getElementsByClassName('text')[0].style.width = (window_width - t_playlist_control_panel_playlist_header_width - mainchat.clientWidth - 204 - 120 - 10 - 10 - 1 - 110 * 2)
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
		div.appendChild(img)

		// 영상 이름 텍스트 생성 후 추가
		var text = document.createElement('div')
		text.innerText = format('{0} ({1})', thisData.Name, second_to_string(thisData.Length))
		text.classList.add('text') // 쿼리를 위해
		div.appendChild(text)

		// 삭제 버튼 추가
		var del = document.createElement('div')
		del.classList.add('delete_button')
		del.classList.add('hover')
		del.style.float = 'right'
		del.onclick = onclick_video_delete_button
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
		div.appendChild(sort_down)

		var sort_up = document.createElement('div')
		sort_up.classList.add('sort_button')
		sort_up.classList.add('up')
		sort_up.classList.add('hover')
		sort_up.style.float = 'right'
		if(i == 0)
			sort_up.style.filter = 'brightness(3)'
		sort_up.onclick = onclick_video_sort_up_button
		div.appendChild(sort_up)
		

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

// ========================= 컨트롤패널 - 재생목록 정보 =========================

/* 컨트롤패널 - 재생목록 정보 - 선택하기 버튼 onclick */
function onclick_playlist_select_button()
{
	socket.emit('select_playlist', g_playlist_control_panel_current_playlist_id)
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

/* 컨트롤패널 - 영상목록 - 위치변경(↑) onclick */
function onclick_video_sort_up_button()
{
	request_change_video_sort(event.target, false)
}

/* 컨트롤패널 - 영상목록 - 위치변경(↓) onclick */
function onclick_video_sort_down_button()
{
	request_change_video_sort(event.target, true)
}

/* 컨트롤패널 - 영상목록 - 영상 순서 변경 */
function request_change_video_sort(element, isDown)
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
	socket.emit('change_video_order', {playlist_id: thisPlaylist.Id, video_index: index, video_id: video_id, isDown: isDown })
}

// ========================= 메인 화면 =========================

// ========================= 메인 화면 - 영상부 =========================

/* 대기중일 때 영상 커버 세팅 */
function SetVideoBlock(isBlock)
{	
	block_video.style.display = isBlock ? 'block' : 'none'
}

// ========================= 메인 화면 - 하단 중앙 =========================

/* 영상 링크 보기 버튼 onclick */
var timeReg = /(t=\d+&|&t=\d+)/
function show_video_link()
{
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
		video_link.innerText = ''
		return
	}

	var video_name = g_current_title
	if(!video_name)
	{
		video_info_name.innerText = '재생 중인 영상이 없습니다.'
		video_link.innerText = ''
		return
	}
	video_info_name.innerText = video_name
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
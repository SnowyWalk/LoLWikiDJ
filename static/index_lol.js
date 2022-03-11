/* ====================================== 롤백 ============================================= */

var g_lol_icon_change_start_x = 0
var g_lol_icon_change_start_y = 0
var g_lol_icon_change_size = 0
var g_lol_icon_change_image_data = '' // 아이콘변경 이미지 데이터
var g_lol_icon_change_canvas_context = null
var g_lol_icon_change_image_width = 0 // 실제 이미지의 크기임
var g_lol_icon_change_image_height = 0 // 실제 이미지의 크기임
var g_lol_icon_change_reply_icon_element = null // 아이콘 변경 시 댓글이미지 캐싱
var g_lol_icon_change_drag_start_mx = 0 // 드래그 이벤트를 위해
var g_lol_icon_change_drag_start_my = 0 // 드래그 이벤트를 위해
var g_lol_icon_change_drag_start_x = 0 // 드래그 시작했을때 크롭영역의 위치
var g_lol_icon_change_drag_start_y = 0 // 드래그 시작했을때 크롭영역의 위치
var g_lol_icon_change_has_image = false

/* 롤백 패널 열기 */
function onrclick_playlist_info_box() 
{
	event.preventDefault()

	g_lol_panel_show = !g_lol_panel_show
	
	if(g_lol_panel_show)
	{
		// 만약 플레이리스트가 켜져있었다면 끄기
		if(g_show_playlist_control_panel)
			toggle_playlist_control_panel()

		g_lol_article_scroll_seq = 0
		g_lol_article_list = []

		if(g_lol_android_id != g_lol_guest_id)
			socket.emit('lol_user_info', g_lol_android_id)

		g_lol_search_body = ''
		g_lol_search_nick = ''
		g_lol_search_vote = false
		g_lol_search_mine = false
		g_lol_spec_android_id = g_lol_android_id
		lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
	}
	else
	{
		lol_lpanel_board.scroll(0, 0)
	}

	lol_panel_update()
}

/* 롤백 글 목록 조회 쿼리 */
function lol_get_article_list(seq = 0, cnt = 30, body = '', nick = '', vote = false, mine = false)
{
	console.log('query', {android_id: g_lol_spec_android_id, seq: seq, cnt: cnt, body: body, nick: nick, vote: vote, mine: mine})
	socket.emit('lol_get_article_list', {android_id: g_lol_spec_android_id, seq: seq, cnt: cnt, body: body, nick: nick, vote: vote, mine: mine})
}

/* 글 목록 업뎃 */
function lol_lpanel_update()
{
	// 헤더 유저정보
	if(!g_lol_user_info)
	{
		// 유저 아이콘
		lol_lpanel_account_icon.style.display = 'none'
		lol_lpanel_account_icon.src = ''

		// 닉네임
		lol_lpanel_account.innerHTML = '로그인 해주세요.'
		// lol_lpanel_account.firstChild.nodeValue = '로그인 해주세요.'

		// 내정보 버튼
		lol_lpanel_userinfo.style.display = 'none'
	}
	else
	{
		// 유저 아이콘
		lol_lpanel_account_icon.src = lol_get_icon_url(g_lol_user_info['iconpic'], g_lol_user_info['badge_use'])
		lol_lpanel_account_icon.style.display = 'block'

		// 닉네임
		lol_lpanel_account.innerHTML = format('<b>{0}</b> ({1} 스택)', g_lol_user_info['nickname'], g_lol_user_info['point'])

		// 내정보 버튼
		lol_lpanel_userinfo.style.display = 'block'
	}

	// 모든 자식 노드 삭제
	while ( lol_lpanel_board_list.hasChildNodes() ) 
		lol_lpanel_board_list.removeChild( lol_lpanel_board_list.firstChild )

	for(var e of g_lol_article_list)
	{
		var div = document.createElement('div')
		div.classList.add('lol_article_list_item')
		div.setAttribute('seq', e['post_seq'])
		
		// 아이콘
		var img = document.createElement('img')
		img.toggleAttribute('icon', true)
		img.src = lol_get_icon_url(e['icon_img'], e['badge_use'])
		div.appendChild(img)

		var center_div = document.createElement('div')
		center_div.toggleAttribute('article_info')

		// 제목
		var title_container = document.createElement('div')
		title_container.toggleAttribute('title_container', true)

		var title = document.createElement('div')
		title.toggleAttribute('title', true)
		// title.appendChild(document.createTextNode(e['post_title']))
		title.innerHTML = e['post_title']
		title_container.appendChild(title)

		if(e['reply_cnt'] > 0)
		{
			var reply_cnt = document.createElement('div')
			reply_cnt.toggleAttribute('reply_cnt', true)
			reply_cnt.innerHTML = format('[{0}]', e['reply_cnt'])
			title_container.appendChild(reply_cnt)
		}
		center_div.appendChild(title_container)

		// 하단
		var spec = document.createElement('div')
		spec.toggleAttribute('spec', true)
		spec.innerHTML = format('{0} | {1} | 조회 {2} | 추천 {3}{4}', e['before'].replace('size=1', ''), e['nickname'], e['views'], e['likes'], e['alarm'] > 0 ? format(' | 신고 {0}', e['alarm']) : '')
		center_div.appendChild(spec)
		div.appendChild(center_div)

		// 텍스트 / 짤 / 유튭 / 두들러
		var img2 = document.createElement('img')
		img2.toggleAttribute('type', true)
		if(e['youtube_url'].length)
			img2.src = 'static/icon_youtube.png'
		else if(e['doodlr'] > 0)
			img2.src = 'static/icon_doodlr.png'
		else if(e['pic_new'].length || e['pic_multi'].length)
			img2.src = 'static/icon_img.png'
		else 
			img2.src = 'static/icon_text.png'
		div.appendChild(img2)

		div.onclick = lol_onclick_article

		lol_lpanel_board_list.appendChild(div)
	}
}

/* 글목록 새로고침 버튼 */
function lol_onclick_aritcle_list_refresh()
{
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	// lol_lpanel_refresh.style.display = 'none'
	lol_lpanel_refresh.style.height = '0px'
	lol_lpanel_board.scroll(0, 0)
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 글목록 패널 스크롤 이벤트 */
function lol_lpanel_board_onscroll()
{
	if(lol_lpanel_board.scrollTop + lol_lpanel_board.clientHeight + 10 >= lol_lpanel_board.scrollHeight) // 1799.63 이런식으로 1800이 채 안되는 경우가 있었음. 10정도 여유 줌.
	{
		var curTime = +new Date()
		if(curTime - g_lol_last_scroll_time >= 100)
		{
			g_lol_last_scroll_time = curTime
			lol_get_article_list(g_lol_article_scroll_seq, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
		}
	}
}

/* 글 클릭 -> 해당 글 정보 요청 */
function lol_onclick_article()
{
	var seq = event.currentTarget.getAttribute('seq')
	if(!seq)
	{
		console.log('seq가 없다?!', seq)
		return
	}

	if(!g_lol_panel_show)
		onrclick_playlist_info_box()

	g_lol_rpanel_scroll_top_switch = true
	socket.emit('lol_get_article_detail', { post_seq: seq, android_id: g_lol_android_id })
}

/* 검색 버튼 클릭 */
function lol_onclick_search_button()
{
	if(g_lol_android_id != g_lol_guest_id)
		lol_lpanel_search_menu_button_mine.firstChild.nodeValue = '내 글'
	else
		lol_lpanel_search_menu_button_mine.firstChild.nodeValue = '내 글 (로그인 필요)'

	lol_lpanel_search_menu.style.display = 'block'
}

/* 검색메뉴 배경 클릭 */
function lol_onclick_search_background() 
{
	lol_lpanel_search_menu.style.display = 'none'
}

/* 검색메뉴 내부 클릭 */
function lol_onclick_search_foreground()
{
	event.stopPropagation()
}

/* 검색 - 전체글 클릭 */
function lol_onclick_search_all()
{
	event.stopPropagation()
	lol_lpanel_search_menu.style.display = 'none'
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 검색 - 추천순 클릭 */
function lol_onclick_search_vote()
{
	event.stopPropagation()
	lol_lpanel_search_menu.style.display = 'none'
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = true
	g_lol_search_mine = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 검색 - 내 글 클릭 */
function lol_onclick_search_mine()
{
	event.stopPropagation()
	if(g_lol_android_id == g_lol_guest_id)
		return

	lol_lpanel_search_menu.style.display = 'none'
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = true
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 검색 - 글검색 클릭 */
function lol_onclick_search_search()
{
	event.stopPropagation()
	var ans = prompt('글 검색: 검색어를 입력해주세요.')
	lol_lpanel_search_menu.style.display = 'none'

	if(!ans)
		return

	g_lol_search_body = ans
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 검색 - 닉검색 클릭 */
function lol_onclick_search_nick()
{
	event.stopPropagation()
	var ans = prompt('닉 검색: 검색어를 입력해주세요.')
	lol_lpanel_search_menu.style.display = 'none'

	if(!ans)
		return

	g_lol_search_body = ''
	g_lol_search_nick = ans
	g_lol_search_vote = false
	g_lol_search_mine = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 15 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 왼쪽 글쓰기 버튼 클릭 */
function lol_onclick_write()
{
	lol_write_panel_toggle(true)
}

/* 내 정보 버튼 클릭 */
function lol_onclick_userinfo_button()
{
	if(g_lol_android_id == g_lol_guest_id)
		return

	lol_lpanel_userinfo_menu.style.display = 'block'
}

/* 내 정보 메뉴 배경 클릭 */
function lol_onclick_userinfo_background() 
{
	lol_lpanel_userinfo_menu.style.display = 'none'
}

/* 내 정보 메뉴 내부 클릭 */
function lol_onclick_userinfo_foreground()
{
	event.stopPropagation()
}

/* 내 정보 - 닉네임 변경 클릭 */
function lol_onclick_userinfo_nickname_change()
{
	event.stopPropagation()

	var new_nick = prompt('아이디를 입력하세요', g_lol_user_info['nickname'])
	if(new_nick.length == 0)
		return

	socket.emit('lol_change_nickname', g_lol_android_id, new_nick)

	lol_lpanel_userinfo_menu.style.display = 'none'
}

/* 내 정보 - 아이콘 변경 클릭 */
function lol_onclick_userinfo_icon_change()
{
	event.stopPropagation()
	lol_lpanel_userinfo_menu.style.display = 'none'
	lol_rpanel_show_icon_change_panel()
}

/* 내 정보 - 차단목록 초기화 클릭 */
function lol_onclick_userinfo_blocklist_reset()
{
	event.stopPropagation()
	// TODO
	
	alert('만들기 귀찮아서 유기')
}

/* 글 쓰기 - 취소 */
function lol_onclick_write_cancel() 
{

	if(lol_write_subject.value.length == 0 && 
		lol_write_body.value.length == 0 &&
		lol_write_youtube.value.length == 0)
	{
		lol_write_panel_toggle(false)
		return
	}

	var ans = confirm('취소 하시겠습니까?')
	if(!ans)
		return

	lol_write_subject.value = ''
	lol_write_body.value = ''
	lol_write_youtube.value = ''

	g_lol_write_image_data = ''
	lol_write_image.style.display = 'none'
	lol_write_image_guide.style.display = 'none'
	lol_write_image.src = ''
	lol_write_image_placeholder.style.display = 'block'

	lol_write_panel_toggle(false)
}

/* 글 쓰기 - 등록 */
function lol_onclick_write_confirm() 
{
	if(lol_write_subject.value.length == 0)
		return

	if(lol_write_body.value.length == 0)
		return

	socket.emit('lol_write', { 
		android_id: g_lol_android_id, 
		subject: lol_write_subject.value,
		body: lol_write_body.value + ' <ㄹㅗㄹㄷㅣ>',
		youtube_url: lol_write_youtube.value,
		image: g_lol_write_image_data })
}

/* 글 새로고침 버튼 */
function lol_onclick_aritcle_refresh()
{
	lol_rpanel_refresh.style.display = 'none'
	socket.emit('lol_get_article_detail', { post_seq: g_lol_current_detail['post_seq'], android_id: g_lol_android_id })
}

/* 글 내용 패널 업데이트 */
function lol_rpanel_update()
{
	var is_invalid = (!g_lol_current_detail || !('post_seq' in g_lol_current_detail) || !g_lol_current_detail['post_seq'].length)
	if(is_invalid)
	{
		g_lol_current_detail = {}
		g_lol_current_detail['post_title'] = '글이 존재하지 않습니다.'
		g_lol_current_detail['post_text'] = '글이 존재하지 않습니다.'
		g_lol_current_detail['nickname'] = '사용자'
		g_lol_current_detail['stack'] = '0'
		g_lol_current_detail['likes'] = '0'
		g_lol_current_detail['views'] = '0'
		g_lol_current_detail['post_date'] = '시간'
		g_lol_current_detail['youtube_url'] = ''
		g_lol_current_detail['badge_use'] = ''
		g_lol_current_detail['icon_img'] = ''
		g_lol_current_detail['pic_multi'] = ''
		g_lol_current_detail['doodlr'] = '0'
		g_lol_current_detail['pic_new'] = ''
		g_lol_current_detail['fixedpic'] = ''
		g_lol_current_detail['replys'] = []
	}

	// 헤더
	lol_rpanel_header_icon.src = lol_get_icon_url(g_lol_current_detail['icon_img'], g_lol_current_detail['badge_use'])
	lol_rpanel_header_icon.onmouseenter = image_onmouseenter
	lol_rpanel_header_icon.onmouseout = image_onmouseout
	lol_rpanel_header_icon.onmousemove = image_onmousemove

	lol_rpanel_header_title.firstChild.nodeValue = g_lol_current_detail['post_title']
	lol_rpanel_header_nick.firstChild.nodeValue = g_lol_current_detail['nickname']
	lol_rpanel_header_spec.innerHTML = format('{0} 조회 <b>{1}</b>', g_lol_current_detail['stack'], g_lol_current_detail['views'])

	if(g_lol_android_id == g_lol_guest_id)
	{
		lol_rpanel_header_button.firstChild.nodeValue = '[이 계정에 로그인하기]'
	}
	else
	{
		lol_rpanel_header_button.innerHTML = '[차단하기]'
	}

	// 영상
	if(!g_lol_same_article_prev)
	{
		if(g_lol_current_detail['youtube_url'].length > 0)
		{
			lol_rpanel_body_youtube_container.style.display = 'block'
			lol_rpanel_body_youtube_player.src = format('https://www.youtube.com/embed/{0}', youtube_url_parse(g_lol_current_detail['youtube_url']))
		}
		else
		{
			lol_rpanel_body_youtube_container.style.display = 'none'
			lol_rpanel_body_youtube_player.src = ''
		}
	}

	// 사진
	var zzals = []
	if(g_lol_current_detail['pic_multi'].length)
	{
		zzals = g_lol_current_detail['pic_multi'].split('/').filter(e => e.length).map(e => format('http://lolwiki.kr/freeboard/uploads/files/{0}/{1}', lol_get_date_from_filename(e), e))
	}
	else if(g_lol_current_detail['pic_new'].length)
	{
		zzals = [format('http://lolwiki.kr/freeboard/uploads/files/{0}/{1}', lol_get_date_from_filename(g_lol_current_detail['pic_new']), g_lol_current_detail['pic_new'])]
	}
	else if(g_lol_current_detail['doodlr'] > 0)
	{
		var filename = g_lol_current_detail['doodlrurls'].substr(0, g_lol_current_detail['doodlrurls'].length - 1)
		zzals = [format('http://lolwiki.kr/freeboard/uploads/doodlr/{0}/{1}', lol_get_date_from_filename(filename), filename)]
	}
	else if(g_lol_current_detail['fixedpic'].length)
	{
		zzals = [format('http://lolwiki.kr/freeboard/uploads/fixed_img/files/{0}/{1}', lol_get_date_from_filename(g_lol_current_detail['fixedpic']), g_lol_current_detail['fixedpic'])]
	}

	lol_rpanel_body_img1_img.src = ''
	lol_rpanel_body_img2_img.src = ''
	lol_rpanel_body_img3_img.src = ''
	lol_rpanel_body_img4_img.src = ''
	lol_rpanel_body_img1_add.setAttribute('src', '')
	lol_rpanel_body_img2_add.setAttribute('src', '')
	lol_rpanel_body_img3_add.setAttribute('src', '')
	lol_rpanel_body_img4_add.setAttribute('src', '')
	if(zzals.length > 0)
	{
		lol_rpanel_body_img1.style.display = 'block'
		lol_rpanel_body_img1_img.src = zzals[0]
		lol_rpanel_body_img1_add.setAttribute('src', zzals[0])
	}
	else
		lol_rpanel_body_img1.style.display = 'none'

	if(zzals.length > 1)
	{
		lol_rpanel_body_img2.style.display = 'block'
		lol_rpanel_body_img2_img.src = zzals[1]
		lol_rpanel_body_img2_add.setAttribute('src', zzals[1])
	}
	else
		lol_rpanel_body_img2.style.display = 'none'

	if(zzals.length > 2)
	{
		lol_rpanel_body_img3.style.display = 'block'
		lol_rpanel_body_img3_img.src = zzals[2]
		lol_rpanel_body_img3_add.setAttribute('src', zzals[2])
	}
	else
		lol_rpanel_body_img3.style.display = 'none'

	if(zzals.length > 3)
	{
		lol_rpanel_body_img4.style.display = 'block'
		lol_rpanel_body_img4_img.src = zzals[3]
		lol_rpanel_body_img4_add.setAttribute('src', zzals[3])
	}
	else
		lol_rpanel_body_img4.style.display = 'none'

	if(!g_lol_same_article_prev)
	{
		lol_rpanel_body_img1.toggleAttribute('small', true)
		lol_rpanel_body_img2.toggleAttribute('small', true)
		lol_rpanel_body_img3.toggleAttribute('small', true)
		lol_rpanel_body_img4.toggleAttribute('small', true)
	}

	// 아이콘 변경 전용 엘리먼트 숨기기
	lol_rpanel_body_icon_change_placeholder.style.display = 'none'
	lol_rpanel_body_icon_change_canvas_container.style.display = 'none'
	lol_rpanel_body_icon_change_size_slider.style.display = 'none'
	lol_icon_change_buttons.style.display = 'none'
	
	lol_rpanel_body_body.innerHTML = g_lol_current_detail['post_text'].replace('size=1', '').replace(/\r\n/g, '<br>')
	lol_rpanel_body_date.firstChild.nodeValue = g_lol_current_detail['post_date']

	// 추천
	if(!is_invalid)
		lol_rpanel_body_like.style.display = 'block'
	else
		lol_rpanel_body_like.style.display = 'none'
	lol_rpanel_body_like_count.firstChild.nodeValue = g_lol_current_detail['likes']

	// 삭제 버튼
	if(is_invalid || g_lol_current_detail['my_post'] != '1')
		lol_rpanel_body_delete_button.style.display = 'none'
	else
		lol_rpanel_body_delete_button.style.display = 'block'

	// 공유 버튼
	if(!is_invalid)
		lol_rpanel_body_share_button.style.display = 'block'
	else
		lol_rpanel_body_share_button.style.display = 'none'
	lol_rpanel_body_share_button.setAttribute('icon_img', lol_get_icon_url(g_lol_current_detail['icon_img'], g_lol_current_detail['badge_use']))
	lol_rpanel_body_share_button.setAttribute('post_title', g_lol_current_detail['post_title'])
	lol_rpanel_body_share_button.setAttribute('post_reply', g_lol_current_detail['replys'].length)
	lol_rpanel_body_share_button.setAttribute('post_spec', format('{0} | 조회 {1} | 추천 {2}', g_lol_current_detail['nickname'], g_lol_current_detail['views'], g_lol_current_detail['likes']))
	lol_rpanel_body_share_button.setAttribute('post_seq',  g_lol_current_detail['post_seq'])

	// 댓글
	// 모든 자식 노드 삭제
	while ( lol_rpanel_reply_board_list.hasChildNodes() ) 
		lol_rpanel_reply_board_list.removeChild( lol_rpanel_reply_board_list.firstChild )

	for(var e of g_lol_current_detail['replys'])
	{
		var div = document.createElement('div')
		div.classList.add('lol_reply_list_item')
		div.setAttribute('seq', e['reply_seq'])
		
		// 아이콘
		var img = document.createElement('img')
		img.toggleAttribute('icon', true)
		img.src = lol_get_icon_url(e['icon_img'], e['badge_use'])
		img.onmouseenter = image_onmouseenter
		img.onmouseout = image_onmouseout
		img.onmousemove = image_onmousemove
		div.appendChild(img)

		var reply_body = document.createElement('div')
		reply_body.toggleAttribute('reply_body')

		// 닉/시간/삭제버튼
		var nick_container = document.createElement('div')
		nick_container.toggleAttribute('nick_container', true)

		var nick = document.createElement('div')
		nick.toggleAttribute('nick', true)
		nick.appendChild(document.createTextNode(e['nickname']))
		nick_container.appendChild(nick)

		var before = document.createElement('div')
		before.toggleAttribute('before', true)
		before.innerHTML = e['reply_date']
							.replace(' size=1', '')
							.replace(/&lt;/g, '<')
							.replace(/&gt;/g, '>')
							.replace('</font>', '</b></font>')
		nick_container.appendChild(before)

		if(e['my_post'] == 1)
		{
			var del = document.createElement('div')
			del.toggleAttribute('del', true)
			del.setAttribute('seq', e['reply_seq'])
			del.onclick = lol_onclick_delete_reply
			del.classList.add('no-drag')
			del.appendChild(document.createTextNode('[삭제]'))
			nick_container.appendChild(del)
		}


		reply_body.appendChild(nick_container)

		// 댓글이미지
		if(e['reply_img'].length > 0)
		{
			var img = document.createElement('img')
			img.toggleAttribute('img', true)
			img.toggleAttribute('small', true)
			img.src = format('http://lolwiki.kr/freeboard/uploads/files/{0}/{1}', lol_get_date_from_filename(e['reply_img']), e['reply_img'])
			img.onclick = lol_onclick_reply_img
			reply_body.appendChild(img)
		}

		var text = document.createElement('div')
		text.toggleAttribute('text', true)
		text.innerHTML = e['reply_title']
		// text.appendChild(document.createTextNode(e['reply_title']))
		reply_body.appendChild(text)

		div.appendChild(reply_body)

		lol_rpanel_reply_board_list.appendChild(div)
	}

	// 댓글 작성칸
	if(g_lol_android_id != g_lol_guest_id && !is_invalid)
	{
		lol_rpanel_reply_board_write_container.style.display = 'flex'
	}
	else
	{
		lol_rpanel_reply_board_write_container.style.display = 'none'
	}

	if(g_lol_rpanel_scroll_top_switch)
	{
		g_lol_rpanel_scroll_top_switch = false
		lol_rpanel_body.scroll(0, 0)
	}
}

/* 아이콘 변경 창 열기 */
function lol_rpanel_show_icon_change_panel()
{
	// 아이콘
	lol_rpanel_header_icon.src = ''
	lol_rpanel_header_icon.onmouseenter = image_onmouseenter
	lol_rpanel_header_icon.onmouseout = image_onmouseout
	lol_rpanel_header_icon.onmousemove = image_onmousemove

	// 글 헤더
	lol_rpanel_header_title.firstChild.nodeValue = "아이콘 제작 테스트"
	lol_rpanel_header_nick.firstChild.nodeValue = g_lol_user_info['nickname']
	lol_rpanel_header_spec.innerHTML = format('({0} 스택) 조회 <b>{1}</b>', g_lol_user_info['point'], 123)

	lol_rpanel_header_button.innerHTML = '[아이콘 테스트 중]'


	// 글 내용
	lol_rpanel_body_youtube_container.style.display = 'none'
	lol_rpanel_body_youtube_player.src = ''

	lol_rpanel_body_img1_img.src = ''
	lol_rpanel_body_img2_img.src = ''
	lol_rpanel_body_img3_img.src = ''
	lol_rpanel_body_img4_img.src = ''
	lol_rpanel_body_img1_add.setAttribute('src', '')
	lol_rpanel_body_img2_add.setAttribute('src', '')
	lol_rpanel_body_img3_add.setAttribute('src', '')
	lol_rpanel_body_img4_add.setAttribute('src', '')
	lol_rpanel_body_img1.style.display = 'none'
	lol_rpanel_body_img2.style.display = 'none'
	lol_rpanel_body_img3.style.display = 'none'
	lol_rpanel_body_img4.style.display = 'none'

	// 아이콘 변경 전용 엘리먼트 표시
	var has_no_image = !g_lol_icon_change_has_image
	lol_rpanel_body_icon_change_placeholder.style.display = has_no_image ? 'block' : 'none'
	lol_rpanel_body_icon_change_canvas_container.style.display = has_no_image ? 'none' : 'block'
	lol_rpanel_body_icon_change_size_slider.style.display = has_no_image ? 'none' : 'block'
	lol_icon_change_buttons.style.display = 'flex'

	lol_rpanel_body_body.innerHTML = "아래의 등록을 누르면 아이콘이 변경됩니다.<br/>취소버튼을 누르면 이미지를 다시 설정할 수 있습니다."
	lol_rpanel_body_date.firstChild.nodeValue = "1996-03-15 01:33:00"

	lol_rpanel_body_like.style.display = 'none'
	lol_rpanel_body_like_count.firstChild.nodeValue = '0'

	lol_rpanel_body_delete_button.style.display = 'none'
	lol_rpanel_body_share_button.style.display = 'none'

	// 댓글
	// 모든 자식 노드 삭제
	while ( lol_rpanel_reply_board_list.hasChildNodes() ) 
		lol_rpanel_reply_board_list.removeChild( lol_rpanel_reply_board_list.firstChild )

	var sample_replys = [{
		nickname: g_lol_user_info['nickname'],
		reply_date: '<font color=#903C39><b>3분전</b></font>',
		reply_title: '아이콘 테스트 댓글입니다'
	}]

	for(var e of sample_replys)
	{
		var div = document.createElement('div')
		div.classList.add('lol_reply_list_item')

		// 아이콘
		var img = document.createElement('img')
		img.toggleAttribute('icon', true)
		img.src = ''
		img.onmouseenter = image_onmouseenter
		img.onmouseout = image_onmouseout
		img.onmousemove = image_onmousemove
		div.appendChild(img)

		g_lol_icon_change_reply_icon_element = img

		var reply_body = document.createElement('div')
		reply_body.toggleAttribute('reply_body')

		// 닉/시간/삭제버튼
		var nick_container = document.createElement('div')
		nick_container.toggleAttribute('nick_container', true)

		var nick = document.createElement('div')
		nick.toggleAttribute('nick', true)
		nick.appendChild(document.createTextNode(e['nickname']))
		nick_container.appendChild(nick)

		var before = document.createElement('div')
		before.toggleAttribute('before', true)
		before.innerHTML = e['reply_date']
		nick_container.appendChild(before)

		reply_body.appendChild(nick_container)

		var text = document.createElement('div')
		text.toggleAttribute('text', true)
		text.innerHTML = e['reply_title']
		// text.appendChild(document.createTextNode(e['reply_title']))
		reply_body.appendChild(text)

		div.appendChild(reply_body)

		lol_rpanel_reply_board_list.appendChild(div)

		lol_rpanel_reply_board_write_container.style.display = 'none'

		g_lol_rpanel_scroll_top_switch = false
		lol_rpanel_body.scroll(0, 0)
	}
}

/* 댓글 이미지 클릭 (줌인, 줌아웃) */
function lol_onclick_reply_img()
{
	var element = event.currentTarget
	element.toggleAttribute('small')
}

/* 추천 버튼 */
function lol_onclick_like()
{
	if(g_lol_android_id == g_lol_guest_id)
		return

	socket.emit('lol_like', { post_seq: g_lol_current_detail['post_seq'], android_id: g_lol_android_id } )
}

/* 글 이미지 클릭 (줌인, 줌아웃) */
function lol_onclick_img()
{
	var element = event.currentTarget
	element.toggleAttribute('small')
}

/* 글 이미지 채팅에 첨부 클릭 */
function lol_onclick_img_add()
{
	event.stopPropagation()

	if(!g_nick)
		return

	var element = event.currentTarget
	var img_src = element.getAttribute('src')

	socket.emit('chat_message', { type: 'message', message: format('/img {0}', img_src), tts_hash: '' })
}

/* 작성자의 작성글 보기 */
function lol_onrclick_article_writer()
{
	event.preventDefault()

	socket.emit('lol_get_article_list_others', g_lol_current_detail.post_seq)
}

/* 이 계정에 로그인하기 버튼 또는 차단버튼 */
function lol_onclick_auth_or_block()
{
	if(g_lol_android_id == g_lol_guest_id)
	{
		// 이 계정에 로그인하기
		if(!g_lol_current_detail || g_lol_current_detail['post_seq'].length == 0)
			return

		socket.emit('lol_auth_request', g_lol_current_detail['post_seq'])
		return
	}

	// TODO: 차단하기
}

/* 이 계정에 로그인하기 버튼 또는 차단버튼 우클릭 */
function lol_onrclick_auth_or_block()
{
	// event.stopPropagation()
	
	// g_lol_search_body = ''
	// g_lol_search_mine = true
	// g_lol_search_nick = ''
	// g_lol_search_vote = false
	// g_lol_article_scroll_seq = 0
	// g_lol_article_list = []

}


/* 이 유튜브 영상을 대기열에 바로 추가 버튼 */
function lol_onclick_youtube_instant_queue()
{
	socket.emit('queue', {dj: g_nick, video_id: youtube_url_parse(g_lol_current_detail['youtube_url'])})
}

/* 글 삭제 버튼 */
function lol_onclick_delete()
{
	if(g_lol_android_id == g_lol_guest_id)
		return

	var yes = confirm('이 글을 삭제하시겠습니까?')
	if(!yes)
		return

	socket.emit('lol_delete', { android_id: g_lol_android_id, post_seq: g_lol_current_detail['post_seq'] } )
}

/* 글 공유 버튼 */
function lol_onclick_share()
{
	if(!g_nick)
		return

	var icon_img = lol_rpanel_body_share_button.getAttribute('icon_img') 
	var post_title = lol_rpanel_body_share_button.getAttribute('post_title')
	var post_reply = lol_rpanel_body_share_button.getAttribute('post_reply')
	var post_spec = lol_rpanel_body_share_button.getAttribute('post_spec')
	var post_seq = lol_rpanel_body_share_button.getAttribute('post_seq')
	
	socket.emit('chat_message', { type: 'message', message: '롤백 링크를 공유했습니다.', tts_hash: '', 
		lol_link_data: { 
			icon_img: icon_img,
			post_title: post_title,
			post_reply: post_reply,
			post_spec: post_spec,
			post_seq: post_seq
		} })
}

/* 댓글 엔터 쇼트컷 이벤트 */
function lol_onkeydown_reply()
{
	if (event.keyCode == 13)
		lol_write_reply()
}

/* 댓글 등록 버튼 이벤트 */
function lol_onclick_reply_send()
{
	lol_write_reply()
}

/* 댓글 쓰기 - 클립보드로부터 이미지 첨부 */
function lol_rpanel_reply_board_write_image_onpaste()
{
	var pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
	{
		console.log('이미지 첨부 실패: 클립보드 내용이 이미지가 아니다..')
		return
	}
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		lol_rpanel_reply_board_write_image_placeholder.style.display = 'none'
		lol_rpanel_reply_board_write_image.src = ret
		lol_rpanel_reply_board_write_image.style.display = 'block'
		lol_rpanel_reply_board_write_image_guide.innerHTML = '이미지 첨부 중... 기다려주셈'
		lol_rpanel_reply_board_write_image_guide.style.display = 'block'
	}
	reader.readAsDataURL(blob)
}

/* 댓글 쓰기 - 이미지 첨부란 불필요한 문자 입력 시 제거 처리 */
function lol_rpanel_reply_board_write_image_clear_text()
{
	lol_rpanel_reply_board_write_image_placeholder.value = ''
}

/* 댓글 쓰기 - 이미지 첨부 제거 */
function lol_clear_reply_image()
{
	g_lol_write_reply_image_data = ''
	lol_rpanel_reply_board_write_image.style.display = 'none'
	lol_rpanel_reply_board_write_image_guide.style.display = 'none'
	lol_rpanel_reply_board_write_image.src = ''
	lol_rpanel_reply_board_write_image_placeholder.style.display = 'block'
}

/* 댓글 쓰기 - 이미지 로딩 완료 이벤트 */
function lol_rpanel_reply_board_write_image_onload()
{
	lol_rpanel_reply_board_write_canvas.width = lol_rpanel_reply_board_write_image.naturalWidth
	lol_rpanel_reply_board_write_canvas.height = lol_rpanel_reply_board_write_image.naturalHeight
	lol_rpanel_reply_board_write_canvas.getContext('2d').drawImage(lol_rpanel_reply_board_write_image, 0,0)
	g_lol_write_reply_image_data = (lol_rpanel_reply_board_write_canvas.toDataURL("image/jpeg").substr(23))
	lol_rpanel_reply_board_write_image_guide.innerHTML = '이미지가 첨부 되었습니다.'
}

/* 댓글 삭제 버튼 이벤트 */
function lol_onclick_delete_reply()
{
	var element = event.currentTarget
	var reply_seq = element.getAttribute('seq')
	var post_seq = g_lol_current_detail['post_seq']
	
	socket.emit('lol_delete_reply', { android_id: g_lol_android_id, post_seq: post_seq, reply_seq: reply_seq })
}


/* 댓글 쓰기 */
function lol_write_reply()
{
	if(lol_rpanel_reply_board_input.value.length == 0)
		return

	if(g_lol_android_id == g_lol_guest_id)
		return

	socket.emit('lol_write_reply', { android_id: g_lol_android_id, post_seq: g_lol_current_detail['post_seq'], body: lol_rpanel_reply_board_input.value, image: g_lol_write_reply_image_data })
	lol_clear_reply_image()
}

/* UI 업뎃 */
function lol_panel_update()
{
	if(g_lol_panel_show)
	{
		lol_panel.style.display = 'flex'
		if(g_lol_android_id == g_lol_guest_id)
			lol_lpanel_write_button.style.display = 'none'
		lol_panel_resize()
	}
	else
	{
		lol_panel.style.display = 'none'
	}

}

function lol_panel_resize()
{
	var window_width = window.innerWidth
	var window_height = window.innerHeight
	var bottom_height = 86 // 하단 박스 높이

	// 패널 판크기 조절
	lol_panel.style.width = (window_width - mainchat_width)
	lol_panel.style.height = (window_height - bottom_height)

	lol_rpanel.style.maxWidth = (window_width - mainchat_width) - 485 // lol_panel 크기 - 왼쪽패널 크기
	lol_rpanel_body.style.height = (window_height - bottom_height - 74 - 35 - 4 - 18) // 헤더
}

/* 글 쓰기 패널 토글 */
function lol_write_panel_toggle(isShow)
{
	if(isShow)
	{
		lol_rpanel.style.display = 'none'
		lol_write.style.display = 'flex'
	}
	else
	{
		lol_rpanel.style.display = 'block'
		lol_write.style.display = 'none'
	}
}

/* 글 쓰기 - 이미지 첨부란 불필요한 문자 입력 시 제거 처리 */
async function lol_write_image_clear_text()
{
	lol_write_image_placeholder.value = ''
}

/* 글 쓰기 - 이미지 제거 */
function lol_clear_image()
{
	g_lol_write_image_data = ''
	lol_write_image.style.display = 'none'
	lol_write_image_guide.style.display = 'none'
	lol_write_image.src = ''
	lol_write_image_placeholder.style.display = 'block'
}

/* 글 쓰기 - 클립보드로부터 이미지 첨부 */
function lol_write_image_onpaste()
{
	var pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
	{
		console.log('이미지 첨부 실패: 클립보드 내용이 이미지가 아니다..')
		return
	}
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		lol_write_image_placeholder.style.display = 'none'
		lol_write_image.src = ret
		lol_write_image.style.display = 'block'
		lol_write_image_guide.innerHTML = '이미지 첨부 중... 기다려주셈'
		lol_write_image_guide.style.display = 'block'
	}
	reader.readAsDataURL(blob)
}

async function lol_write_image_onload()
{
	lol_write_canvas.width = lol_write_image.naturalWidth
	lol_write_canvas.height = lol_write_image.naturalHeight
	lol_write_canvas.getContext('2d').drawImage(lol_write_image, 0,0)
	g_lol_write_image_data = (lol_write_canvas.toDataURL("image/jpeg").substr(23))
	lol_write_image_guide.innerHTML = '이미지가 첨부 되었습니다.'
}

/* 아이콘 변경 - 클립보드로부터 이미지 첨부 */
function lol_icon_change_onpaste()
{
	var pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
	{
		console.log('이미지 첨부 실패: 클립보드 내용이 이미지가 아니다..')
		return
	}
	console.log('이미지 첨부 성공!~')
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		
		lol_rpanel_body_icon_change_placeholder.style.display = 'none'
		lol_rpanel_body_icon_change_image.src = ret
	}
	reader.readAsDataURL(blob)
}

function lol_icon_change_image_onload()
{
	g_lol_icon_change_has_image = true
	lol_rpanel_body_icon_change_placeholder.style.display = 'none'
	lol_rpanel_body_icon_change_canvas_container.style.display = 'block'
	lol_rpanel_body_icon_change_size_slider.style.display = 'block'
	
	// 드래그 정보에 대한 초기화
	g_lol_icon_change_image_width = lol_rpanel_body_icon_change_image.naturalWidth
	g_lol_icon_change_image_height = lol_rpanel_body_icon_change_image.naturalHeight
	lol_rpanel_body_icon_change_canvas.width = g_lol_icon_change_image_width
	lol_rpanel_body_icon_change_canvas.height = g_lol_icon_change_image_height

	g_lol_icon_change_canvas_context = lol_rpanel_body_icon_change_canvas.getContext('2d')
	g_lol_icon_change_canvas_context.fillStyle = '#000000'
	g_lol_icon_change_canvas_context.strokeStyle = '#ff0000'
	g_lol_icon_change_canvas_context.lineWidth = 2

	var less = g_lol_icon_change_image_height < g_lol_icon_change_image_width ? g_lol_icon_change_image_height : g_lol_icon_change_image_width
	var quarter_less = less / 4
	g_lol_icon_change_start_x = Math.floor(g_lol_icon_change_image_width / 2 - quarter_less)
	g_lol_icon_change_start_y = Math.floor(g_lol_icon_change_image_height / 2 - quarter_less)
	g_lol_icon_change_size = Math.floor(quarter_less * 2)

	lol_rpanel_body_icon_change_size_slider.max = less
	lol_rpanel_body_icon_change_size_slider.value = g_lol_icon_change_size

	lol_icon_change_canvas_draw()
}

/* 아이콘 변경 - 이미지 첨부란의 불필요한 문자 제거  */
function lol_icon_change_clear_text()
{
	lol_rpanel_body_icon_change_placeholder.value = ''
}

/* 아이콘 변경 - 현재 영역 Draw */
function lol_icon_change_canvas_draw()
{
	// g_lol_icon_change_canvas_context.clearRect()
	g_lol_icon_change_canvas_context.fillRect(0, 0, g_lol_icon_change_image_width, g_lol_icon_change_image_height)
	g_lol_icon_change_canvas_context.clearRect(g_lol_icon_change_start_x, g_lol_icon_change_start_y, g_lol_icon_change_size, g_lol_icon_change_size)
	g_lol_icon_change_canvas_context.strokeRect(g_lol_icon_change_start_x-1, g_lol_icon_change_start_y-1, g_lol_icon_change_size+2, g_lol_icon_change_size+2)

	lol_rpanel_body_icon_change_canvas_over.width = g_lol_icon_change_size
	lol_rpanel_body_icon_change_canvas_over.height = g_lol_icon_change_size
	lol_rpanel_body_icon_change_canvas_over.getContext('2d').drawImage(lol_rpanel_body_icon_change_image, g_lol_icon_change_start_x, g_lol_icon_change_start_y, g_lol_icon_change_size, g_lol_icon_change_size, 0, 0, g_lol_icon_change_size, g_lol_icon_change_size)

	var sample_png_src = lol_rpanel_body_icon_change_canvas_over.toDataURL("image/png")
	lol_rpanel_header_icon.src = sample_png_src
	g_lol_icon_change_reply_icon_element.src = sample_png_src
}

/* 아이콘 변경 - 슬라이더 이벤트 */
function lol_icon_change_slider_onchange()
{
	var max_size_w = g_lol_icon_change_image_width - g_lol_icon_change_start_x
	var max_size_h = g_lol_icon_change_image_height - g_lol_icon_change_start_y
	var new_size = Math.min(event.target.value, max_size_w, max_size_h)

	g_lol_icon_change_size = new_size
	if(new_size != event.target.value)
		event.target.value = new_size

	lol_icon_change_canvas_draw()
}

function lol_icon_change_image_onmousedown(ev) 
{
	g_lol_icon_change_drag_start_mx = ev.x
	g_lol_icon_change_drag_start_my = ev.y
	g_lol_icon_change_drag_start_x = g_lol_icon_change_start_x
	g_lol_icon_change_drag_start_y = g_lol_icon_change_start_y

	lol_rpanel_body_icon_change_global_move_panel.style.display = 'block'
}

function lol_icon_change_move_panel_onmousemove(ev)
{
	// 이미지가 실제 크기보다 작을 시 보정
	var image_size_rate = g_lol_icon_change_image_width / lol_rpanel_body_icon_change_image.width
	var diff_x = (ev.x - g_lol_icon_change_drag_start_mx) * image_size_rate
	var diff_y = (ev.y - g_lol_icon_change_drag_start_my) * image_size_rate

	if(diff_x != 0 || diff_y != 0)
	{
		g_lol_icon_change_start_x = clamp(g_lol_icon_change_drag_start_x + diff_x, 0, g_lol_icon_change_image_width - g_lol_icon_change_size)
		g_lol_icon_change_start_y = clamp(g_lol_icon_change_drag_start_y + diff_y, 0, g_lol_icon_change_image_height - g_lol_icon_change_size)

		lol_icon_change_canvas_draw()
	}
}

function lol_icon_change_move_panel_onmouseup(ev)
{
	// 이미지가 실제 크기보다 작을 시 보정
	var image_size_rate = g_lol_icon_change_image_width / lol_rpanel_body_icon_change_image.width
	var diff_x = (ev.x - g_lol_icon_change_drag_start_mx) * image_size_rate
	var diff_y = (ev.y - g_lol_icon_change_drag_start_my) * image_size_rate

	if(diff_x != 0 || diff_y != 0)
	{
		g_lol_icon_change_start_x = clamp(g_lol_icon_change_drag_start_x + diff_x, 0, g_lol_icon_change_image_width - g_lol_icon_change_size)
		g_lol_icon_change_start_y = clamp(g_lol_icon_change_drag_start_y + diff_y, 0, g_lol_icon_change_image_height - g_lol_icon_change_size)

		lol_icon_change_canvas_draw()
	}

	lol_rpanel_body_icon_change_global_move_panel.style.display = 'none'
}

/* 아이콘 변경 - 내용 클리어 */
function lol_icon_change_clear_image()
{
	g_lol_icon_change_has_image = false
	lol_rpanel_body_icon_change_image.src = ''
	lol_rpanel_body_icon_change_placeholder.style.display = 'block'
	lol_rpanel_body_icon_change_canvas_container.style.display = 'none'
	lol_rpanel_body_icon_change_size_slider.style.display = 'none'
}

function lol_icon_change_cancel()
{
	lol_icon_change_clear_image()
}

function lol_icon_change_confirm()
{
	if(!g_lol_icon_change_has_image)
		return

	if(g_lol_android_id == g_lol_guest_id)
		return

	g_lol_icon_change_image_data = (lol_rpanel_body_icon_change_canvas_over.toDataURL("image/jpeg", 1.0).substr(23))

	lol_icon_change_clear_image()

	if(g_lol_icon_change_image_data.length == 0)
		return

	socket.emit('lol_icon_change', {
		android_id: g_lol_android_id, 
		image: g_lol_icon_change_image_data
	})

	alert('아이콘 변경을 요청했습니다.')
}
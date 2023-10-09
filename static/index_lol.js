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
		{
			if(g_lol_user_memos == null)
				socket.emit('lol_get_user_memos', g_lol_android_id)
			socket.emit('lol_user_info', g_lol_android_id)
		}

		g_lol_search_body = ''
		g_lol_search_nick = ''
		g_lol_search_vote = false
		g_lol_search_mine = false
		g_lol_is_award = false
		g_lol_spec_android_id = g_lol_android_id
		lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
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
	g_lol_is_bookmark = false

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
	}
	else
	{
		// 유저 아이콘
		lol_lpanel_account_icon.src = lol_convert_uri_to_mirror(lol_get_icon_url(g_lol_user_info['iconpic'], g_lol_user_info['badge_use']))
		lol_lpanel_account_icon.style.display = 'block'
		lol_lpanel_account_icon.onmouseenter = image_onmouseenter
		lol_lpanel_account_icon.onmouseout = image_onmouseout
		lol_lpanel_account_icon.onmousemove = image_onmousemove

		// 닉네임
		lol_lpanel_account.innerHTML = format('<b>{0}</b> ({1} 스택)', g_lol_user_info['nickname'], g_lol_user_info['point'])

		// 내정보 버튼
		lol_lpanel_userinfo.style.display = 'block'
		
		// 계정메뉴 - 계정 코드 업데이트
		lol_lpanel_userinfo_menu_label_account_code.firstChild.nodeValue = lol_encode_account_code(g_lol_user_info['android_id'])
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
		img.src = lol_convert_uri_to_mirror(lol_get_icon_url(e['icon_img'], e['badge_use']))
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
		if(!e['before'])
			e['before'] = e['post_date'].substr(0, 10)
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
		if(g_lol_is_bookmark || g_lol_is_award)
			div.oncontextmenu = lol_onrclick_article

		lol_lpanel_board_list.appendChild(div)
	}
}

/* 글목록 새로고침 버튼 */
function lol_onclick_aritcle_list_refresh()
{
	if(g_lol_is_award)
		return

	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	// lol_lpanel_refresh.style.display = 'none'
	lol_lpanel_refresh.style.height = '0px'
	lol_lpanel_board.scroll(0, 0)
	if(g_lol_is_bookmark)
	{
		socket.emit('lol_query_bookmark_list', {android_id: g_lol_android_id, offset: 0, count: 30})
	}
	else
	{
		lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
	}
}

/* 글목록 패널 스크롤 이벤트 */
function lol_lpanel_board_onscroll()
{
	if(g_lol_is_award)
		return

	if(lol_lpanel_board.scrollTop + lol_lpanel_board.clientHeight + 10 >= lol_lpanel_board.scrollHeight) // 1799.63 이런식으로 1800이 채 안되는 경우가 있었음. 10정도 여유 줌.
	{
		var curTime = +new Date()
		if(curTime - g_lol_last_scroll_time >= 100)
		{
			g_lol_last_scroll_time = curTime
			if(g_lol_is_bookmark)
			{
				socket.emit('lol_query_bookmark_list', {android_id: g_lol_android_id, offset: g_lol_article_scroll_seq, count: 30})
			}
			else
			{
				lol_get_article_list(g_lol_article_scroll_seq, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
			}
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

/* 글 우클릭 -> 해당 글의 아카이브 정보 요청 */
function lol_onrclick_article()
{
	event.stopPropagation()
	event.preventDefault()

	var seq = event.currentTarget.getAttribute('seq')
	if(!seq)
	{
		console.log('seq가 없다?!', seq)
		return
	}

	if(g_lol_is_bookmark)
	{
		if(g_lol_android_id == g_lol_guest_id)
			return

		g_lol_rpanel_scroll_top_switch = true
		socket.emit('lol_query_bookmark_archived', { post_seq: seq, android_id: g_lol_android_id })
	}
	else if(g_lol_is_award)
	{
		g_lol_current_detail = lol_award_articles_body.filter(x => x['post_seq'] == seq)[0]

		lol_write_panel_toggle(false)
		lol_rpanel_refresh.style.display = 'block'
		g_lol_rpanel_scroll_top_switch = true
		lol_rpanel_update()
	}
}

/* 검색 버튼 클릭 */
function lol_onclick_search_button()
{
	if(g_lol_android_id != g_lol_guest_id)
	{
		lol_lpanel_search_menu_button_mine.firstChild.nodeValue = '내 글'
		lol_lpanel_search_menu_button_bookmark.firstChild.nodeValue = '북마크'
	}
	else
	{
		lol_lpanel_search_menu_button_mine.firstChild.nodeValue = '내 글 (로그인 필요)'
		lol_lpanel_search_menu_button_bookmark.firstChild.nodeValue = '북마크 (로그인 필요)'
	}

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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
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
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	lol_get_article_list(0, g_lol_search_vote ? 22 : 30, g_lol_search_body, g_lol_search_nick, g_lol_search_vote, g_lol_search_mine)
}

/* 검색 - 북마크 클릭 */
function lol_onclick_search_bookmark()
{
	event.stopPropagation()
	if(g_lol_android_id == g_lol_guest_id)
		return

	lol_lpanel_search_menu.style.display = 'none'
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = false
	g_lol_is_award = false
	g_lol_article_scroll_seq = 0
	g_lol_article_list = []
	g_lol_lpanel_scroll_top_switch = true
	g_lol_spec_android_id = g_lol_android_id
	g_lol_is_bookmark = true
	socket.emit('lol_query_bookmark_list', {android_id: g_lol_android_id, offset: g_lol_article_scroll_seq, count: 30})
}

var lol_award_articles_list = [
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7642551",
        "icon_img": "img_-3488732_20221029211151.jpg",
        "badge_use": "0",
        "post_title": "작성자싫으면",
        "nickname": "모코땅",
        "post_date": "2022-01-16 01:12:39   ",
        "likes": 27,
        "reply_cnt": 11,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 462,
        "before": "2022-01-16"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7954432",
        "icon_img": "img_-3714479_20221223011415.jpg",
        "badge_use": "173",
        "post_title": "조심하세요",
        "nickname": "의왕참킥",
        "post_date": "2022-12-22 17:32:11   ",
        "likes": 27,
        "reply_cnt": 1,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 400,
        "before": "2022-12-22"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7915204",
        "icon_img": "img_2511566_20220523163447.jpg",
        "badge_use": "401",
        "post_title": "삼지 칼로 찔러서 죽이고싶으면 추천",
        "nickname": "설포",
        "post_date": "2022-10-25 00:20:16   ",
        "likes": 25,
        "reply_cnt": 12,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_-8080843_20221025002018.jpg",
        "pic_multi": "",
        "views": 507,
        "before": "2022-10-25"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7885469",
        "icon_img": "img_1669257_20220119045612.jpg",
        "badge_use": "4317",
        "post_title": "니지우에 후장따줄게",
        "nickname": "남런",
        "post_date": "2022-09-14 18:30:44   ",
        "likes": 24,
        "reply_cnt": 17,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 668,
        "before": "2022-09-14"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7940335",
        "icon_img": "img_3898397_20221222162300.jpg",
        "badge_use": "4312",
        "post_title": "다 알려주겠어",
        "nickname": "핑크턱맘",
        "post_date": "2022-11-28 00:00:27   ",
        "likes": 19,
        "reply_cnt": 40,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_7653851_20221128000028.jpg",
        "pic_multi": "",
        "views": 809,
        "before": "2022-11-28"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7872085",
        "icon_img": "img_7585897_20221127180936.jpg",
        "badge_use": "0",
        "post_title": "바선생 씨발 고아년아",
        "nickname": "DM으로부탁드려요",
        "post_date": "2022-08-28 21:47:03   ",
        "likes": 19,
        "reply_cnt": 4,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 550,
        "before": "2022-08-28"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7621131",
        "icon_img": "img_-5997024_20220724203239.jpg",
        "badge_use": "104",
        "post_title": "얼랭이랑 놀아줄지 말지 튜표합시다",
        "nickname": "천아연­",
        "post_date": "2022-01-03 15:22:10   ",
        "likes": 19,
        "reply_cnt": 4,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_3617974_20220103152211.gif",
        "pic_multi": "",
        "views": 391,
        "before": "2022-01-03"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7806500",
        "icon_img": "img_-1793610_20220925185031.jpg",
        "badge_use": "",
        "post_title": "훈련소에 들어간 김네모...",
        "nickname": "안녕1",
        "post_date": "2022-06-16 06:31:54   ",
        "likes": 18,
        "reply_cnt": 9,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 768,
        "before": "2022-06-16"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7733969",
        "icon_img": "img_-1857142_20221215162840.jpg",
        "badge_use": "214",
        "post_title": "그럼 스택파밍좀하게",
        "nickname": "더즌메렁",
        "post_date": "2022-03-24 08:18:18   ",
        "likes": 18,
        "reply_cnt": 16,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_2799231_20220324081818.jpg",
        "pic_multi": "",
        "views": 481,
        "before": "2022-03-24"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7649233",
        "icon_img": "img_2511566_20220523163447.jpg",
        "badge_use": "401",
        "post_title": "요즘 삼지 안와서 좋다",
        "nickname": "토순",
        "post_date": "2022-01-19 23:44:59   ",
        "likes": 18,
        "reply_cnt": 3,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_7912530_20220119234500.jpg",
        "pic_multi": "",
        "views": 355,
        "before": "2022-01-19"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7752408",
        "icon_img": "img_-623849_20221025015556.jpg",
        "badge_use": "4320",
        "post_title": "념글 지금 봤노 ㅋㅋ",
        "nickname": "광삼123",
        "post_date": "2022-04-15 00:05:17   ",
        "likes": 17,
        "reply_cnt": 6,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 1287,
        "before": "2022-04-15"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7743373",
        "icon_img": "img_8298953_20221207012841.jpg",
        "badge_use": "0",
        "post_title": "리포네",
        "nickname": "기뮤",
        "post_date": "2022-04-04 10:41:52   ",
        "likes": 17,
        "reply_cnt": 5,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 545,
        "before": "2022-04-04"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7703654",
        "icon_img": "",
        "badge_use": "0",
        "post_title": "오타쿠 일침날리고 차단함",
        "nickname": "하이르늫4",
        "post_date": "2022-02-25 23:16:06   ",
        "likes": 17,
        "reply_cnt": 14,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "img_6002993_20220225231605.jpg/img_1938404_20220225231605.jpg/img_3164243_20220225231605.jpg/",
        "views": 515,
        "before": "2022-02-25"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7685894",
        "icon_img": "img_-3488732_20221029211151.jpg",
        "badge_use": "0",
        "post_title": "야이개씨발새끼들이ㅡ ㅋㅋㅋㅋㅋ",
        "nickname": "모코땅",
        "post_date": "2022-02-12 12:29:33   ",
        "likes": 17,
        "reply_cnt": 28,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_486348_20220212122930.jpg",
        "pic_multi": "",
        "views": 586,
        "before": "2022-02-12"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7916149",
        "icon_img": "img_721074_20221224205202.jpg",
        "badge_use": "0",
        "post_title": "오즈 븅신",
        "nickname": "안녕1",
        "post_date": "2022-10-25 18:28:31   ",
        "likes": 16,
        "reply_cnt": 4,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 386,
        "before": "2022-10-25"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7915242",
        "icon_img": "img_3897523_20220816104625.jpg",
        "badge_use": "346",
        "post_title": "이게 AI라니",
        "nickname": "프듀서22",
        "post_date": "2022-10-25 00:36:30   ",
        "likes": 16,
        "reply_cnt": 19,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_-4453710_20221025003631.jpg",
        "pic_multi": "",
        "views": 680,
        "before": "2022-10-25"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7769174",
        "icon_img": "img_3408720_20221224122142.jpg",
        "badge_use": "0",
        "post_title": "시발 개ㅈ됌ㅅ다",
        "nickname": "인공사(레알)",
        "post_date": "2022-05-04 17:01:25   ",
        "likes": 16,
        "reply_cnt": 11,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_7209136_20220504170126.jpg",
        "pic_multi": "",
        "views": 632,
        "before": "2022-05-04"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7759543",
        "icon_img": "img_2511566_20220523163447.jpg",
        "badge_use": "401",
        "post_title": "2022 유행어 등재 요청",
        "nickname": "극단적웃음주의자",
        "post_date": "2022-04-23 12:00:10   ",
        "likes": 16,
        "reply_cnt": 10,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_3078014_20220423030011.jpg",
        "pic_multi": "",
        "views": 561,
        "before": "2022-04-23"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7948746",
        "icon_img": "img_-3809421_20221217134325.jpg",
        "badge_use": "4317",
        "post_title": "..",
        "nickname": "유동Vsss58P2",
        "post_date": "2022-12-12 16:32:52   ",
        "likes": 15,
        "reply_cnt": 18,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "img_-7332510_20221212163252.jpg",
        "pic_multi": "",
        "views": 825,
        "before": "2022-12-12"
    },
    {
        "Owner": "4845f22a85cfb889",
        "post_seq": "7789318",
        "icon_img": "img_-6642295_20221217101123.jpg",
        "badge_use": "0",
        "post_title": "2시간뒤 무시로글 예상",
        "nickname": "프라이드",
        "post_date": "2022-05-29 17:17:49   ",
        "likes": 15,
        "reply_cnt": 2,
        "youtube_url": "",
        "doodlr": "0",
        "pic_new": "",
        "pic_multi": "",
        "views": 457,
        "before": "2022-05-29"
    }
]

var lol_award_articles_body = [
	{
		"post_seq": "7642551",
		"icon_img": "img_-3488732_20221029211151.jpg",
		"badge_use": "0",
		"post_title": "작성자싫으면",
		"nickname": "모코땅",
		"post_date": "2022-01-16 01:12:39   ",
		"likes": 27,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13126635",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "ㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴㄴ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13126636",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "미친새기마냥개추"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3488732_20221029211151.jpg",
				"nickname": "모코땅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13126638",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "흠.."
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "슬비♡",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13127444",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "전 모코땅님이 안갔으면좋겠어요"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13128512",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "누구냐진짜"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "하사(진)연님",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13128523",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "누가울쟈기괴롭심？"
			},
			{
				"my_post": "0",
				"icon_img": "img_5698659_20220401224440.jpg",
				"nickname": "복받으세요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13128672",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "에휴 어떤 악질유저가 모코땅님 괴롭혀 ㅉ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13129090",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "누구얌;"
			},
			{
				"my_post": "0",
				"icon_img": "img_7960635_20220124235147.jpg",
				"nickname": "쌈바마초펌킨",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13129249",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-16&lt;/font&gt;",
				"reply_title": "누가 추천누러"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1793610_20220925185031.jpg",
				"nickname": "안녕1",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13132098",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-17&lt;/font&gt;",
				"reply_title": "추천레전드"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7272299_20220207092420.jpg",
				"nickname": "유동c5eb93",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13132422",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-17&lt;/font&gt;",
				"reply_title": "자게인원이 이렇게많나"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "빨리군대로꺼졌으연</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> https://youtu.be/qNWtA9w1y9w</small></big></font>",
		"views": 462,
		"doodlrurls": "",
		"fixedpic": "img_-568186_20221217053949.jpg",
		"stack": "(183099 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7954432",
		"icon_img": "img_-3714479_20221223011415.jpg",
		"badge_use": "173",
		"post_title": "조심하세요",
		"nickname": "의왕참킥",
		"post_date": "2022-12-22 17:32:11   ",
		"likes": 27,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_-3714479_20221223011415.jpg",
				"nickname": "의왕참킥",
				"badge_use": "173",
				"reply_img": "",
				"reply_seq": "13741875",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-22&lt;/font&gt;",
				"reply_title": ".."
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "댓글없이 추천만있는글을 조심하세요",
		"views": 400,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(10230 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7915204",
		"icon_img": "img_2511566_20220523163447.jpg",
		"badge_use": "401",
		"post_title": "삼지 칼로 찔러서 죽이고싶으면 추천",
		"nickname": "설포",
		"post_date": "2022-10-25 00:20:16   ",
		"likes": 25,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671838",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "타다다ㅏ다다ㅏ닥"
			},
			{
				"my_post": "0",
				"icon_img": "img_5461074_20221218150302.jpg",
				"nickname": "너란걸알고있었어",
				"badge_use": "492",
				"reply_img": "",
				"reply_seq": "13671839",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "추천개잘오르농"
			},
			{
				"my_post": "0",
				"icon_img": "img_3610060_20221222231236.jpg",
				"nickname": "그런갑다",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671840",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "추신수 홈런ㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_9251872_20221118022800.jpg",
				"nickname": "머긁뾰긁견",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671841",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3897523_20220816104625.jpg",
				"nickname": "프듀서22",
				"badge_use": "346",
				"reply_img": "img_-26313_20221025002058.jpg",
				"reply_seq": "13671843",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "- "
			},
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13671852",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "비상 비상"
			},
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13671853",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "하늘로 비상"
			},
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671995",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": " 양지비상"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13673427",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "프라이드군은 끝나고 남으세요"
			},
			{
				"my_post": "0",
				"icon_img": "img_721074_20221224205202.jpg",
				"nickname": "안녕1",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13673554",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "img_-33130_20221025180516.jpg",
				"reply_seq": "13674212",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "비상！！！ 비상！！！"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "괴구리",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13675059",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "w댓내"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_-8080843_20221025002018.jpg",
		"pic_multi": "",
		"post_text": "삼지는 내가 5년 정도 봤는데 교화 가능성이 없는거같음",
		"views": 507,
		"doodlrurls": "",
		"fixedpic": "img_-5905806_20221012154610.jpg",
		"stack": "(235268 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7885469",
		"icon_img": "img_1669257_20220119045612.jpg",
		"badge_use": "4317",
		"post_title": "니지우에 후장따줄게",
		"nickname": "남런",
		"post_date": "2022-09-14 18:30:44   ",
		"likes": 24,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_4154151_20221121210910.jpg",
				"nickname": "니지우에",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614663",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "？？？"
			},
			{
				"my_post": "0",
				"icon_img": "img_4154151_20221121210910.jpg",
				"nickname": "니지우에",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614678",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "이글 추천누르지마세요"
			},
			{
				"my_post": "0",
				"icon_img": "img_8298953_20221207012841.jpg",
				"nickname": "기뮤",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614733",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "추천"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "밋쯔",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13614791",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "오.."
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614792",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "캬 "
			},
			{
				"my_post": "0",
				"icon_img": "img_3610060_20221222231236.jpg",
				"nickname": "금느",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614793",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "캬역시똥남런이다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3488732_20221029211151.jpg",
				"nickname": "모코땅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614808",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "씨발내거야"
			},
			{
				"my_post": "0",
				"icon_img": "img_4154151_20221121210910.jpg",
				"nickname": "니지우에",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13614819",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "먼 미친소리에요 "
			},
			{
				"my_post": "0",
				"icon_img": "img_8390610_20220912115407.jpg",
				"nickname": "기뮤,",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13615006",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "니지우에댓글자꾸확인하는거소름"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "밋쯔",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13615012",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-14&lt;/font&gt;",
				"reply_title": "인정"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "밋쯔",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13615174",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "니쥬엥"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "행복한동물세상",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13615188",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "니지두에와 창런 ㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "밋쯔",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13615251",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "웽 "
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "에낫",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13615891",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "쥬웽"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13615916",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "두창"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "에낫",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13617221",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-15&lt;/font&gt;",
				"reply_title": "인정"
			},
			{
				"my_post": "0",
				"icon_img": "img_1978972_20221224210635.jpg",
				"nickname": "다정이",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13618455",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-09-16&lt;/font&gt;",
				"reply_title": "어른이 되는거야"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "ㅇㅇ</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> 한마디</small></big></font>",
		"views": 668,
		"doodlrurls": "",
		"fixedpic": "img_-4865115_20221130103536.jpg",
		"stack": "(958216 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7940335",
		"icon_img": "img_3898397_20221222162300.jpg",
		"badge_use": "4312",
		"post_title": "다 알려주겠어",
		"nickname": "핑크턱맘",
		"post_date": "2022-11-28 00:00:27   ",
		"likes": 19,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_-3633027_20221224215401.jpg",
				"nickname": "토네이도초코쿠키",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718628",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생일축하"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "설포",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13718630",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생일축하"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8715349_20221219102236.jpg",
				"nickname": "김밥맛",
				"badge_use": "418",
				"reply_img": "",
				"reply_seq": "13718631",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "미친씨빨"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13718633",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "코코로 생일 뭐냐고~！"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5471063_20221030202900.jpg",
				"nickname": "군꺽샤싱",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718635",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "오늘은 유어데이"
			},
			{
				"my_post": "0",
				"icon_img": "img_1978972_20221224210635.jpg",
				"nickname": "다정이",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13718640",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생일축하~"
			},
			{
				"my_post": "0",
				"icon_img": "img_4405889_20221106151102.jpg",
				"nickname": "김덕배",
				"badge_use": "475",
				"reply_img": "",
				"reply_seq": "13718642",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하합니다(히요코톤으로"
			},
			{
				"my_post": "0",
				"icon_img": "img_5698659_20220401224440.jpg",
				"nickname": "복받으세요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718644",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "정말축하행"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공샤샤샥",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718646",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "오메데토"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "img_81005_20221128002025.jpg",
				"reply_seq": "13718648",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하합니다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13718666",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생일축하해코코로"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3679224_20221005225918.jpg",
				"nickname": "리포네",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718668",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "https://youtu.be/E7YPOGfdwVY"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3714479_20221223011415.jpg",
				"nickname": "判定",
				"badge_use": "173",
				"reply_img": "",
				"reply_seq": "13718674",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하합니다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-623849_20221025015556.jpg",
				"nickname": "오늘내생일2",
				"badge_use": "4320",
				"reply_img": "",
				"reply_seq": "13718689",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하합니다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9703572_20221223114900.jpg",
				"nickname": "메꿍",
				"badge_use": "189",
				"reply_img": "",
				"reply_seq": "13718712",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하햏"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "육수",
				"badge_use": "0",
				"reply_img": "img_-22432_20221128032308.jpg",
				"reply_seq": "13718750",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "축하"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13718782",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생일축하"
			},
			{
				"my_post": "0",
				"icon_img": "img_4154151_20221121210910.jpg",
				"nickname": "니지우에",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718816",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "생ㅇ리축하해"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13718871",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "니지우에오타컨셉**"
			},
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718890",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "준서군 축하하네"
			},
			{
				"my_post": "0",
				"icon_img": "img_3898397_20221222162300.jpg",
				"nickname": "울어라지옥참치통",
				"badge_use": "4312",
				"reply_img": "",
				"reply_seq": "13718917",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "응 생일지나도 안내릴거야 ㅂㄷㅂㄷ？ 앙 로모띠 로이조식 추천즐찾 "
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13718927",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "구독과좋아요알람설정추천과즐겨찾기까지앙기뮤"
			},
			{
				"my_post": "0",
				"icon_img": "img_-302775_20221112111054.jpg",
				"nickname": "종건급고졸",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13718979",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "안지나도 그냥 내려라"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3488732_20221029211151.jpg",
				"nickname": "모코땅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719224",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "준서야축하한다이기"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "바위처럼말랑하게",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719261",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-28&lt;/font&gt;",
				"reply_title": "준서뽀뽀쪽"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "육수",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719926",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "지 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "육수",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719928",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "으 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "육수",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719930",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "글 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "육수",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13719933",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "리 "
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13719955",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "캬！！！@@@@@@@！！！！@@！！！！！！"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13720229",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "생！！！！@@@！！일！！@@@！！！！@@@！！！"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13720401",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "축하해！！！@@@！！！@@@@@@！！！@！！！@@@！！！"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공샤샤샥",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13720433",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "지났으면 "
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13720441",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "내리긴.뭘.내려.변기.물이나.내리라"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13720498",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "호날두 감다뒤졋네 작작해라"
			},
			{
				"my_post": "0",
				"icon_img": "img_3898397_20221222162300.jpg",
				"nickname": "울어라지옥참치통",
				"badge_use": "4312",
				"reply_img": "img_2329054_20221129090733.jpg",
				"reply_seq": "13720720",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "오니니나레"
			},
			{
				"my_post": "0",
				"icon_img": "img_3123166_20221212193128.jpg",
				"nickname": "보고있어요",
				"badge_use": "191",
				"reply_img": "",
				"reply_seq": "13720805",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "생일지났으면글내려라"
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "머신건소녀는우울을쏜다",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13720829",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "생일축하해"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13720840",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-11-29&lt;/font&gt;",
				"reply_title": "뭐？"
			},
			{
				"my_post": "0",
				"icon_img": "img_9251872_20221118022800.jpg",
				"nickname": "카미사토류",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13723422",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-01&lt;/font&gt;",
				"reply_title": "축하합니다"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_7653851_20221128000028.jpg",
		"pic_multi": "",
		"post_text": "왇물원 프리터",
		"views": 809,
		"doodlrurls": "",
		"fixedpic": "img_3846606_20221224153925.jpg",
		"stack": "(3397 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7872085",
		"icon_img": "img_7585897_20221127180936.jpg",
		"badge_use": "0",
		"post_title": "바선생 씨발 고아년아",
		"nickname": "DM으로부탁드려요",
		"post_date": "2022-08-28 21:47:03   ",
		"likes": 19,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_9251872_20221118022800.jpg",
				"nickname": "혜은",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13588485",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-08-28&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13588599",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-08-28&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13588714",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-08-29&lt;/font&gt;",
				"reply_title": "시끄럽게올라가는추천수"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13588725",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-08-29&lt;/font&gt;",
				"reply_title": "좆됐네이거"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "내가 너 또그러면 패죽인다했지",
		"views": 550,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(19332 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7621131",
		"icon_img": "img_-5997024_20220724203239.jpg",
		"badge_use": "104",
		"post_title": "얼랭이랑 놀아줄지 말지 튜표합시다",
		"nickname": "천아연­",
		"post_date": "2022-01-03 15:22:10   ",
		"likes": 19,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13076740",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-03&lt;/font&gt;",
				"reply_title": "조용필"
			},
			{
				"my_post": "0",
				"icon_img": "img_-4538849_20220903002125.jpg",
				"nickname": "고은",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13076741",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-03&lt;/font&gt;",
				"reply_title": "잔인하게 올 차단해서 지혼자 글쓰게합시다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9253421_20221104012304.jpg",
				"nickname": "얼랭님",
				"badge_use": "265",
				"reply_img": "",
				"reply_seq": "13076746",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-03&lt;/font&gt;",
				"reply_title": "주작기 ㄴㄴ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13082188",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-04&lt;/font&gt;",
				"reply_title": "헉 "
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_3617974_20220103152211.gif",
		"pic_multi": "",
		"post_text": "놀아줘야 된다고 생각하면 비추\r\n\r\n아니라 생각하면 개추",
		"views": 391,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(9283 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7806500",
		"icon_img": "img_-1793610_20220925185031.jpg",
		"badge_use": "",
		"post_title": "훈련소에 들어간 김네모...",
		"nickname": "안녕1",
		"post_date": "2022-06-16 06:31:54   ",
		"likes": 18,
		"replys": [
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "만악의정원",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13459078",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8298953_20221207012841.jpg",
				"nickname": "기뮤",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13459079",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13459080",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3132020_20221026210704.jpg",
				"nickname": "seXxXxX",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13459082",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "여름이라 초코바 다 녹을거같은데요.."
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "만악의정원",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13459083",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "만악의정원",
				"badge_use": "401",
				"reply_img": "img_7961031_20220615213514.jpg",
				"reply_seq": "13459085",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "참고로 뒤에 서있던 건 이 남성"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13459094",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "난바빠"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13459228",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋ 미치겠네 진자 ㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8329054_20221204131625.jpg",
				"nickname": "에양",
				"badge_use": "159",
				"reply_img": "",
				"reply_seq": "13459451",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-06-16&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ시발"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "훈련 뒤에 잠시 주어진 휴식시간.\r\n\r\n병사들은 저마다 각자의 방법으로 피로를 풀어내고있다.\r\n\r\n\r\n′아~ 피자먹고싶다.′\r\n\r\n′나는 짜장면.′\r\n\r\n\r\n시시콜콜한 이야기들을 주고받는 병사들을 뒤로 한채 김네모는 외진 곳으로 발걸음을 옮겼다.\r\n\r\n\r\n′븅신들.′\r\n\r\n\r\n바스락ㅡ\r\n\r\n김네모의 허리춤으로부터 익숙한 소리가 들려온다.\r\n\r\n그건 바로 며칠 전 부식으로 받은 초코바의 포장지 소리.\r\n\r\n남들은 받자마자 눈이 뒤집힌채 허겁지겁 먹어버렸지만, 김네모는 달랐다.\r\n\r\n힘든 훈련이 끝나고 난 뒤에 먹기위해 영겁의 시간을 버텨낸 것이다.\r\n\r\n이게 만약 마시멜로 실험이었다면, 아마 손에 가득 담아도 넘쳐날 정도의 마시멜로를 받았겠지.\r\n\r\n\r\n그가 천천히 초코바를 꺼내들었다.\r\n\r\n포장지를 벗긴다.\r\n\r\n조심조심.\r\n\r\n조금이라도 손실되는 부분이 없도록.\r\n\r\n부드럽게.\r\n\r\n입에 넣는다.\r\n\r\n\r\n순식간에 가득 퍼지는 초코 향, 그와 동시에 은은하게 초코 향을 감싸 안는 아몬드의 고소한 맛.\r\n\r\n한 입 더 베어 물자 아몬드 안에 감춰져있던 짭짤한 맛까지.\r\n\r\n기존의 맛과 합쳐져 만들어진, 이른바 맛의 쓰나미가 혀를 덮쳐온다.\r\n\r\n\r\n′크크크크크크크크큭.′\r\n\r\n\r\n노래가 절로 튀어나온다.\r\n\r\n\r\n′난바빠 노무바빠...′\r\n\r\n\r\n헉！\r\n\r\n본능적으로 가장 신난다고 생각했던 노래가 튀어나왔다.\r\n\r\n하지만 이는 다른 사람에게 절대로 들켜선안될 금단의 노래.\r\n\r\n혹시나 누군가 들었을까 재빠르게 주위를 살핀다.\r\n\r\n그 때, 나지막하게 들려오는 목소리.\r\n\r\n\r\n′따악 따악 따악 따악′\r\n\r\n\r\n급하게 뒤돌아본 김네모의 눈에 비친건 너무나도 익숙한 실루엣.\r\n\r\n반복된 학습은 기억하기에 가장 효과적이라 했던가.\r\n\r\n자유게시판을 이용하며 수도 없이 보았던 [누군가]를 표현한 그림.\r\n\r\n\r\n′...프라이드？′\r\n\r\n\r\n김네모의 입에서 너무나도 자연스럽게 튀어나온 한마디였다.\r\n",
		"views": 768,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(11194 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7733969",
		"icon_img": "img_-1857142_20221215162840.jpg",
		"badge_use": "214",
		"post_title": "그럼 스택파밍좀하게",
		"nickname": "더즌메렁",
		"post_date": "2022-03-24 08:18:18   ",
		"likes": 18,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13325300",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "축하합니다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3714479_20221223011415.jpg",
				"nickname": "우동furhcu23",
				"badge_use": "173",
				"reply_img": "",
				"reply_seq": "13325306",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "축하합니다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9253421_20221104012304.jpg",
				"nickname": "얼랭님",
				"badge_use": "265",
				"reply_img": "",
				"reply_seq": "13325308",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "탄죠비 오메데토~"
			},
			{
				"my_post": "0",
				"icon_img": "img_3897523_20220816104625.jpg",
				"nickname": "프듀서22",
				"badge_use": "346",
				"reply_img": "",
				"reply_seq": "13325310",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "와캬퍄"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8329054_20221204131625.jpg",
				"nickname": "로하이",
				"badge_use": "159",
				"reply_img": "",
				"reply_seq": "13325355",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "앙♡♡♡♡"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "시노다하지메",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13325363",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "와오"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3633027_20221224215401.jpg",
				"nickname": "토네이도초코쿠키",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13325414",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "생일축하"
			},
			{
				"my_post": "0",
				"icon_img": "img_8390610_20220912115407.jpg",
				"nickname": "기뮤,",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13325521",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "콩 그레 츄 레이션 아아"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "웃지마",
				"badge_use": "161",
				"reply_img": "",
				"reply_seq": "13325592",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "추카추카"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "비챤",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13325690",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "연시신아 축하혀"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13325717",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "오우"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13325873",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "연님 생일 뭐냐고~！"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3679224_20221005225918.jpg",
				"nickname": "리포네",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13326084",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "연신 축하함을 호소"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13326368",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-24&lt;/font&gt;",
				"reply_title": "오메데토"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8329054_20221204131625.jpg",
				"nickname": "로하이",
				"badge_use": "159",
				"reply_img": "",
				"reply_seq": "13326688",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-25&lt;/font&gt;",
				"reply_title": "생일지났으면 글내려라"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13328160",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-26&lt;/font&gt;",
				"reply_title": "내리라"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_2799231_20220324081818.jpg",
		"pic_multi": "",
		"post_text": "추천좀수금할게</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> 송하빵 갤러리 Here We Go</small></big></font>",
		"views": 481,
		"doodlrurls": "",
		"fixedpic": "img_-3889001_20221204220450.jpg",
		"stack": "(6903 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7649233",
		"icon_img": "img_2511566_20220523163447.jpg",
		"badge_use": "401",
		"post_title": "요즘 삼지 안와서 좋다",
		"nickname": "토순",
		"post_date": "2022-01-19 23:44:59   ",
		"likes": 18,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13142678",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-19&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_5117593_20220205010424.jpg",
				"nickname": "도아가",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13144609",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-20&lt;/font&gt;",
				"reply_title": "돌아오지 마라 북한에서 살아라"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13153207",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-01-23&lt;/font&gt;",
				"reply_title": "끼야아아악"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_7912530_20220119234500.jpg",
		"pic_multi": "",
		"post_text": "\r\n\r\n진짜 행복하다",
		"views": 355,
		"doodlrurls": "",
		"fixedpic": "img_-5905806_20221012154610.jpg",
		"stack": "(235268 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7752408",
		"icon_img": "img_-623849_20221025015556.jpg",
		"badge_use": "4320",
		"post_title": "념글 지금 봤노 ㅋㅋ",
		"nickname": "광삼123",
		"post_date": "2022-04-15 00:05:17   ",
		"likes": 17,
		"replys": [
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "극단적웃음주의자",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13358561",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "ㅈ됐네 이거"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13358562",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "념글 나도봊ㄴ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9253421_20221104012304.jpg",
				"nickname": "얼랭님",
				"badge_use": "265",
				"reply_img": "",
				"reply_seq": "13358563",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "힝구"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13358564",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "념글 좌표좀"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "슬비빅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13358626",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "싸우지망...."
			},
			{
				"my_post": "0",
				"icon_img": "img_-3714479_20221223011415.jpg",
				"nickname": "미닝허트",
				"badge_use": "173",
				"reply_img": "",
				"reply_seq": "13359817",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-15&lt;/font&gt;",
				"reply_title": "음 "
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "\r\n\r\n전판 탑에서 상대 어거지 4인갱 줫나오는거\r\n\r\n버티고 있는거만해도 좆같은데\r\n\r\n채팅으로 쓰레기라인 안감 이지랄하는거\r\n\r\n열받아도 내가 채팅 하나라도 침 ㅇㅇ ？\r\n\r\n내로남불 씹 ㅋㅋ\r\n\r\n안그래도 그판 좆같은거 분위기 곱창날까봐\r\n\r\n채팅 걍 안치고 있었는데\r\n\r\n그담판에\r\n\r\n야스오 유미봇듀\r\n\r\n초반에 더블킬따고 주도권 꽉쥐고 있는 상태라\r\n\r\n상대 여행다녀도\r\n\r\n걍 바텀 다이브킬 내는게 더맞다 판단했고\r\n\r\n그때 그라가스 정글도 말려서\r\n\r\n캠프돌기 바쁜데\r\n\r\n캠프돌기바쁜 그라가스를 탈까 ？\r\n\r\n타면 정글도는거 옆에서 구경함？\r\n\r\n그렇다고 유미가 미드까지 걸어서 로밍갈까 ？\r\n\r\n그때 팀 전체적으로 말린상태라\r\n\r\n바텀 다이브 트라이해서 도박이라도 안걸면\r\n\r\n그대로 겜질상황인데\r\n\r\n다이브중에 미스나온거랑\r\n\r\n렝가 탑버리고 뛰어서 로밍온거\r\n\r\n그거때매 바텀 밀렸구만 뭔 애미 씨발뒤진 소리임 ㅋㅋ\r\n\r\n그리고 니 중간에 바텀 그따구로 하지말라고 채팅친거\r\n\r\n그상황 난 귀환탐이라 집잡았고\r\n\r\n야스오 혼자 다이브치다 죽은건데\r\n\r\n그것도 나보고 한말임 씨발그럼 ㅋㅋ ？\r\n\r\n난 그 채팅 이후로 미드랑 정글 붙음 ㅇㅇ\r\n\r\n그러다 겜지고\r\n\r\n채팅으로 유미 그따구로 하지말라고 좆지랄하면\r\n\r\n친삭이 마렵냐 안마렵냐 ㅋㅋ\r\n\r\n니 중간에 첫번째 챗 칠때 바텀 상황 본건지 안본건지 모르겠지만\r\n\r\n그건 나 집탐일때 야스오 혼자 다이브친거임 븅신아 ㅋㅋ\r\n\r\n야스오도 싸잡아서 뭐라해야되는데 라에라서 욕하기는 싫고 그마인드 아님 ㅇㅇ？\r\n\r\n설령 내판단이 틀렸다고 쳐도\r\n\r\n충분히 납득가능한 판단이었고\r\n\r\n그렇게따지면 전판 니 탑 배제하고 플레이할때\r\n\r\n만약 다른데서 다이브치다 액시던트 나서 겜졌으면 ㅇㅇ？\r\n\r\n애초에 갤큐하면서 억울한상황 좆같은상황 한두번 나온게 아닌데\r\n\r\n갤큐니까 다들 걍 참고 하는거임 \r\n\r\n저스트 게임이니까 ㅇㅇ \r\n\r\n근데 씨발 채팅창 혼자쓰면서 범인찾기하는게 맞는거임 ㅇㅇ？\r\n\r\n열심히 안하기라도 했나 진짜 좆같네 ㅋㅋ\r\n\r\n내로남불도 정도껏해야지 \r\n\r\n에라이 씨발 ㅋ",
		"views": 1287,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(37739 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7743373",
		"icon_img": "img_8298953_20221207012841.jpg",
		"badge_use": "0",
		"post_title": "리포네",
		"nickname": "기뮤",
		"post_date": "2022-04-04 10:41:52   ",
		"likes": 17,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_5698659_20220401224440.jpg",
				"nickname": "복받으세요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13342145",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-04&lt;/font&gt;",
				"reply_title": "헉 "
			},
			{
				"my_post": "0",
				"icon_img": "img_5698659_20220401224440.jpg",
				"nickname": "복받으세요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13342146",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-04&lt;/font&gt;",
				"reply_title": "추천주작머고"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3679224_20221005225918.jpg",
				"nickname": "리포네",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13342158",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-04&lt;/font&gt;",
				"reply_title": "ㄲㅈ라"
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "매우살찐돼지",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13342343",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-04&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "극단적웃음주의자",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13343178",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-05&lt;/font&gt;",
				"reply_title": "리포네우는중"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "좆만한련이 자꾸 깝치네 꺼져 그냥 ",
		"views": 545,
		"doodlrurls": "",
		"fixedpic": "img_2905746_20221029042744.jpg",
		"stack": "(1392 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7703654",
		"icon_img": "",
		"badge_use": "0",
		"post_title": "오타쿠 일침날리고 차단함",
		"nickname": "하이르늫4",
		"post_date": "2022-02-25 23:16:06   ",
		"likes": 17,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_3897523_20220816104625.jpg",
				"nickname": "프듀서22",
				"badge_use": "346",
				"reply_img": "",
				"reply_seq": "13264549",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-2954838_20220818202033.jpg",
				"nickname": "오네가이이",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13264559",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-25&lt;/font&gt;",
				"reply_title": "폐급과 폐급의 대결이네"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8919624_20220717183037.jpg",
				"nickname": "샤르프르젝트",
				"badge_use": "130",
				"reply_img": "",
				"reply_seq": "13264576",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-25&lt;/font&gt;",
				"reply_title": "폐폐대"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13264578",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3123166_20221212193128.jpg",
				"nickname": "맙소사사사",
				"badge_use": "191",
				"reply_img": "",
				"reply_seq": "13264587",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13264720",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "ㅈㄴ웃기네"
			},
			{
				"my_post": "0",
				"icon_img": "img_7268413_20220311113020.jpg",
				"nickname": "혜은",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13264848",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "캬 "
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13264958",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_7960635_20220124235147.jpg",
				"nickname": "쌈바마초펌킨",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13265462",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_5879602_20210523093929.jpg",
				"nickname": "천향",
				"badge_use": "162",
				"reply_img": "",
				"reply_seq": "13265621",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "와 ㄹㅇ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9088505_20220911005750.jpg",
				"nickname": "빵구워요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13266151",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-26&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13267921",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-27&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7272299_20220207092420.jpg",
				"nickname": "아유무",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13269146",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-28&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13271581",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-03-01&lt;/font&gt;",
				"reply_title": "역시 하이르늫"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "img_6002993_20220225231605.jpg/img_1938404_20220225231605.jpg/img_3164243_20220225231605.jpg/",
		"post_text": "진짜 저런얘들은 군대부터 느끼는건데\r\n\r\n과학이더라",
		"views": 515,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(13103 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7685894",
		"icon_img": "img_-3488732_20221029211151.jpg",
		"badge_use": "0",
		"post_title": "야이개씨발새끼들이ㅡ ㅋㅋㅋㅋㅋ",
		"nickname": "모코땅",
		"post_date": "2022-02-12 12:29:33   ",
		"likes": 17,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_7268413_20220311113020.jpg",
				"nickname": "혜은",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13225696",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "캬 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "매우살찐돼지",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225698",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "키키키"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13225700",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㄷㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_7026071_20221113151816.jpg",
				"nickname": "샤르룽",
				"badge_use": "337",
				"reply_img": "",
				"reply_seq": "13225702",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "자드가자익"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225711",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "시원하잇"
			},
			{
				"my_post": "0",
				"icon_img": "img_3897523_20220816104625.jpg",
				"nickname": "프듀서22",
				"badge_use": "346",
				"reply_img": "",
				"reply_seq": "13225713",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋ "
			},
			{
				"my_post": "0",
				"icon_img": "img_-8919624_20220717183037.jpg",
				"nickname": "소추",
				"badge_use": "130",
				"reply_img": "",
				"reply_seq": "13225716",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "이녀석머리가www"
			},
			{
				"my_post": "0",
				"icon_img": "img_1669257_20220119045612.jpg",
				"nickname": "남런",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13225723",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅈ댓다~~~~"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "토순",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13225739",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅠㅠ"
			},
			{
				"my_post": "0",
				"icon_img": "img_4130156_20220209234111.jpg",
				"nickname": "POIU",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225741",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_6368779_20210719125818.jpg",
				"nickname": "M?L",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225745",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅈ댓다 "
			},
			{
				"my_post": "0",
				"icon_img": "img_-7272299_20220207092420.jpg",
				"nickname": "아유무",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225766",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "개ㅈ댓다ㅅㅂ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13225767",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "멋있다 ㄹㅇ"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "코리밋_____",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225811",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "가보자가보자"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13225821",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "시원~허이"
			},
			{
				"my_post": "0",
				"icon_img": "img_5698659_20220401224440.jpg",
				"nickname": "복받으세요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225835",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3633027_20221224215401.jpg",
				"nickname": "토네이도초코쿠키",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13225950",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13226004",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "캬 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "슬비♡",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13226446",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "잘가라 모코따땅"
			},
			{
				"my_post": "0",
				"icon_img": "img_881420_20220212101157.jpg",
				"nickname": "체리마루",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13226773",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ하"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1551738_20220112091856.jpg",
				"nickname": "이렐리아vv",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13226869",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "대머리다ㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "시노다하지메",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13226942",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13227139",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-12&lt;/font&gt;",
				"reply_title": "으악 1명더간다"
			},
			{
				"my_post": "0",
				"icon_img": "img_7960635_20220124235147.jpg",
				"nickname": "쌈바마초펌킨",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13228183",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-13&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_5561388_20220908163501.jpg",
				"nickname": "취중진담",
				"badge_use": "457",
				"reply_img": "",
				"reply_seq": "13228445",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-13&lt;/font&gt;",
				"reply_title": "푸하하하하하"
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "매우살찐돼지",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13233835",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-14&lt;/font&gt;",
				"reply_title": "입대했으면글내려라"
			},
			{
				"my_post": "0",
				"icon_img": "img_881420_20220212101157.jpg",
				"nickname": "딸기도넛",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13234456",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-14&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ매살돼 미친"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13237547",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-02-15&lt;/font&gt;",
				"reply_title": "글내려라"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_486348_20220212122930.jpg",
		"pic_multi": "",
		"post_text": "ㅋㅋㅋㅋㅋㅋ</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> https://youtu.be/qNWtA9w1y9w</small></big></font>",
		"views": 586,
		"doodlrurls": "",
		"fixedpic": "img_-568186_20221217053949.jpg",
		"stack": "(183099 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7916149",
		"icon_img": "img_721074_20221224205202.jpg",
		"badge_use": "0",
		"post_title": "오즈 븅신",
		"nickname": "안녕1",
		"post_date": "2022-10-25 18:28:31   ",
		"likes": 16,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13675343",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-26&lt;/font&gt;",
				"reply_title": "1빠！！！！！！！！！！"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13675567",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-26&lt;/font&gt;",
				"reply_title": "ㄷㅊ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13675631",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-26&lt;/font&gt;",
				"reply_title": "니나닥쳐"
			},
			{
				"my_post": "0",
				"icon_img": "img_8298953_20221207012841.jpg",
				"nickname": "기뮤",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13678674",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-28&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "븅신",
		"views": 386,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(5783 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7915242",
		"icon_img": "img_3897523_20220816104625.jpg",
		"badge_use": "346",
		"post_title": "이게 AI라니",
		"nickname": "프듀서22",
		"post_date": "2022-10-25 00:36:30   ",
		"likes": 16,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "머신건소녀는우울을쏜다",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671906",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_9251872_20221118022800.jpg",
				"nickname": "머긁뾰긁견",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671909",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "사람의꿈은끝나지않아",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671911",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅇ？！"
			},
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671912",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "설포",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13671913",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-623849_20221025015556.jpg",
				"nickname": "광삼123",
				"badge_use": "4320",
				"reply_img": "",
				"reply_seq": "13671914",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "설포",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13671915",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㄹㅇ ㅈㄴ웃기네 ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_4405889_20221106151102.jpg",
				"nickname": "김덕배",
				"badge_use": "475",
				"reply_img": "",
				"reply_seq": "13671919",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3132020_20221026210704.jpg",
				"nickname": "동인남인서인북인",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671924",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅌㅌㅌㅌㅌㅌ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3633027_20221224215401.jpg",
				"nickname": "토네이도초코쿠키",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13671925",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9253421_20221104012304.jpg",
				"nickname": "얼랭님",
				"badge_use": "265",
				"reply_img": "",
				"reply_seq": "13671938",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13671978",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13671988",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋ 개잘했다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13672011",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "zzzzzzzzzzz"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13673423",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "숭배합니다 Goat"
			},
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13673576",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "근데 이거 무슨뜻임？"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "시노다_우습네",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13673626",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1978972_20221224210635.jpg",
				"nickname": "다정이",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13673657",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8298953_20221207012841.jpg",
				"nickname": "기뮤",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13678607",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-10-28&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_-4453710_20221025003631.jpg",
		"pic_multi": "",
		"post_text": " \r\n",
		"views": 680,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(105166 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7769174",
		"icon_img": "img_3408720_20221224122142.jpg",
		"badge_use": "0",
		"post_title": "시발 개ㅈ됌ㅅ다",
		"nickname": "인공사(레알)",
		"post_date": "2022-05-04 17:01:25   ",
		"likes": 16,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13389777",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "시작됫다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13389793",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "극단적웃음주의자",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13389795",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "허허 웃으면서 마려우니까 싸죠 그랬는데 변기가 쩌적하고 금이 가부렸다"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13389800",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "ㅈ댓다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-2072309_20220312172208.jpg",
				"nickname": "뉴고졸백수",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13389811",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "이게 말이되나.."
			},
			{
				"my_post": "0",
				"icon_img": "img_-5774442_20220802163512.jpg",
				"nickname": "데굴베인",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13389842",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "세상에"
			},
			{
				"my_post": "0",
				"icon_img": "img_-8919624_20220717183037.jpg",
				"nickname": "머글",
				"badge_use": "130",
				"reply_img": "",
				"reply_seq": "13390144",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "이런 ㅆㅂ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3132020_20221026210704.jpg",
				"nickname": "seXxXxX",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13390567",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "흰수염의 부활이다"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "우선선",
				"badge_use": "161",
				"reply_img": "",
				"reply_seq": "13390800",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "ㄴㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㄴㅋㄴㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "매우살찐돼지",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13390841",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-04&lt;/font&gt;",
				"reply_title": "와"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13397334",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-08&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋ"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_7209136_20220504170126.jpg",
		"pic_multi": "",
		"post_text": "똥싸면서 흔들흔들했는데\r\n쩌억하고 금이 가부렸다</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> 중요한 것은 꺾이지 않는 마음</small></big></font>",
		"views": 632,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(45605 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7759543",
		"icon_img": "img_2511566_20220523163447.jpg",
		"badge_use": "401",
		"post_title": "2022 유행어 등재 요청",
		"nickname": "극단적웃음주의자",
		"post_date": "2022-04-23 12:00:10   ",
		"likes": 16,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공사(레알)",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13371974",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-23&lt;/font&gt;",
				"reply_title": "사상최악의킬러다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-9253421_20221104012304.jpg",
				"nickname": "얼랭님",
				"badge_use": "265",
				"reply_img": "",
				"reply_seq": "13371975",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-23&lt;/font&gt;",
				"reply_title": "역시 메타선두자 키킥이다"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3714479_20221223011415.jpg",
				"nickname": "풉키푸키",
				"badge_use": "173",
				"reply_img": "",
				"reply_seq": "13371979",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-23&lt;/font&gt;",
				"reply_title": "헉 "
			},
			{
				"my_post": "0",
				"icon_img": "img_2018703_20221203114027.jpg",
				"nickname": "매우살찐돼지",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13371993",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-23&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13372279",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-23&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋz"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "슬비빅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13372680",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-24&lt;/font&gt;",
				"reply_title": "ㅈㄴ 멋있다"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13372931",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-24&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1857142_20221215162840.jpg",
				"nickname": "더즌메렁",
				"badge_use": "214",
				"reply_img": "",
				"reply_seq": "13373719",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-24&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "진짤루에요",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13376064",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-25&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-1551738_20220112091856.jpg",
				"nickname": "이렐리아vv",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13377953",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-04-27&lt;/font&gt;",
				"reply_title": "키킥좌"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_3078014_20220423030011.jpg",
		"pic_multi": "",
		"post_text": "탱커, 딜러의 개념을 정면으로 박살내는\r\n킬러 포지션의 등장 ",
		"views": 561,
		"doodlrurls": "",
		"fixedpic": "img_-5905806_20221012154610.jpg",
		"stack": "(235268 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7948746",
		"icon_img": "img_-3809421_20221217134325.jpg",
		"badge_use": "4317",
		"post_title": "..",
		"nickname": "유동Vsss58P2",
		"post_date": "2022-12-12 16:32:52   ",
		"likes": 15,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_1397832_20221211094606.jpg",
				"nickname": "이슬3",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13733022",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_721074_20221224205202.jpg",
				"nickname": "안녕1",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733024",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㄱ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3610060_20221222231236.jpg",
				"nickname": "그런갑다",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733028",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_3408720_20221224122142.jpg",
				"nickname": "인공샤샤샥",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733029",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-3488732_20221029211151.jpg",
				"nickname": "모코땅",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733030",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_8493250_20221224215507.jpg",
				"nickname": "바선생",
				"badge_use": "358",
				"reply_img": "",
				"reply_seq": "13733043",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㄱ "
			},
			{
				"my_post": "0",
				"icon_img": "",
				"nickname": "김참참",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733247",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "1",
				"icon_img": "img_2511566_20220523163447.jpg",
				"nickname": "콘파고세구",
				"badge_use": "401",
				"reply_img": "",
				"reply_seq": "13733291",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "이씨벌럼"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5471063_20221030202900.jpg",
				"nickname": "상꺾샤싱",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13733401",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-5624346_20220903191625.jpg",
				"nickname": "넌무야",
				"badge_use": "217",
				"reply_img": "",
				"reply_seq": "13733481",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1978972_20221224210635.jpg",
				"nickname": "다정이",
				"badge_use": "",
				"reply_img": "",
				"reply_seq": "13733524",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-12&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_1540773_20221204085445.jpg",
				"nickname": "콘파고",
				"badge_use": "4317",
				"reply_img": "",
				"reply_seq": "13734631",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-14&lt;/font&gt;",
				"reply_title": "ㅋㅋㅋㅋㅋ"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7748309_20220525222647.jpg",
				"nickname": "자일호",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13739754",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "ㅈㄴ 심술맞게 생겼네"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7748309_20220525222647.jpg",
				"nickname": "자일호",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13739755",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "초딩 때 여교사 노트북 배경화면 바퀴벌레로 바꾸거나"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7748309_20220525222647.jpg",
				"nickname": "자일호",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13739756",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "저학년애들 떡볶이 먹는데 흙뿌리고 도망가는 놈 있으면"
			},
			{
				"my_post": "0",
				"icon_img": "img_-7748309_20220525222647.jpg",
				"nickname": "자일호",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13739757",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "십중팔구 저렇게 생긴 놈이었음"
			},
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13740106",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "자일호 고소합시다"
			},
			{
				"my_post": "0",
				"icon_img": "img_2389085_20221216145656.jpg",
				"nickname": "리무루",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13740174",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-12-20&lt;/font&gt;",
				"reply_title": "고소~~~하이 쳐즥이네！ ㅋㅋ"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "img_-7332510_20221212163252.jpg",
		"pic_multi": "",
		"post_text": " \r\n",
		"views": 825,
		"doodlrurls": "",
		"fixedpic": "img_1679955_20221212164447.jpg",
		"stack": "(1960 스택)",
		"isBookmarked": true
	},
	{
		"post_seq": "7789318",
		"icon_img": "img_-6642295_20221217101123.jpg",
		"badge_use": "0",
		"post_title": "2시간뒤 무시로글 예상",
		"nickname": "프라이드",
		"post_date": "2022-05-29 17:17:49   ",
		"likes": 15,
		"replys": [
			{
				"my_post": "0",
				"icon_img": "img_-6642295_20221217101123.jpg",
				"nickname": "프라이드",
				"badge_use": "0",
				"reply_img": "",
				"reply_seq": "13425656",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-29&lt;/font&gt;",
				"reply_title": "추천수뭐지？"
			},
			{
				"my_post": "0",
				"icon_img": "img_4405889_20221106151102.jpg",
				"nickname": "김덕배",
				"badge_use": "475",
				"reply_img": "",
				"reply_seq": "13425687",
				"android_id": "",
				"reply_date": "&lt;font color=#B2B2B2 size=1&gt;2022-05-29&lt;/font&gt;",
				"reply_title": "와...11추처음받아봐요감사합니다 ㅠㅠ"
			}
		],
		"youtube_url": "",
		"doodlr": "0",
		"pic_new": "",
		"pic_multi": "",
		"post_text": "글제목:msi 결승 같이보자해서 봤는데\r\n글내용:\r\n(좆같은여장남자짤한개투척후)\r\n진짜 t1졌다고 하루종일 징징대서 죽여버릴뻔\r\n</small></big></small></big></small></big></u></b></font></i><br><p><small><font size=1 color=#006699><b>[한마디]</b> uid 787578</small></big></font>",
		"views": 457,
		"doodlrurls": "",
		"fixedpic": "",
		"stack": "(47957 스택)",
		"isBookmarked": true
	}
]

/* 검색 - 명예의전당 클릭 */
function lol_onclick_search_award()
{
	event.stopPropagation()

	lol_lpanel_search_menu.style.display = 'none'
	g_lol_search_body = ''
	g_lol_search_nick = ''
	g_lol_search_vote = false
	g_lol_search_mine = false
	g_lol_is_award = true
	g_lol_spec_android_id = g_lol_android_id
	g_lol_is_bookmark = false // 이건 원래 롤백데이터 받아오는 곳에서 true로 처리해주는데, 여긴 오프라인이니까 추가. 근데 안 해도 됨

	g_lol_article_list = lol_award_articles_list
	lol_lpanel_update()
	lol_lpanel_refresh.style.height = '38px'
	lol_lpanel_search_menu.style.display = 'none'
	lol_lpanel_board.scroll(0, 0)
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
	{
		var encoded_aid = prompt('계정 코드를 입력해주세요.')
		if(!encoded_aid)
			return

		socket.emit('lol_login_instantly', lol_decode_account_code(encoded_aid))
		return
	}

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

/* 내 정보 - 롤디자게 로그아웃 클릭 */
function lol_onclick_userinfo_logout()
{
	var ans = confirm('롤디자게를 로그아웃 할까요?')
	if(!ans)
		return

	localStorage.removeItem(g_storage_lol_key)

	lol_lpanel_userinfo_menu.style.display = 'none'

	g_lol_panel_show = false
	lol_lpanel_board.scroll(0, 0)
	lol_panel_update()
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
	g_lol_write_image_data_gif = ''
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
		image: g_lol_write_image_data_gif ? g_lol_write_image_data_gif : g_lol_write_image_data,
		is_gif: g_lol_write_image_data_gif ? true : false})
}

/* 글 북마크 버튼 */
function lol_onclick_aritcle_bookmark()
{
	if(g_lol_current_detail.isBookmarked)
	{
		var ans = confirm('이 글의 북마크를 삭제하시겠습니까?')
		if(!ans)
			return
	}

	g_lol_current_detail.reply_cnt = g_lol_current_detail.replys.length
	socket.emit('lol_bookmark', { android_id: g_lol_android_id, data: g_lol_current_detail, isRegister: g_lol_current_detail.isBookmarked ? false : true})

	g_lol_current_detail.isBookmarked = !g_lol_current_detail.isBookmarked
	lol_rpanel_bookmark.style.backgroundImage = g_lol_current_detail.isBookmarked ? "url('static/star_full.png')" : "url('static/star_empty.png')"
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
	lol_rpanel_header_icon.src = lol_convert_uri_to_mirror(lol_get_icon_url(g_lol_current_detail['icon_img'], g_lol_current_detail['badge_use']))
	lol_rpanel_header_icon.onmouseenter = image_onmouseenter
	lol_rpanel_header_icon.onmouseout = image_onmouseout
	lol_rpanel_header_icon.onmousemove = image_onmousemove

	lol_rpanel_header_title.firstChild.nodeValue = g_lol_current_detail['post_title']
	lol_rpanel_header_nick.firstChild.nodeValue = g_lol_current_detail['nickname']
	lol_rpanel_header_spec.innerHTML = format('{0} 조회 <b>{1}</b>', g_lol_current_detail['stack'] ? g_lol_current_detail['stack'] : "", g_lol_current_detail['views'])

	lol_rpanel_header_memo_button.style.display = 'block'
	lol_rpanel_header_memo_body.style.display = 'none'
	lol_rpanel_header_memo_edit.style.display = 'none'

	if(g_lol_android_id == g_lol_guest_id)
	{
		lol_rpanel_header_button.firstChild.nodeValue = '[이 계정에 로그인하기]'
		lol_rpanel_header_memo_container.style.display = 'none'
	}
	else
	{
		lol_rpanel_header_button.innerHTML = '[차단하기]'
		lol_rpanel_header_memo_container.style.display = is_invalid ? 'none' : 'flex'
	}

	lol_rpanel_bookmark.style.display = is_invalid ? 'none' : 'block'
	lol_rpanel_bookmark.style.backgroundImage = g_lol_current_detail.isBookmarked ? "url('static/star_full.png')" : "url('static/star_empty.png')"

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
		zzals = filename.split('/').map(x => format('http://lolwiki.kr/freeboard/uploads/doodlr/{0}/{1}', lol_get_date_from_filename(x), x))
	}
	else if(g_lol_current_detail['fixedpic'] && g_lol_current_detail['fixedpic'].length)
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
		lol_rpanel_body_img1_img.src = lol_convert_uri_to_mirror(zzals[0])
		lol_rpanel_body_img1_add.setAttribute('src', zzals[0])
	}
	else
		lol_rpanel_body_img1.style.display = 'none'

	if(zzals.length > 1)
	{
		lol_rpanel_body_img2.style.display = 'block'
		lol_rpanel_body_img2_img.src = lol_convert_uri_to_mirror(zzals[1])
		lol_rpanel_body_img2_add.setAttribute('src', zzals[1])
	}
	else
		lol_rpanel_body_img2.style.display = 'none'

	if(zzals.length > 2)
	{
		lol_rpanel_body_img3.style.display = 'block'
		lol_rpanel_body_img3_img.src = lol_convert_uri_to_mirror(zzals[2])
		lol_rpanel_body_img3_add.setAttribute('src', zzals[2])
	}
	else
		lol_rpanel_body_img3.style.display = 'none'

	if(zzals.length > 3)
	{
		lol_rpanel_body_img4.style.display = 'block'
		lol_rpanel_body_img4_img.src = lol_convert_uri_to_mirror(zzals[3])
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
	
	lol_rpanel_body_body.innerHTML = g_lol_current_detail['post_text'].replace('size=1', '').replace(/\r\n/g, '<br>').replace(/？/g, '?').replace(/＆/g, '&')
	document.querySelectorAll('#lol_rpanel_body_body > [src]').forEach( e => {
		var div = document.createElement('div')
		div.classList.add('lol_rpanel_img_body')
		div.toggleAttribute('small', true)
		e.parentNode.insertBefore(div, e)

		var img = document.createElement('img')
		img.src = lol_convert_uri_to_mirror(e.getAttribute('src'))
		img.style.width = '100%'
		img.classList.add('lol_rpanel_img_img')
		div.appendChild(img)

		var div_add = document.createElement('div')
		div_add.classList.add('lol_rpanel_img_add')
		div.appendChild(div_add)

		div.onclick = lol_onclick_img
		div_add.onclick = lol_onclick_img_add
		div_add.setAttribute('src', e.getAttribute('src'))

		e.remove()
	})
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
		img.src = lol_convert_uri_to_mirror(lol_get_icon_url(e['icon_img'], e['badge_use']))
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
			img.src = lol_convert_uri_to_mirror(format('http://lolwiki.kr/freeboard/uploads/files/{0}/{1}', lol_get_date_from_filename(e['reply_img']), e['reply_img']))
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

function lol_onclick_show_user_memo()
{
	event.preventDefault()
	event.stopPropagation()

	if(g_lol_android_id == g_lol_guest_id)
		return

	if(g_lol_current_detail.post_seq == null)
		return

	lol_rpanel_header_memo_button.style.display = 'none'
	socket.emit('lol_query_article_writer_android_id', { android_id: g_lol_android_id, post_seq: g_lol_current_detail.post_seq })
}

function lol_onclick_edit_user_memo()
{
	event.preventDefault()
	event.stopPropagation()

	if(g_lol_android_id == g_lol_guest_id)
		return

	if(g_lol_current_detail.post_seq == null)
		return

	var ans = prompt('유저 메모를 입력하세요.')
	if(ans === null) // 취소
		return

	lol_rpanel_header_memo_body.firstChild.nodeValue = ans
	socket.emit('lol_update_user_memo', { android_id: g_lol_android_id, post_seq: g_lol_current_detail.post_seq, memo: ans })
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
	g_lol_write_image_data_gif = ''
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

async function lol_write_image_ondrop(e)
{
	e.stopPropagation();
    e.preventDefault();
 
	// console.warn(e.target.files)
	// console.warn(e.dataTransfer)
    // e.dataTransfer = e.originalEvent.dataTransfer;
    var files = e.target.files || e.dataTransfer.files;
 
    if (files.length > 1) {
        alert('응니얼굴');
        return;
    }

	if (!files[0].type.match(/image.*/)) {
        alert('이미지가 아닙니다.');
		return;
	}
		
	var file = e.dataTransfer.files[0]
	// console.log('file', file);

	var gif_stream_result = await readAsArrayBuffer_async(file)
	// console.warn('readAsArrayBuffer', gif_stream_result)
	g_lol_write_image_data_gif = gif_stream_result

	var base64_result = await readAsDataURL_async(file) // data:image/gif;base64,R0lGO ...
	// console.log('target', base64_result)
	lol_write_image_placeholder.style.display = 'none'
	lol_write_image.src = base64_result
	lol_write_image.style.display = 'block'
	lol_write_image_guide.innerHTML = '이미지 첨부 중... 기다려주셈'
	lol_write_image_guide.style.display = 'block'
	e.target.style.borderWidth = '1px';

	// var reader2 = new FileReader()
	// reader2.onload = function (event) {
	// 	console.warn('readAsBinaryString', event.target.result)
	// }
	// reader2.readAsBinaryString(file)
}

function readAsDataURL_async(file) {
	return new Promise((resolve, reject) => {
	  let reader = new FileReader();
  
	  reader.onload = () => {
		resolve(reader.result);
	  };
  
	  reader.onerror = reject;
  
	  reader.readAsDataURL(file);
	})
}

function readAsArrayBuffer_async(file) {
	return new Promise((resolve, reject) => {
	  let reader = new FileReader();
  
	  reader.onload = () => {
		resolve(reader.result);
	  };
  
	  reader.onerror = reject;
  
	  reader.readAsArrayBuffer(file);
	})
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

const filenameReg = /.*\/(.+)/
function lol_convert_uri_to_mirror(uri)
{
	if(!uri.startsWith('http'))
		return uri
	if(uri.startsWith('https://'))
		return uri
	if(filenameReg.test(uri))
		return format('{0}/lolwiki_mirror/{1}?uri={2}', location.origin, filenameReg.exec(uri)[1], encodeURIComponent(uri))

	return format('{0}/lolwiki_mirror/{1}?uri={2}', location.origin, generate_id(32), encodeURIComponent(uri))
}

function lol_encode_account_code(code)
{
	return code.split('').reverse().join('')
}

function lol_decode_account_code(code)
{
	return code.split('').reverse().join('')
}
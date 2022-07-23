var g_last_chat = ''
var mute_list = []
var ping_time = 0

var cached_chat_call_audio = null

/* 채팅창에 메시지 추가 함수 */
var imgReg = /\/(img|ㅑㅡㅎ)\s+(\S+)/i
var videoReg = /\/(video|퍙대)\s+(\S+)/i
var byteReg = /[\da-zA-Z-_=\|\/\*-\+\.`~'\/,\!@#\$%\^\&\(\)\[\] "]/i
var callReg = /@(\S+)/g
var callRegPre = /@(\S+)/
var emojiReg = /\p{Extended_Pictographic}/u
function add_message(data) 
{
	if(g_nick == 'OBS' && data.type != 'message')
		return

	if(data.name && mute_list.indexOf(data.name) >= 0)
	{
		console.log(format('[{0}] {1} : {2}', data.time, data.name, data.message))
		return
	}

	var need_scroll = is_scroll_bottom() || g_nick == 'OBS'

	var message = document.createElement('div')
	
	var text = ''
	var nick = ''
	var className = ''

	var emoji_mode = (data.message.length == 2 && emojiReg.test(data.message))

	// 타입에 따라 적용할 클래스를 다르게 지정
	switch (data.type) 
	{
		case 'message':
			message.classList.add('chat_balloon')

			nick = data.name + '  '

			if(emoji_mode)
				text = data.message
			else
				text = '\n' + data.message

			// TTS 아이콘
			if(data.tts_hash)
			{
				var tts_icon = document.createElement('img')
				if(toonat_voices.indexOf(data.tts_hash) >= 0)
				{
					if( ['maoruya'].indexOf(data.tts_hash) >= 0)
						tts_icon.src = format('static/{0}.gif', data.tts_hash)
					else
						tts_icon.src = format('static/{0}.png', data.tts_hash)
					tts_icon.classList.add('big_tts_icon')
				}
				else
				{
					tts_icon.src = 'static/tts.png'
					tts_icon.onclick = play_tts_audio_this
				}
				tts_icon.classList.add('chat_tts_icon')
				tts_icon.setAttribute('tts_hash', data.tts_hash)
				message.appendChild(tts_icon)
			}

			var nick_img = document.createElement('img')
			nick_img.classList.add('chat_profile')
			nick_img.src = format('icon/{0}.png?ver={1}', data.icon_id, data.icon_ver)
			nick_img.onmouseenter = image_onmouseenter
			nick_img.onmouseout = image_onmouseout
			nick_img.onmousemove = image_onmousemove
			message.appendChild(nick_img)

			var nick_font = document.createElement('font')
			nick_font.appendChild(document.createTextNode(nick))
			if(g_nick == 'OBS')
			{
				nick_font.style.fontSize = '18px'
				message.style.fontSize = '18px'
			}
			nick_font.classList.add('nick')
			nick_font.classList.add('nanum')
			if(byteReg.test(data.name[0]))
				nick_font.style.paddingLeft = '2px'
			nick_font.toggleAttribute('emoji', emoji_mode)
			message.appendChild(nick_font)
			
			// 시간 넣기
			var timeFont = document.createElement('font')
			timeFont.classList.add('chat_time')
			timeFont.appendChild(document.createTextNode('  ' + data.time))
			message.appendChild(timeFont)
			
			if(data.name == g_nick)
				className = 'me'
			else
				className = 'other'
		break

		case 'connect':
		case 'disconnect':
		case 'system_message':
			className = data.type
			text = data.message
			if(typeof text === 'object')
				text = JSON.stringify(text)
		break
	}

	if(imgReg.test(text))
	{
		var img_url = imgReg.exec(text)[2]
		text = text.replace(imgReg, '')

		if(!option_checkbox_dezeolmo.checked)
		{
			var lol_link_img = document.createElement('img')
			lol_link_img.classList.add('chat_img')
			lol_link_img.src = img_url
			lol_link_img.onmouseenter = image_onmouseenter
			lol_link_img.onmouseout = image_onmouseout
			lol_link_img.onmousemove = image_onmousemove
			lol_link_img.onerror = function() { lol_link_img.style.height = '0px'; }
			if(need_scroll)
				lol_link_img.onload = scrollDown
			message.appendChild(lol_link_img)
		}
	}

	if(videoReg.test(text))
	{
		var video_url = videoReg.exec(text)[2]
		var video = document.createElement('video')
		video.classList.add('chat_img')
		video.src = video_url
		video.autoplay = 'autoplay'
		video.loop = 'loop' 
		video.controls = 'controls' 
		video.muted = 'muted' 
		video.onerror = function() { video.style.height = '0px'; }
		if(need_scroll)
			video.onloadeddata = scrollDown
		text = text.replace(videoReg, '')
		message.appendChild(video)
	}

	message.classList.add(className)
	message.classList.add('chat')
	if(data.message.length > 0)
	{
		if(data.is_blob)
		{
			var temporary_element = document.createElement('div')
			temporary_element.appendChild(document.createTextNode(text.substring(1)))
			temporary_element.style.fontSize = 'small'
			temporary_element.style.textAlign = 'right'
			message.appendChild(temporary_element)
		}
		else
		{
			var temporary_element = document.createElement('temp')
			temporary_element.appendChild(document.createTextNode(text))
			temporary_element.toggleAttribute('emoji', emoji_mode)
			message.appendChild(temporary_element)
		}
	}
	// message.appendChild(document.createTextNode(text))
	chat.appendChild(message)

	if(data.lol_link_data)
	{
		var icon_img = data.lol_link_data.icon_img
		var post_title = data.lol_link_data.post_title
		var post_reply = data.lol_link_data.post_reply
		var post_spec = data.lol_link_data.post_spec
		var post_seq = data.lol_link_data.post_seq

		var lol_link_div = document.createElement('div')
		lol_link_div.classList.add('lol_article_list_item')
		lol_link_div.classList.add('chat_lol_link')
		lol_link_div.setAttribute('seq', post_seq)
		lol_link_div.onclick = lol_onclick_article
		
		// 아이콘
		var lol_link_img = document.createElement('img')
		lol_link_img.toggleAttribute('icon', true)
		lol_link_img.src = icon_img
		lol_link_div.appendChild(lol_link_img)

		var center_div = document.createElement('div')
		center_div.toggleAttribute('article_info')

		// 제목
		var title_container = document.createElement('div')
		title_container.toggleAttribute('title_container', true)

		var title = document.createElement('div')
		title.toggleAttribute('title', true)
		// title.appendChild(document.createTextNode(e['post_title']))
		title.innerHTML = post_title
		title_container.appendChild(title)

		if(post_reply > 0)
		{
			var reply_cnt = document.createElement('div')
			reply_cnt.toggleAttribute('reply_cnt', true)
			reply_cnt.innerHTML = format('[{0}]', post_reply)
			title_container.appendChild(reply_cnt)
		}
		center_div.appendChild(title_container)

		// 하단
		var spec = document.createElement('div')
		spec.toggleAttribute('spec', true)
		spec.innerHTML = post_spec
		center_div.appendChild(spec)
		lol_link_div.appendChild(center_div)

		message.appendChild(lol_link_div)
	}
	
	if(data.bg)
		message.style.backgroundColor = data.bg

	if(need_scroll)
		scrollDown()

	// 호출 사운드
	if(option_checkbox_mention.checked) // 호출 알림 체크되어있어야 재생
	{
		if(callRegPre.test(text)) // @가 있는지부터 체크
		{
			callReg.test('') // 초기화
			var t_callRegResult = callReg.exec(text)
			while(t_callRegResult)
			{
				if(t_callRegResult[1] == g_nick || t_callRegResult[1] == 'everyone')
					play_call_audio()

				t_callRegResult = callReg.exec(text)
			}
		}
	}

	return message
}

/* 채팅창에 시스템 메시지 추가 함수 */
function add_system_message(message, bg = '')
{
	if(g_nick == 'OBS')
		return

	return add_message({type: 'system_message', message: message, bg: bg})
}

/* 현재 플레이영상 전용 메시지 추가 함수 */
function add_play_message(data)
{
	if(g_nick == 'OBS')
		return

	var need_scroll = is_scroll_bottom()

	var base = document.createElement('div')
	base.classList.add('system_message')
	base.classList.add('chat')
	base.classList.add('play_info')

	var img = document.createElement('img')
	if(need_scroll)
		img.onload = scrollDown
	img.src = data.thumbnail
	img.setAttribute('video_id', data.video_id)
	img.onclick = onclick_play_data
	img.onmouseenter = image_onmouseenter
	img.onmouseout = image_onmouseout
	img.onmousemove = image_onmousemove
	img.setAttribute('ui_tooltip_x_offset', 60)
	register_ui_tooltip_event(img, '영상 주소 복사')
	base.appendChild(img)

	var dj = document.createElement('div')
	dj.classList.add('play_info_dj')
	dj.appendChild(document.createTextNode(format('DJ : {0}', data.dj)))
	base.appendChild(dj)

	var title = document.createElement('div')
	title.classList.add('play_info_title')
	title.appendChild(document.createTextNode(format('제목 : {0} ({1})', data.title, second_to_string(data.duration))))
	base.appendChild(title)

	chat.appendChild(base)

	if(need_scroll)
		scrollDown()

	return base
}

function onclick_play_data()
{
	var thisElement = event.target
	copyToClipboard('https://www.youtube.com/watch?v=' + thisElement.getAttribute('video_id'))
}


/* 메시지 전송 함수 */
var playReg = /^\/(p|ㅔ|play|ㅔㅣ묘)\s+(\S+)/i
var queueReg = /^\/(q|ㅂ|queue|벼뎓)\s+(\S+)/i
var rewindReg = /^\/(r|rewind|ㄱㄷ쟈ㅜㅇ|ㄱ|되감기)\s+(\d+)\s*(\d+)?\s*(\d+)?/i
var forwardReg = /^\/(f|fwd|ㄹㅈㅇ|ㄹ|빨리감기)\s+(\d+)\s*(\d+)?\s*(\d+)?/i
var requestReg = /^\/request\s+(\S+)/i
var selectPlaylistReg = /^\/select_playlist\s+(\d+)/i
var pushReg = /^\/push\s+(\S+)\s+(\d+)/i
var queryReg = /^\/query\s+(.+)/i
var zzalReg = /^\/짤\s+(.+)/i
var zzalClearReg = /^\/(짤클리어|짤clear)/i
var iconReg = /^\/icon\s+(.+)/i
var muteReg = /^\/mute\s+(.+)/i
var refreshReg = /^\/refresh\s+(.+)/i
var ttsReg = /\/(tts|ㅅㅅㄴ)\s+(.+)/i
var evalReg = /\/eval\s+(\S+)\s+(.+)/i
var evalAllReg = /\/evalall\s+(.+)/i
var debugReg = /\/debug\s+(.+)/i
var adReg = /^\/(ad|ㅁㅇ)\s+(.+)/i
var volReg = /^\/vol\s+(.+)/i
function send(force_tts = false) {
	if(!g_isLogin)
		return

	// 입력되어있는 데이터 가져오기
	var message = chat_input.value 
	if(message)
		g_last_chat = message

	if(message && force_tts && !ttsReg.test(message))
		message = '/tts ' + message

	// 가져왔으니 데이터 빈칸으로 변경
	chat_input.value = ''

	// 빈 메시지 무시
	if (!message)
		return

	if(message == '/?' || message == '/help')
	{
		// var help_message = add_system_message('' 
		// 					+ '※ 영상 관련\n'
		// 					+ '/play {유튜브주소} : 영상 예약 (/p)\n'
		// 					+ '/queue {유튜브주소} : 영상 예약 (/q)\n'
		// 					+ '/queue : 현재 영상 대기열 확인 (/q)\n'
		// 					+ '/skip : 현재 영상 스킵 (/s)\n'
		// 					+ '/rewind 10 : 10초 되감기 (/r)\n'
		// 					+ '/rewind 3 15 : 3분 15초 되감기 (/r)\n'
		// 					+ '/rewind 1 3 15 : 1시간 3분 15초 되감기 (/r)\n'
		// 					+ '/fwd 10 : 10초 빨리감기 (/f) (시 분 초 가능)\n'
		// 					+ '/playing : 재생 싱크 맞추기\n'
		// 					+ '\n※ 채팅 관련\n'
		// 					+ '/list : 참가자 목록 보기 (/l)\n'
		// 					+ '/clear : 채팅창 정리\n'
		// 					+ '/짤 {검색어} : 단부루 랜덤 이미지\n'
		// 					+ '/mute {닉네임} : 유저 차단(재접 시 초기화)\n'
		// 					+ '/img  {이미지주소} : 이미지 게시\n'
		// 					+ '또는 채팅창에 이미지 붙여넣기(Ctrl+v)\n'
		// 					+ '@{닉네임} : 유저 호출 (@everyone 가능)\n'
		// 					+ '\n※ 기타\n'
		// 					// + '/아이콘변경법 : 아이콘 변경 안내\n'
		// 					+ '/ping : 서버 핑 확인\n'
		// 					+ '/tts {할말} : TTS 읽기\n'
		// 					+ '/ad {할말} : 영상 위에 띄우기\n'
		// 					+ '/vol {닉네임} : 음량 체크\n'
		// 					+ '\n※ 아이콘 변경\n'
		// 					+ '채팅창에 /icon 이라고 적고 \n아이콘으로 하길 원하는 이미지를 복사해서 \n채팅창에 붙여넣기 하면 아이콘이 등록됩니다.\n또는 /icon {이미지주소} 를 입력하세요.'
		// 					, 'var(--채팅_헬프_배경색)')
		// help_message.style.fontFamily = 'Nanum Gothic'
		// help_message.style.textAlign = 'left'

		window.open('https://github.com/SnowyWalk/LoLWikiDJ/blob/develop/도움말.md', '도움말')
		return
	}

	if(zzalReg.test(message))
	{
		var tag = zzalReg.exec(message)[1]
		socket.emit('zzal', tag)
	}

	if(zzalClearReg.test(message))
	{
		socket.emit('zzal_clear')
	}

	// play url 테스트
	if(playReg.test(message))
	{
		var url = queueReg.exec(message)[2]
		var video_id = ''
		if(url.indexOf('.m3u8') >= 0)
			video_id = url
		else
			video_id = youtube_url_parse(url)

		socket.emit('queue', {dj: g_nick, video_id: video_id})
		return
	}

	if(queueReg.test(message))
	{
		var url = queueReg.exec(message)[2]
		var video_id = ''
		if(url.indexOf('.m3u8') >= 0)
			video_id = url
		else
			video_id = youtube_url_parse(url)

		socket.emit('queue', {dj: g_nick, video_id: video_id})
		return
	}

	if(message.toLowerCase() == '/q' || message == '/ㅂ')
	{
		socket.emit('queue_list')
		return
	}

	if(rewindReg.test(message))
	{
		var ret = rewindReg.exec(message)
		var sec = 0
		if(ret[4])
			sec = eval(ret[2]) * 3600 + eval(ret[3]) * 60 + eval(ret[4])
		else if(ret[3])
			sec = eval(ret[2]) * 60 + eval(ret[3])
		else if(ret[2])
			sec = eval(ret[2])
		socket.emit('rewind', {nick: g_nick, sec: sec, message: message})
		return
	}

	if(forwardReg.test(message))
	{
		var ret = forwardReg.exec(message)
		var sec = 0
		if(ret[4])
			sec = eval(ret[2]) * 3600 + eval(ret[3]) * 60 + eval(ret[4])
		else if(ret[3])
			sec = eval(ret[2]) * 60 + eval(ret[3])
		else if(ret[2])
			sec = eval(ret[2])
		socket.emit('forward', {nick: g_nick, sec: sec, message: message})
		return
	}

	if(message.toLowerCase() == '/playing' || message == '/ㅔㅣ묘ㅑㅜㅎ')
	{
		socket.emit('playing')
		return
	}

	if(message.toLowerCase() == '/playlist')
	{
		socket.emit('playlist')
	}

	if(selectPlaylistReg.test(message))
	{
		var id = selectPlaylistReg.exec(message)[1]
		socket.emit('select_playlist', id)
	}

	if(message.toLowerCase() == '/list' || message == '/ㅣㅑㄴㅅ' || message.toLowerCase() == '/l')
	{
		socket.emit('users')
		set_chat_category(mainchat_header_djlist)
		return
	}

	if(message.toLowerCase() == '/dj' || message == '/어')
	{
		socket.emit('djs')
		return
	}

	if(message.toLowerCase() == '/skip' || message == '/나ㅑㅔ' || message.toLowerCase() == '/s' || message == '/ㄴ')
	{
		socket.emit('skip', message)
		return
	}

	if(pushReg.test(message))
	{
		var url = pushReg.exec(message)[1]
		var video_id = youtube_url_parse(url)
		var playlist_id = pushReg.exec(message)[2]
		socket.emit('push_video', {video_id:video_id, playlist_id: playlist_id})
	}

	if(requestReg.test(message))
	{
		var url = requestReg.exec(message)[1]
		var video_id = youtube_url_parse(url)

		socket.emit('request_video_info', video_id)
	}

	if(muteReg.test(message))
	{
		var nick = muteReg.exec(message)[1]
		if(nick == '설보')
		{
			add_system_message('어허~\n그러면 안댕~\n설보를 뮤트하면 죽여버릴지도 모르샤~ /img static/good.png')
			return
		}
		mute_list.push(nick)
		add_system_message(format('\'{0}\' 님을 차단했습니다.\n\n-차단 목록-\n{1}', nick, mute_list.join('\n')))
		return
	}

	if(refreshReg.test(message))
	{
		var nick = refreshReg.exec(message)[1]
		socket.emit('refresh', nick)
		return
	}

	if(evalReg.test(message))
	{
		var nick = evalReg.exec(message)[1]
		var code = evalReg.exec(message)[2]
		socket.emit('eval', {nick: nick, code: code})
		return
	}

	if(evalAllReg.test(message))
	{
		var code = evalAllReg.exec(message)[1]
		socket.emit('evalall', code)
		return
	}

	if(debugReg.test(message))
	{
		var code = debugReg.exec(message)[1]
		socket.emit('debug', code)
		return
	}

	if(message == '/volcheck')
	{
		socket.emit('evalall', "socket.emit('chat_message', {type: 'message', message:format('음량: {0}% {1}', player.getVolume(), player.isMuted() ? '(음소거)' : ''), tts_hash:''})")
		return
	}

	if(message == '/ping' || message == '/PING')
	{
		ping_time = Date.now()
		socket.emit('ping')
		return
	}

	if(message == '/clear' || message == '/CLEAR' || message == '/클리어')
	{
		while(chat.hasChildNodes())
			chat.removeChild(chat.lastChild)
		return
	}

	if(message == '/맥심')
	{
		socket.emit('maxim')
	}

	if(message == '/begin')
	{
		socket.emit('test_begin')
	}

	if(message == '/commit')
	{
		socket.emit('test_commit')
	}

	// if(message == '/아이콘변경법')
	// {
	// 	add_system_message('==아이콘 변경법==\n채팅창에 /icon 이라고 적고 \n아이콘으로 하길 원하는 이미지를 복사해서 \n채팅창에 붙여넣기 하면 아이콘이 등록됩니다.\n\n또는 /icon {이미지주소} 를 입력하세요.')
	// 	return
	// }

	if(iconReg.test(message))
	{
		socket.emit('icon_register', iconReg.exec(message)[1])
		return
	}

	if(queryReg.test(message))
	{
		socket.emit('query', queryReg.exec(message)[1])
	}

	var tts_hash = ''
	if(ttsReg.test(message)) 
	{
		message = ttsReg.exec(message)[2]
		var now = new Date()
		if(now - g_last_tts >= 1000) // 1s cooldown
		{
			tts_hash = GetDate() + ' ' + random_hash()
			var voice_name = document.querySelector('[name=tts_voice_name]:checked').value
			if(toonat_voices.indexOf(voice_name) >= 0)
				tts_hash = voice_name
			socket.emit('tts', { text: message, tts_hash: tts_hash, voice_name: voice_name })
			g_last_tts = now
		}
	}

	if(adReg.test(message))
	{
		socket.emit('ad', adReg.exec(message)[2])
		return
	}

	if(volReg.test(message))
	{
		socket.emit('volcheck', {target_nick: volReg.exec(message)[1], message: message})
		return
	}

	if(message == '/snow')
	{
		if(g_snow_interval_id == 0)
		{
			g_snow_interval_id = setInterval(createSnow, 100)
		}
		else
		{
			clearInterval(g_snow_interval_id)
			g_snow_interval_id = 0
		}
		return
	}

	if(message == '/chat' || message == '/챗' || message == '/CHAT' || message == '/촘ㅅ' || message == '/촘ㅆ' || message == '/cot' || message == '/COT')
	{
		g_is_chat_mode = !g_is_chat_mode
		mainchat.toggleAttribute('chat_mode', g_is_chat_mode)
		mainchat.style.width = g_is_chat_mode ? '100%' : mainchat_width
		resize()
		return
	}

	// 서버로 message 이벤트 전달 + 데이터와 함께
	socket.emit('chat_message', { type: 'message', message: message, tts_hash: tts_hash })
	scrollDown()
}


/* 채팅창 엔터 단축키 */
function chat_keydown() {
	if (window.event.keyCode == 13)
	{
		send(window.event.shiftKey && option_checkbox_tts_key_bind.checked)
	}
	else if(window.event.keyCode == 38 && g_last_chat)
	{
		chat_input.value = g_last_chat
		setTimeout(_ => {
			chat_input.setSelectionRange(chat_input.value.length, chat_input.value.length)
		}, 10);
	}
}

/* 채팅창 이미지 붙여넣기 이벤트 */
function chat_onpaste() {
	var message = chat_input.value
	var __is_icon = message.startsWith('/icon')
	pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
		return
	if(__is_icon)
		chat_input.value = ''
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		if(__is_icon)
			socket.emit('icon_register', ret)
		else
			socket.emit('image_blob', ret)
			// socket.emit('chat_message', { type: 'message', message: format('/img {0}', ret) })
		scrollDown()
	}
	reader.readAsDataURL(blob)
}

function ondrop_chat_input_file(e)
{
	e.stopPropagation();
    e.preventDefault();
 
	// console.warn(e.target.files)
	// console.warn(e.dataTransfer)
    // e.dataTransfer = e.originalEvent.dataTransfer;
    var files = e.target.files || e.dataTransfer.files;

	console.log(e, e.dataTransfer, e.dataTransfer.files, e.dataTransfer.files[0], files)

 
    if (files.length > 1) {
        alert('응니얼굴');
        return;
    }

	if (!files[0].type.match(/image.*/)) {
        alert('이미지가 아닙니다.');
		return;
	}
		
	var file = e.dataTransfer.files[0]
	reader = new FileReader()
	reader.onload = function (event) {
	//   console.log('target', event.target)
		var data = event.target.result // data:image/gif;base64,R0lGO ...
		socket.emit('image_blob', data)
	}
	// console.log('file', file);
	reader.readAsDataURL(file);
}

/* 이미지 저장소 버튼 클릭 이벤트 */
function onclick_chat_emoticon_button()
{
	g_image_storage_panel_show = !g_image_storage_panel_show

	image_storage.style.display = g_image_storage_panel_show ? 'flex' : 'none'

	// image_storage.
}

function chat_scroll() {
	var to = is_scroll_bottom() ? 'none' : 'inline'

	if(g_nick == 'OBS')
		to = 'none'

	if(chat_scroller.style.display != to)
		chat_scroller.style.display = to
}


function image_onmouseenter()
{
	image_expander.style.display = 'block'
	image_expander_src.src = event.target.src
	image_expander_set_pos(event.clientX, event.clientY)
}

function image_onmouseout()
{
	image_expander.style.display = 'none'
	image_expander_src.src = ''
}

function image_onmousemove()
{
	image_expander_set_pos(event.clientX, event.clientY)
}

function image_expander_set_pos(x, y)
{
	x -= image_expander.clientWidth + 10 // border 1px라서 최소 3
	y -= image_expander.clientHeight + 10 // border 1px라서 최소 3
	if(x < 0)
		x = 0
	if(y < 0)
		y = 0

	image_expander.style.left = x
	image_expander.style.top = y
}

function play_call_audio(start_time = 0.0)
{
	if(!cached_chat_call_audio)
	{
		cached_chat_call_audio = audio_chat_call
	}
	
	cached_chat_call_audio.volume = option_slider_mention_volume.value
	cached_chat_call_audio.pause()
	cached_chat_call_audio.currentTime = start_time
	cached_chat_call_audio.play()
}

function play_tts_audio_this()
{
	var tts_hash = this.getAttribute('tts_hash')
	if(!tts_hash)
		return

	var new_tts = new Audio('./tts/' + tts_hash)
	new_tts.volume = option_slider_tts_volume.value
	new_tts.onended = destroy_self
	new_tts.play()
}
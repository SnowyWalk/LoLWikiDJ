var g_last_chat = ''

/* 채팅창에 메시지 추가 함수 */
var imgReg = /\/img (\S+)/i
var byteReg = /[\da-zA-Z-_=\|\/\*-\+\.`~'\/,\!@#\$%\^\&\(\)\[\] "]/i
function add_message(data) 
{
	var message = document.createElement('div')
	

	var text = ''
	var nick = ''
	var className = ''

	// 타입에 따라 적용할 클래스를 다르게 지정
	switch (data.type) 
	{
		case 'message':
			message.classList.add('chat_balloon')
			
			// 시간 넣기
			var timeSmall = document.createElement('small')
			var timeFont = document.createElement('font')
			timeFont.classList.add('chat_time')
			timeFont.color = 'gray'
			timeFont.appendChild(document.createTextNode('  ' + data.time))
			timeSmall.appendChild(timeFont)

			nick = data.name + '  '
			text = '\n' + data.message

			var small = document.createElement('small')
			var b = document.createElement('b')
			var nick_img = document.createElement('img')
			nick_img.classList.add('chat_profile')
			nick_img.src = format('icon/{0}.png?ver={1}', data.icon_id, data.icon_ver)
			var font = document.createElement('font')
			if(data.name == g_nick)
			{
				className = 'me'
				font.color = 'crimson'
			}
			else
			{
				className = 'other'
				font.color = 'mediumslateblue'
			}
			font.classList.add('nick')
			if(byteReg.test(data.name[0]))
				font.style.paddingLeft = '2px'
			// if(data.message.length == 0 || byteReg.test(data.message[0]))
			// 	message.style.paddingLeft = '2px'

			small.appendChild(b)
			b.appendChild(nick_img)
			b.appendChild(font)
			small.appendChild(timeSmall)

			font.appendChild(document.createTextNode(nick))

			message.appendChild(small)
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

	var img = null
	if(imgReg.test(text))
	{
		var img_url = imgReg.exec(text)[1]
		var img = document.createElement('img')
		img.classList.add('chat_img')
		img.src = img_url
		img.onerror = function() { img.style.height = '0px'; }
		img.onload = scrollDown
		text = text.replace(imgReg, '')
	}

	message.classList.add(className)
	message.classList.add('chat')
	message.appendChild(document.createTextNode(text))
	if(img != null)
		message.appendChild(img)
	chat.appendChild(message)
	if(data.bg)
		message.style.backgroundColor = data.bg

	scrollDown()
}
/* 채팅창에 시스템 메시지 추가 함수 */
function add_system_message(message, bg = '')
{
	add_message({type: 'system_message', message: message, bg: bg})
}


/* 메시지 전송 함수 */
var playReg = /^\/(p|ㅔ|play|ㅔㅣ묘) (\S+)/i
var queueReg = /^\/(q|ㅂ|queue|벼뎓) (\S+)/i
var rewindReg = /^\/(r|rewind|ㄱㄷ쟈ㅜㅇ|ㄱ|되감기) (\d+)/i
var forwardReg = /^\/(f|fwd|ㄹㅈㅇ|ㄹ|빨리감기) (\d+)/i
var requestReg = /^\/request (\S+)/i
var selectPlaylistReg = /^\/select_playlist (\d+)/i
var pushReg = /^\/push (\S+) (\d+)/i
var queryReg = /^\/query (.+)/i
var zzalReg = /^\/짤 (.+)/i
var iconReg = /\/icon (.+)/i
function send() {
	if(!g_isLogin)
		return

	// 입력되어있는 데이터 가져오기
	var message = chat_input.value 
	g_last_chat = message

	// 가져왔으니 데이터 빈칸으로 변경
	chat_input.value = ''

	// 빈 메시지 무시
	if (!message)
		return

	if(message == '/?' || message == '/help')
	{
		add_system_message('명령어 목록 (대소문자 구분 X)\n' 
							+ '/(p)lay {유튜브주소} : 해당 영상 즉시 재생\n'
							+ '/(q)ueue {유튜브주소} : 해당 영상 대기열에 추가\n'
							+ '/q : 현재 영상 대기열 확인\n'
							+ '/(l)ist : 참가자 목록 보기\n'
							// + '/dj : 디제이 대기열 보기(미구현)\n'
							+ '/playing : 재생 싱크 맞추기\n'
							+ '/(s)kip : 현재 영상 스킵\n'
							+ '/(r)ewind 10 : 10초 되감기 (/되감기 10 도 가능)\n'
							+ '/(f)wd 10 : 10초 빨리감기 (/빨리감기 10 도 가능)\n'
							+ '/짤 {검색어} : 랜덤 이미지 (단부루)\n'
							+ '/img  {이미지주소} : 이미지 채팅\n'
							+ '{채팅창에 이미지 붙여넣기(Ctrl+v)} : 이미지 채팅\n'
							+ '/아이콘변경 : 아이콘 변경 안내'
							)
		return
	}

	if(zzalReg.test(message))
	{
		var tag = zzalReg.exec(message)[1]
		socket.emit('zzal', tag)
	}

	// play url 테스트
	if(playReg.test(message))
	{
		var url = playReg.exec(message)[2]
		var video_id = youtube_url_parse(url)

		socket.emit('play', {dj: g_nick, video_id: video_id})
		return
	}

	if(queueReg.test(message))
	{
		var url = queueReg.exec(message)[2]
		var video_id = youtube_url_parse(url)

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
		var sec = rewindReg.exec(message)[2]
		socket.emit('rewind', {nick: g_nick, sec: sec, message: message})
		return
	}

	if(forwardReg.test(message))
	{
		var sec = forwardReg.exec(message)[2]
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
		return
	}

	if(message.toLowerCase() == '/dj' || message == '/어')
	{
		socket.emit('djs')
		return
	}

	if(message.toLowerCase() == '/skip' || message == '/나ㅑㅔ' || message.toLowerCase() == '/s' || message == '/ㄴ')
	{
		socket.emit('skip')
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

	if(message == '/아이콘변경')
	{
		add_system_message('==아이콘 변경법==\n채팅창에 /icon 이라고 적고 \n아이콘으로 하길 원하는 이미지를 복사해서 \n채팅창에 붙여넣기 하면 아이콘이 등록됩니다.\n\n또는 /icon {이미지주소} 를 입력하세요.')
		return
	}

	if(iconReg.test(message))
	{
		socket.emit('icon_register', iconReg.exec(message)[1])
		return
	}

	if(queryReg.test(message))
	{
		socket.emit('query', queryReg.exec(message)[1])
	}

	// 서버로 message 이벤트 전달 + 데이터와 함께
	socket.emit('chat_message', { type: 'message', message: message })
	scrollDown(true)
}


/* 채팅창 엔터 단축키 */
function chat_keydown() {
	if (window.event.keyCode == 13)
		send()
	else if(window.event.keyCode == 38 && g_last_chat)
		chat_input.value = g_last_chat

}

/* 채팅창 이미지 붙여넣기 이벤트 */
function chat_onpaste() {
	var message = chat_input.value
	var __is_icon = message.startsWith('/icon')
	if(__is_icon)
		chat_input.value = ''
	pasteObj = (event.clipboardData || window.clipboardData); 
	var blob = pasteObj.files[0]
	if(!blob)
		return
	var reader = new FileReader()
	reader.onload = function(ev) { 
		var ret = ev.target.result
		if(__is_icon)
			socket.emit('icon_register', ret)
		else
			socket.emit('chat_message', { type: 'message', message: format('/img {0}', ret) })
		scrollDown(true)
	}
	reader.readAsDataURL(blob)
}
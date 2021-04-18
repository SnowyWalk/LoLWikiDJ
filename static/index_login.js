function login()
{
	login_button.style.display = 'none'

	g_nick = login_id.value
	g_nick = g_nick.replace(/(\'|\")/g, '')
	if(!g_nick)
	{
		login_id.value = ''
		login_button.style.display = 'block'
		return
	}
	g_nick = g_nick.substr(0, 32)

	console.log('window에서 login')
	socket.emit('login', g_nick)
}

function disappear_login_scene()
{
	init_block.style.opacity -= 0.0125

	if(init_block.style.opacity > 0)
	{
		setTimeout(disappear_login_scene, 5)
		return
	}

	init_block.style.display = 'none'
}

/* 로그인창 엔터 단축키 */
function login_keydown()
{
	if (window.event.keyCode == 13)
		login()
}
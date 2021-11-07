/* 유튜브 주소 파싱 */
var youtubeReg = /(\?|&)v=([^&\?]+)/
var youtubeReg2 = /\/v\/([^\/]+)/
var youtubeReg3 = /youtu\.be\/([^\?]+)/
var youtubeReg4 = /shorts\/([^\?]+)/

function youtube_url_parse(url_or_id)
{
	if(youtubeReg.test(url_or_id))
		return youtubeReg.exec(url_or_id)[2]
	else if(youtubeReg2.test(url_or_id))
		return youtubeReg2.exec(url_or_id)[1]
	else if(youtubeReg3.test(url_or_id))
		return youtubeReg3.exec(url_or_id)[1]
	else if(youtubeReg4.test(url_or_id))
		return youtubeReg4.exec(url_or_id)[1]
	return url_or_id
}

/* 유튜브 재생목록 주소 파싱 */
var youtubePlaylistReg = /list=([^&]+)/
function youtube_playlist_url_parse(url_or_id)
{
	if(youtubePlaylistReg.test(url_or_id))
		return youtubePlaylistReg.exec(url_or_id)[1]
	
	return url_or_id
}

/* 90 -> "01:30" */
function second_to_string(sec) 
{
	sec = Math.round(sec)
	var h = Math.floor(sec / 3600)
	sec -= h * 60 * 60
	var m = Math.floor(sec / 60)
	sec -= m * 60
	var s = sec

	if(m < 10)
		m = '0' + m.toString()
	if(s < 10)
		s = '0' + s.toString()
	if(h > 0)
		return h + ':' + m + ':' + s
	return m + ':' + s
}

function copyToClipboard(text)
{
	var textarea = document.createElement('textarea')
	textarea.value = text
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'absolute';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select()
	document.execCommand('copy');
	document.body.removeChild(textarea);
}

function selectRange(obj) 
{
	if (window.getSelection)
		window.getSelection().selectAllChildren(obj)
	else if (document.body.createTextRange) 
	{
		var range = document.body.createTextRange()
		range.moveToElementText(obj)
		range.select()
	}
}

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}

function scrollDown()
{
	chat.scrollTop = chat.scrollHeight
}

function is_scroll_bottom(offset = 0)
{
	if(offset > 0)
		console.log(offset, chat.scrollHeight-chat.scrollTop, chat.clientHeight+offset, chat.scrollHeight-chat.scrollTop <= chat.clientHeight+offset ? 'bottom' : 'scrolled')
	return chat.scrollHeight-chat.scrollTop <= chat.clientHeight+offset+20
}

function clamp(val, min, max)
{
	if(val < min)
		val = min
	else if(val > max)
		val = max
	return val
}

function random_hash()
{
	return Math.random().toString(36).substr(2,11) + Math.random().toString(36).substr(2,11)
}

var dateReg = /(?<year>\d*)-(?<month>\d*)-(?<day>\d*).(?<hour>\d*):(?<minute>\d*):(?<second>\d*)/
function GetDate() // YYYYMMDD HHMMSS
{
	var cur_date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString() // 2021-07-18T00:19:30.530Z
	var reg_ret = dateReg.exec(cur_date)
	return format('{0}{1}{2} {3}{4}{5}', reg_ret.groups['year'], reg_ret.groups['month'], reg_ret.groups['day'], reg_ret.groups['hour'], reg_ret.groups['minute'], reg_ret.groups['second'] )
}
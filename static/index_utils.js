/* 유튜브 주소 파싱 */
var youtubeReg = /(\?|&)v=([^&\?]+)/
var youtubeReg2 = /\/v\/([^\/]+)/
var youtubeReg3 = /youtu\.be\/([^\?]+)/
function youtube_url_parse(url_or_id)
{
	if(youtubeReg.test(url_or_id))
		return youtubeReg.exec(url_or_id)[2]
	else if(youtubeReg2.test(url_or_id))
		return youtubeReg2.exec(url_or_id)[1]
	else if(youtubeReg3.test(url_or_id))
		return youtubeReg3.exec(url_or_id)[1]
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

function scrollDown(isForce = false)
{
	if(chat.scrollHeight - (chat.scrollTop + chat.clientHeight) < chat.clientHeight || isForce)
		chat.scrollTop = chat.scrollHeight
}
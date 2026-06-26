const express = require('express')
const http = require('http')
const app = express()
const server = http.createServer(app)
const io = require('socket.io')(server)
require('date-utils')
const fs = require('fs')

var g_last_query = ''
var g_port = 1024

app.use('/fonts', express.static('./static/fonts'))
app.use('/static', express.static('./static'))
app.use('/icon', express.static('./static/icon'))
app.use('/tts', express.static('./tts'))

app.get('/', async function(request, response, next) {
    console.log("someone visited")
	if(!request.headers.host) // 봇 쳐내
		return

	try
	{
		var data = await read_file_async('dj.html')
		var text = data.toString()
					.replace(/\$_localhost/g, 'http://' + request.headers.host.substr(0, request.headers.host.length-5))
					.replace(/\$_port/g, g_port)

		for(var e of text.match(/\/[^\/]*?\$_version/g))
		{
			var matchs = e.match(/\/(.*?)(\?.*)\$_version/)
			var file_name = matchs[1]
			var other_str = matchs[2]
			var stat = await stat_file_async(format('./static/{0}', file_name))
			stat = stat.toJSON().replace(/\D/g, '')
			text = text.replace(e, format('/{0}{1}{2}', file_name, other_str, stat))
		}

		response.writeHead(200, {'Content-Type':'text/html'})
		response.write(text)
		response.end()
	}
	catch (exception)
	{
		log_exception('app.get', exception)
		response.send('서버가 고장남!!! Kakao ID: AnsanSuperstar 로 문의하세요' + '<p><p>에러 내용 : <p>' + format('<p>Name : {0}<p>ERROR : {1}<p>Message : {2}<p>Stack : {3}', exception.name, exception.err, exception.message, exception.stack))
	}
})

io.sockets.on('connection', (socket) => {
  console.log(`Socket connected : ${socket.id}`)

  socket.on('disconnect', () => {
    console.log(`Socket disconnected : ${socket.id}`)
  })

    socket.on('login',function(data){
        console.log("login", data)
        
        socket.emit('login', true)
    })

    socket.on('check_user', function(data) {
        console.log('check_user', data)

        socket.emit('check_user', false)
    })

})

server.listen(1024, () => {
  console.log(`Server listening at http://localhost:1024`)
})

 
function stat_file_async(file_name)
{
	return new Promise(function (resolve, reject) {
		fs.stat(file_name, function(err, data) {
			err ? reject(err) : resolve(data.mtime)
		})
	})
}

function read_file_async(file_name)
{
	return new Promise(function (resolve, reject) {
		fs.readFile(file_name, 'utf8', function(err, data) {
			err ? reject(err) : resolve(data)
		})
	})
}

function log(type, function_name, message, isChat = false)
{
	if(isChat)
		return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m {1} :', GetDate(), function_name), message, '\x1b[0m')

	var color = '\x1b[37m'
	if(type == 'INFO')
		color = '\x1b[32m'
	else if(type == 'ERROR' || type == 'ERROR_CATCH')
		color = '\x1b[31m'

	return console.log(format('\x1b[47m\x1b[30m({0})\x1b[0m\x1b[40m [{2}]{1}', GetDate(), color, function_name), message, '\x1b[0m')
}

function log_exception(function_name, exception, message = null)
{
	if(typeof(message) == 'object')
		message = JSON.stringify(message)
	log('ERROR_CATCH', function_name, format('\nName : {0}\nERROR : {1}\nMessage : {2}\nStack : {3}\nComment : {4}\nLast Query : {5}', exception.name, exception.err, exception.message, exception.stack, message, g_last_query))
	io.sockets.emit('throw_data', exception)
}

function format() 
{ 
	var args = Array.prototype.slice.call (arguments, 1); 
	return arguments[0].replace (/\{(\d+)\}/g, function (match, index) { return args[index]; }); 
}

function GetTime() 
{
	return new Date().addHours(9).toFormat('HH24:MI')
}
function GetDate() 
{
	return new Date().addHours(9).toFormat('YYYY-MM-DD HH24:MI:SS')
}
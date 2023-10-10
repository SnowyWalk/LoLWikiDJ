/* RTSP 스트림 */
// rtsp_stream = require('node-rtsp-stream')
// rtsp = new rtsp_stream({
// 	name: 'name name name',
// 	streamUrl: ''	
// })
const NodeMediaServer = require('node-media-server');

const nms_config = {
	logType: 3,
	rtmp: {
		port: 1935,
		chunk_size: 60000,
		gop_cache: true,
		ping: 30,
		ping_timeout: 60,
	},
	http: {
		port: 9001,
		allow_origin: '*'
	},
	https: {
		port: 9002,
		cert: "/etc/letsencrypt/live/lolwiki.xyz/fullchain.pem",
		key: "/etc/letsencrypt/live/lolwiki.xyz/privkey.pem"
	}
}

var nms = new NodeMediaServer(nms_config)
nms.run();
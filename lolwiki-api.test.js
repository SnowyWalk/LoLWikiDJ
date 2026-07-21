'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const {
	createLolWikiClient,
	normalizeListPost,
	normalizeDetailPost,
	normalizeComment,
	normalizeUser,
	constants
} = require('./lolwiki-api')

const samplePost = {
	post_seq: 8526228,
	title: '씻고..',
	body: '다시공장지어야겟지요이',
	author: '반율연가',
	author_id: '8b9c096a23dd3e32',
	author_stack_count: 4410,
	created_at: '2026-07-21T20:59:37',
	likes: 2,
	views: 10,
	comments: 1,
	avatar_url: 'https://img.lolwiki.kr/i/avatar/thumb',
	image_url: 'https://img.lolwiki.kr/i/480b863/resize',
	image_urls: ['https://img.lolwiki.kr/i/480b863/resize'],
	youtube_url: '',
	report_count: 3
}

test('new post, detail, comment, and user contracts map to the legacy UI contract', () => {
	const list = normalizeListPost(samplePost)
	assert.equal(list.post_seq, '8526228')
	assert.equal(list.post_title, '씻고..')
	assert.equal(list.reply_cnt, 1)
	assert.equal(list.icon_img, samplePost.avatar_url)
	assert.equal(list.pic_new, 'remote-image')
	assert.deepEqual(list.image_urls, samplePost.image_urls)
	assert.deepEqual(normalizeListPost({
		image_urls: ['https://img.lolwiki.kr/i/example/resize'],
		image_thumb_urls: ['https://img.lolwiki.kr/i/example/thumb'],
		original_image_urls: ['https://img.lolwiki.kr/i/example/original']
	}).image_urls, ['https://img.lolwiki.kr/i/example/resize'], 'one rendition per image should be rendered')

	const identity = { local_user_key: samplePost.author_id }
	const detail = normalizeDetailPost(samplePost, identity)
	assert.equal(detail.post_text, samplePost.body)
	assert.equal(detail.my_post, '1')
	assert.equal(detail.stack, '4410')
	assert.deepEqual(detail.image_urls, samplePost.image_urls)

	const comment = normalizeComment({
		comment_seq: 101,
		author: '댓글러',
		body: '내용',
		created_at: '2026-07-21T21:00:00',
		avatar_url: 'https://img.lolwiki.kr/i/comment/thumb',
		image_url: 'https://img.lolwiki.kr/i/comment/resize',
		is_mine: true
	})
	assert.equal(comment.reply_seq, '101')
	assert.equal(comment.reply_title, '내용')
	assert.equal(comment.image_url, 'https://img.lolwiki.kr/i/comment/resize')
	assert.equal(comment.my_post, 1)

	const user = normalizeUser({
		local_user_key: 'local-key',
		nickname: '사용자',
		stack_count: 123,
		avatar_url: 'https://img.lolwiki.kr/i/user/thumb'
	}, 'legacy-id')
	assert.equal(user.android_id, 'legacy-id')
	assert.equal(user.iconpic, 'https://img.lolwiki.kr/i/user/thumb')
	assert.equal(user.point, 123)
})

test('article list uses the new REST endpoint, app headers, and cursor pagination', async () => {
	const calls = []
	const socket = {}
	const client = createLolWikiClient(async options => {
		calls.push(options)
		return {
			status: 'OK',
			results: [Object.assign({ notice: 1 }, samplePost), Object.assign({}, samplePost, { post_seq: 8526227, notice: 0 })],
			next_before_seq: 8526227
		}
	})

	const firstPage = await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 0, 30)
	assert.equal(firstPage.length, 2)
	assert.equal(calls[0].uri, `${constants.API_BASE_URL}/legacy-read-compat/posts`)
	assert.equal(calls[0].method, 'GET')
	assert.equal(calls[0].qs.offset, 0)
	assert.equal(calls[0].headers['X-App-Version'], constants.APP_VERSION)
	assert.equal(calls[0].headers['X-Device-ID'], constants.GUEST_DEVICE_ID)

	calls.length = 0
	const nextPage = await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 30, 30)
	assert.equal(calls[0].qs.before_seq, 8526227)
	assert.equal(calls[0].qs.offset, undefined)
	assert.equal(nextPage.length, 1)
	assert.equal(nextPage[0].post_seq, '8526227')
})

test('article pagination stops after the API reports the last cursor page', async () => {
	let requestCount = 0
	const socket = {}
	const client = createLolWikiClient(async () => {
		requestCount++
		return { status: 'OK', results: [samplePost], has_more: false }
	})

	assert.equal((await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 0, 30)).length, 1)
	assert.deepEqual(await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 1, 30), [])
	assert.equal(requestCount, 1, 'a completed cursor must not fetch the final page repeatedly')
})

test('popular article pagination uses the paired likes and sequence cursor', async () => {
	const calls = []
	const socket = {}
	const client = createLolWikiClient(async options => {
		calls.push(options)
		return {
			status: 'OK',
			results: [samplePost],
			has_more: true,
			next_before_seq: 8526228,
			next_cursor_likes: 2,
			next_cursor_seq: 8526228
		}
	})

	await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 0, 22, '', '', true, false)
	await client.getArticleList(socket, constants.GUEST_DEVICE_ID, 22, 22, '', '', true, false)
	assert.equal(calls[1].qs.cursor_likes, 2)
	assert.equal(calls[1].qs.cursor_seq, 8526228)
	assert.equal(calls[1].qs.before_seq, undefined)
})

test('mine searches use the API mine mode and modern author identity', async () => {
	const calls = []
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: 'user' } }
		return { status: 'OK', results: [] }
	})

	await client.getArticleList({}, 'legacy-id', 0, 30, '', '', false, true)
	const listCall = calls.find(call => call.uri.endsWith('/legacy-read-compat/posts'))
	assert.equal(listCall.qs.mode, 'mine')
	assert.equal(listCall.qs.author_id, 'local-key')
})

test('article lists use the current viewer for block filtering when browsing another author', async () => {
	const calls = []
	const blockedPost = Object.assign({}, samplePost, {
		post_seq: 8526226,
		author: 'BlockedUser',
		author_id: '73'
	})
	const allowedPost = Object.assign({}, samplePost, {
		post_seq: 8526225,
		author: 'AllowedUser',
		author_id: '74'
	})
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity')) {
			if(options.qs.legacy_id === 'viewer-legacy')
				return { status: 'OK', user: { local_user_key: 'viewer-key', nickname: 'Viewer' } }
			return { status: 'OK', user: { local_user_key: 'author-key', nickname: 'Author' } }
		}
		if(options.uri.endsWith('/legacy-read-compat/posts'))
			return { status: 'OK', results: [blockedPost, allowedPost], has_more: false }
		if(options.uri.endsWith('/blocks'))
			return { status: 'OK', results: [{ user_id: 73, nickname: 'BlockedUser' }] }
		if(options.uri.endsWith('/legacy-client-compat/blocks'))
			return { status: 'OK', results: [] }
		if(options.uri.endsWith('/memos'))
			return { status: 'OK', results: [] }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	const list = await client.getArticleList({}, 'author-legacy', 0, 30, '', '', false, true, 'viewer-legacy')
	assert.deepEqual(list.map(post => post.post_seq), ['8526225'])

	const listCall = calls.find(call => call.uri.endsWith('/legacy-read-compat/posts'))
	assert.equal(listCall.headers['X-Device-ID'], 'viewer-legacy')
	assert.equal(listCall.qs.viewer_id, 'viewer-key')
	assert.equal(listCall.qs.viewer_legacy_android_id, 'viewer-legacy')
	assert.equal(listCall.qs.author_id, 'author-key')

	const blockCall = calls.find(call => call.uri.endsWith('/blocks'))
	assert.equal(blockCall.qs.local_user_key, 'viewer-key')
})

test('detail and comments resolve legacy identity and pass the modern viewer id', async () => {
	const calls = []
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: samplePost.author_id, nickname: samplePost.author } }
		if(options.uri.endsWith('/legacy-read-compat/post'))
			return { status: 'OK', post: samplePost }
		if(options.uri.endsWith('/legacy-read-compat/comments'))
			return { status: 'OK', results: [{ comment_seq: 5, author: '댓글러', body: '댓글' }] }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	const detail = await client.getArticleDetail('legacy-id', samplePost.post_seq)
	const comments = await client.getArticleReplies('legacy-id', samplePost.post_seq)
	assert.equal(detail.my_post, '1')
	assert.equal(comments[0].reply_seq, '5')

	const detailCall = calls.find(call => call.uri.endsWith('/legacy-read-compat/post'))
	const commentsCall = calls.find(call => call.uri.endsWith('/legacy-read-compat/comments'))
	assert.equal(detailCall.qs.viewer_id, samplePost.author_id)
	assert.equal(commentsCall.qs.viewer_id, samplePost.author_id)
	assert.equal(calls.filter(call => call.uri.endsWith('/users/legacy-identity')).length, 1, 'identity should be cached')
})

test('legacy login upgrades identities without a local key and refreshes bearer auth once', async () => {
	const calls = []
	let voteAttempts = 0
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return {
				status: 'OK',
				found: true,
				user: { nickname: 'legacy-user', stack_count: 10, avatar_url: 'https://img.lolwiki.kr/i/user/thumb' }
			}
		if(options.uri.endsWith('/users'))
			return {
				status: 'OK',
				user: { local_user_key: 'legacy-id', nickname: 'legacy-user', stack_count: 10 },
				auth: { access_token: 'old-access', refresh_token: 'old-refresh' }
			}
		if(options.uri.endsWith('/auth/refresh')) {
			assert.equal(options.headers.Authorization, undefined)
			assert.equal(options.body.refresh_token, 'old-refresh')
			return { status: 'OK', auth: { access_token: 'new-access', refresh_token: 'new-refresh' } }
		}
		if(options.uri === constants.IMAGE_UPLOAD_URL) {
			assert.equal(options.headers.Authorization, undefined, 'API bearer tokens must not leak to the image host')
			return { success: true, data: { id: 'upload-id' } }
		}
		if(options.uri.endsWith('/vote')) {
			voteAttempts++
			assert.equal(options.headers.Authorization, `Bearer ${voteAttempts === 1 ? 'old-access' : 'new-access'}`)
			if(voteAttempts === 1) {
				const error = new Error('expired')
				error.statusCode = 401
				throw error
			}
			return { status: 'OK', vote: 'up' }
		}
		throw new Error(`unexpected request: ${options.uri}`)
	})

	const user = await client.getUserInfo('legacy-id')
	assert.equal(user.local_user_key, 'legacy-id')
	assert.equal(user.point, 10)
	const upsertCall = calls.find(call => call.uri.endsWith('/users'))
	assert.equal(upsertCall.body.legacy_android_id, 'legacy-id')
	assert.equal(upsertCall.body.local_user_key, 'legacy-id')
	await client.uploadImage(Buffer.from('image').toString('base64'), 'legacy-id')
	assert.equal(await client.votePost(8526228, 'legacy-id'), true)
	assert.equal(voteAttempts, 2)
})

test('an unsupported legacy identity remains logged out', async () => {
	const client = createLolWikiClient(async () => ({ status: 'OK', found: false, supported: true, user: null }))
	assert.equal(await client.getIdentity('missing-legacy-id'), null)
})

test('write, vote, and delete calls use JSON legacy-write endpoints with request ids', async () => {
	const calls = []
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자', avatar_image_id: 'avatar' } }
		if(options.uri.endsWith('/users/login'))
			return {
				status: 'OK',
				user: { local_user_key: 'local-key', nickname: '사용자' },
				auth: { access_token: 'write-access', refresh_token: 'write-refresh' }
			}
		if(options.uri === constants.IMAGE_UPLOAD_URL)
			return { success: true, data: { id: 'uploaded-image-id' } }
		return { status: 'OK', vote: 'up' }
	})

	await client.writePost('legacy-id', '제목', '본문', '', Buffer.from('image').toString('base64'), false, 'account-id', 'password')
	await client.writeReply(8526228, 'legacy-id', '댓글', '', 'account-id', 'password')
	assert.equal(await client.votePost(8526228, 'legacy-id'), true)
	await client.deleteReply('legacy-id', 8526228, 100)
	await client.deletePost('legacy-id', 8526228)

	const postCall = calls.find(call => call.uri.endsWith('/board/legacy-write/posts'))
	const imageUploadCall = calls.find(call => call.uri === constants.IMAGE_UPLOAD_URL)
	assert(Buffer.isBuffer(imageUploadCall.formData.image.value))
	assert.equal(imageUploadCall.formData.image.value.toString(), 'image')
	assert.equal(imageUploadCall.formData.file, undefined)
	assert.equal(imageUploadCall.formData.image.options.contentType, 'image/jpeg')
	assert.equal(postCall.method, 'POST')
	assert.equal(postCall.headers.Authorization, 'Bearer write-access')
	assert.deepEqual(Object.keys(postCall.body).sort(), [
		'body', 'image_format', 'image_id', 'notice', 'request_id', 'title', 'youtube_url'
	])
	assert.equal(postCall.body.image_id, 'uploaded-image-id')
	assert.match(postCall.body.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
	const pendingCall = calls.find(call => call.uri.endsWith('/board/legacy-write/images/pending'))
	assert.deepEqual(pendingCall.body, { image_id: 'uploaded-image-id', image_format: 'jpg' })
	const commentCall = calls.find(call => call.uri.endsWith('/board/legacy-write/posts/8526228/comments'))
	assert.deepEqual(Object.keys(commentCall.body).sort(), [
		'body', 'image_format', 'image_id', 'mention_user_id', 'parent_id', 'request_id'
	])
	assert.equal(commentCall.body.mention_user_id, '')
	assert(calls.some(call => call.uri.endsWith('/board/legacy-write/posts/8526228/vote')))
	assert(calls.some(call => call.uri.endsWith('/board/legacy-write/posts/8526228/comments/100/delete')))
	assert(calls.some(call => call.uri.endsWith('/board/legacy-write/posts/8526228/delete')))
})

test('image upload accepts data URLs and uses the API image multipart field', async () => {
	let uploadCall
	const client = createLolWikiClient(async options => {
		uploadCall = options
		return { success: true, data: { id: 'gif-image-id' } }
	})

	const uploaded = await client.uploadImage('data:image/gif;base64,R0lGODlh', 'legacy-id', 'gif')
	assert.deepEqual(uploaded, { id: 'gif-image-id', format: 'gif' })
	assert.equal(uploadCall.formData.password, 'lolwiki-app-marker')
	assert.equal(uploadCall.formData.image.value.toString('ascii'), 'GIF89a')
	assert.equal(uploadCall.formData.image.options.contentType, 'image/gif')
	assert.match(uploadCall.formData.image.options.filename, /\.gif$/)
})

test('image upload failures expose the failing write stage', async () => {
	const client = createLolWikiClient(async options => {
		if(options.uri === constants.IMAGE_UPLOAD_URL) {
			const error = new Error('bad upload')
			error.statusCode = 400
			throw error
		}
		throw new Error(`unexpected request: ${options.uri}`)
	})

	await assert.rejects(
		client.uploadImage(Buffer.from('image'), 'legacy-id'),
		error => error.code === 'LOLWIKI_IMAGE_UPLOAD_FAILED' && error.statusCode === 400
	)
})

test('write authentication links legacy users and retries login when registration returns no token', async () => {
	const calls = []
	let loginAttempts = 0
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자' } }
		if(options.uri.endsWith('/users/login')) {
			loginAttempts++
			if(loginAttempts === 1) {
				const error = new Error('not registered')
				error.statusCode = 401
				throw error
			}
			return { status: 'OK', auth: { access_token: 'registered-access', refresh_token: 'registered-refresh' } }
		}
		if(options.uri.endsWith('/users'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자' } }
		if(options.uri.endsWith('/comments'))
			return { status: 'OK' }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	await client.writeReply(8526228, 'legacy-id', '댓글', '', 'new-account', 'new-password')
	assert.equal(loginAttempts, 2)
	const registrationCall = calls.find(call => call.uri.endsWith('/users'))
	assert.equal(registrationCall.body.account_id, 'new-account')
	assert.equal(registrationCall.body.password, 'new-password')
	assert.equal(registrationCall.body.legacy_android_id, 'legacy-id')
	assert.equal(registrationCall.body.legacy_platform, undefined)
	assert.equal(registrationCall.body.avatar_url, undefined)
	const commentCall = calls.find(call => call.uri.endsWith('/comments'))
	assert.equal(commentCall.headers.Authorization, 'Bearer registered-access')
})

test('writes fail before uploading when API account credentials are missing', async () => {
	const calls = []
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자' } }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	await assert.rejects(
		client.writePost('legacy-id', '제목', '본문', '', Buffer.from('image').toString('base64')),
		error => error.code === 'LOLWIKI_AUTH_FAILED'
	)
	assert.equal(calls.some(call => call.uri === constants.IMAGE_UPLOAD_URL), false)
})

test('write-account logout clears cached bearer authentication', async () => {
	const client = createLolWikiClient(async options => {
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자' } }
		if(options.uri.endsWith('/users/login'))
			return { status: 'OK', auth: { access_token: 'access', refresh_token: 'refresh' } }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	await client.authenticate('legacy-id', 'account-id', 'password')
	client.logout('legacy-id')
	await assert.rejects(
		client.writeReply(8526228, 'legacy-id', '댓글'),
		error => error.code === 'LOLWIKI_AUTH_FAILED'
	)
})

test('cached write authentication accepts the remembered account without resending a password', async () => {
	const calls = []
	const client = createLolWikiClient(async options => {
		calls.push(options)
		if(options.uri.endsWith('/users/legacy-identity'))
			return { status: 'OK', user: { local_user_key: 'local-key', nickname: '사용자' } }
		if(options.uri.endsWith('/users/login'))
			return { status: 'OK', auth: { access_token: 'access', refresh_token: 'refresh' } }
		if(options.uri.endsWith('/comments'))
			return { status: 'OK' }
		throw new Error(`unexpected request: ${options.uri}`)
	})

	await client.authenticate('legacy-id', 'account-id', 'password')
	await client.writeReply(8526228, 'legacy-id', '댓글', '', 'account-id', '')
	assert.equal(calls.filter(call => call.uri.endsWith('/users/login')).length, 1)
	const commentCall = calls.find(call => call.uri.endsWith('/comments'))
	assert.equal(commentCall.headers.Authorization, 'Bearer access')
})

test('every channel server activates the shared REST compatibility client', () => {
	const serverFiles = [
		'1004.js', '1111.js', '1128.js', '1224.js', '1337.js', '1557.js', '2250.js', '3939.js',
		'4010.js', '4444.js', '49415.js', '5599.js', '7777.js', '80.js', '8080.js', '8081.js', '8082.js', '8083.js'
	]
	for(const file of serverFiles) {
		const source = fs.readFileSync(path.join(__dirname, file), 'utf8')
		assert.match(source, /createLolWikiClient\(request\)/, `${file} does not activate the compatibility client`)
		assert.match(source, /data\.account_id, data\.password/, `${file} does not forward write credentials`)
		assert.match(source, /socket\.emit\('lol_api_error'/, `${file} does not report write failures to the browser`)
		assert.match(source, /lolwikiApiClient\.logout\(android_id\)/, `${file} does not clear cached write authentication`)
		assert.match(source, /var viewer_android_id = data\.viewer_android_id \|\| android_id/, `${file} does not receive the current list viewer`)
		if(file === '4444.js') {
			assert.match(source, /function\(android_id, seq, cnt, body, nick, vote, mine, viewer_android_id\)/, `${file} does not adapt its older list signature`)
			assert.match(source, /getArticleList\(null, android_id, seq, cnt, body, nick, vote, mine, viewer_android_id\)/, `${file} does not forward the current list viewer`)
		}
		else {
			assert.match(source, /lol_get_article_list = lolwikiApiClient\.getArticleList/, `${file} does not route article lists`)
			assert.match(source, /lol_get_article_list\(socket, android_id, seq, cnt, body, nick, vote, mine, viewer_android_id\)/, `${file} does not forward the current list viewer`)
		}
	}
})

test('browser routes LoLWiki images through the local mirror and keeps API passwords in memory only', () => {
	const lolSource = fs.readFileSync(path.join(__dirname, 'static', 'index_lol.js'), 'utf8')
	const socketSource = fs.readFileSync(path.join(__dirname, 'static', 'index_socket.js'), 'utf8')
	const indexSource = fs.readFileSync(path.join(__dirname, 'static', 'index.js'), 'utf8')
	const htmlSource = fs.readFileSync(path.join(__dirname, 'dj.html'), 'utf8')
	assert.match(lolSource, /\(\?:img\\\.\)\?lolwiki\\\.kr/)
	assert.match(lolSource, /\/lolwiki_mirror\?uri=/)
	assert.match(lolSource, /passwordInput\.type = 'password'/)
	assert.doesNotMatch(lolSource, /(?:localStorage|sessionStorage)\.setItem\([^\n]*g_lol_api_password/)
	assert.match(lolSource, /lol_api_storage_set\(g_storage_lol_api_account_key, accountId\)/)
	assert.match(lolSource, /g_lol_api_password \|\| g_lol_api_session_ready/)
	assert.match(lolSource, /function lol_confirm_api_session\(\)/)
	assert.match(lolSource, /viewer_android_id: g_lol_android_id/)
	assert.match(socketSource, /socket\.on\('lol_api_error'/)
	assert.match(socketSource, /code == 'LOLWIKI_AUTH_FAILED' \|\| statusCode == 401/)
	assert.match(socketSource, /g_lol_android_id != g_lol_guest_id/)
	assert.match(socketSource, /socket\.on\('lol_api_logout'/)
	assert.match(indexSource, /lol_lpanel_userinfo_menu_button_api_logout\.onclick/)
	assert.match(htmlSource, /id="lol_lpanel_userinfo_menu_button_api_logout"/)
})

test('the 1224 development server forwards the current viewer to article-list filtering', () => {
	const source = fs.readFileSync(path.join(__dirname, '1224.js'), 'utf8')
	assert.match(source, /var viewer_android_id = data\.viewer_android_id \|\| android_id/)
	assert.match(source, /lol_get_article_list\(socket, android_id, seq, cnt, body, nick, vote, mine, viewer_android_id\)/)
})

test('the active 8080 server distinguishes authentication failures from transient API errors', () => {
	const source = fs.readFileSync(path.join(__dirname, '8080.js'), 'utf8')
	assert.match(source, /code: error\.code \|\| ''/)
	assert.match(source, /status_code: error\.statusCode \|\| 0/)
})

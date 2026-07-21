'use strict'

const crypto = require('crypto')

const API_BASE_URL = 'https://lolwiki.kr/api/app/api/v1'
const IMAGE_UPLOAD_URL = 'https://img.lolwiki.kr/api/images'
const APP_VERSION = '2.0.3'
const APP_BUILD = '1784442393'
const GUEST_DEVICE_ID = 'LoLWikiDJ_Guest'
const IDENTITY_CACHE_TTL_MS = 5 * 60 * 1000
const BLOCK_CACHE_TTL_MS = 30 * 1000
const POST_CACHE_LIMIT = 1000

function firstValue(object, keys, fallback) {
	if(!object)
		return fallback

	for(const key of keys) {
		if(object[key] !== undefined && object[key] !== null)
			return object[key]
	}

	return fallback
}

function asString(value, fallback = '') {
	if(value === undefined || value === null)
		return fallback
	return String(value)
}

function asArray(value) {
	return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
	return values.filter((value, index) => value && values.indexOf(value) === index)
}

function displayDate(value) {
	return asString(value).replace('T', ' ')
}

function requestId() {
	const bytes = crypto.randomBytes(16)
	bytes[6] = (bytes[6] & 0x0f) | 0x40
	bytes[8] = (bytes[8] & 0x3f) | 0x80
	const hex = bytes.toString('hex')
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function normalizeImageUrls(source) {
	const imageUrls = asArray(source && source.image_urls)
	const originalImageUrls = asArray(source && source.original_image_urls)
	const thumbnailUrls = asArray(source && source.image_thumb_urls)

	if(imageUrls.length)
		return unique(imageUrls)
	if(originalImageUrls.length)
		return unique(originalImageUrls)
	if(thumbnailUrls.length)
		return unique(thumbnailUrls)
	return unique([
		firstValue(source, ['image_url'], ''),
		firstValue(source, ['original_image_url'], '')
	])
}

function normalizeListPost(post) {
	const imageUrls = normalizeImageUrls(post)
	return {
		icon_img: asString(firstValue(post, ['avatar_url'], '')),
		post_title: asString(firstValue(post, ['title'], '')),
		reply_cnt: Number(firstValue(post, ['comments', 'comment_count'], 0)) || 0,
		before: displayDate(firstValue(post, ['created_at'], '')),
		post_date: displayDate(firstValue(post, ['created_at'], '')),
		nickname: asString(firstValue(post, ['author', 'nickname'], '')),
		views: Number(firstValue(post, ['views', 'view_count'], 0)) || 0,
		likes: Number(firstValue(post, ['likes', 'like_count'], 0)) || 0,
		pic_new: imageUrls.length ? 'remote-image' : '',
		youtube_url: asString(firstValue(post, ['youtube_url'], '')),
		doodlr: 0,
		badge_use: 0,
		alarm: Number(firstValue(post, ['report_count'], 0)) || 0,
		pic_multi: '',
		fixedpic: '',
		post_seq: asString(firstValue(post, ['post_seq', 'legacy_post_seq', 'id'], '')),
		author_id: asString(firstValue(post, ['author_id'], '')),
		image_urls: imageUrls
	}
}

function normalizeDetailPost(post, identity) {
	const imageUrls = normalizeImageUrls(post)
	const authorId = asString(firstValue(post, ['author_id'], ''))
	const identityKey = identity && asString(firstValue(identity, ['local_user_key', 'user_key', 'id'], ''))
	const isMine = Boolean(firstValue(post, ['is_mine', 'my_post'], false)) || Boolean(identityKey && authorId === identityKey)

	return {
		post_title: asString(firstValue(post, ['title'], '')),
		post_text: asString(firstValue(post, ['body', 'text'], '')),
		post_seq: asString(firstValue(post, ['post_seq', 'legacy_post_seq', 'id'], '')),
		post_date: displayDate(firstValue(post, ['created_at'], '')),
		likes: asString(firstValue(post, ['likes', 'like_count'], 0), '0'),
		pic_new: '',
		pic_multi: '',
		youtube_url: asString(firstValue(post, ['youtube_url'], '')),
		views: asString(firstValue(post, ['views', 'view_count'], 0), '0'),
		stack: asString(firstValue(post, ['author_stack_count', 'stack_count'], 0), '0'),
		nickname: asString(firstValue(post, ['author', 'nickname'], '')),
		doodlr: 0,
		icon_img: asString(firstValue(post, ['avatar_url'], '')),
		badge_use: 0,
		doodlrurls: '',
		fixedpic: '',
		my_post: isMine ? '1' : '0',
		author_id: authorId,
		image_urls: imageUrls
	}
}

function normalizeComment(comment) {
	return {
		reply_seq: asString(firstValue(comment, ['comment_seq', 'id'], '')),
		parent_id: Number(firstValue(comment, ['parent_id'], 0)) || 0,
		nickname: asString(firstValue(comment, ['author', 'nickname'], '')),
		author_id: asString(firstValue(comment, ['author_id'], '')),
		icon_img: asString(firstValue(comment, ['avatar_url'], '')),
		badge_use: 0,
		reply_title: asString(firstValue(comment, ['body', 'text'], '')),
		reply_date: displayDate(firstValue(comment, ['created_at'], '')),
		reply_img: '',
		image_url: asString(firstValue(comment, ['image_url'], '')),
		my_post: firstValue(comment, ['is_mine'], false) ? 1 : 0,
		deleted: Boolean(firstValue(comment, ['deleted', 'is_deleted'], false))
	}
}

function normalizeUser(user, legacyId) {
	if(!user)
		return null

	const avatarImageId = asString(firstValue(user, ['avatar_image_id'], ''))
	const avatarUrl = asString(firstValue(user, ['avatar_url', 'icon_url'], avatarImageId ? `https://img.lolwiki.kr/i/${avatarImageId}/thumb` : ''))
	const stackCount = Number(firstValue(user, ['stack_count', 'point'], 0)) || 0

	return Object.assign({}, user, {
		android_id: asString(firstValue(user, ['legacy_android_id'], legacyId)),
		local_user_key: asString(firstValue(user, ['local_user_key', 'user_key'], '')),
		nickname: asString(firstValue(user, ['nickname'], '')),
		motto: asString(firstValue(user, ['motto'], '')),
		avatar_image_id: avatarImageId,
		fixed_image_id: asString(firstValue(user, ['fixed_image_id'], '')),
		avatar_url: avatarUrl,
		iconpic: avatarUrl,
		badge_use: Number(firstValue(user, ['badge_use'], 0)) || 0,
		point: stackCount,
		stack_count: stackCount
	})
}

function createLolWikiClient(request) {
	if(typeof request !== 'function')
		throw new TypeError('request function is required')

	const identityCache = new Map()
	const identityUpgradePromises = new Map()
	const authCache = new Map()
	const credentialAccountIds = new Map()
	const blockCache = new Map()
	const postCache = new Map()
	const paginationBySocket = new WeakMap()

	function rememberPost(postSeq, post) {
		if(postCache.has(postSeq))
			postCache.delete(postSeq)
		postCache.set(postSeq, post)
		if(postCache.size > POST_CACHE_LIMIT)
			postCache.delete(postCache.keys().next().value)
	}

	function deviceHeaders(deviceId, json = true) {
		const headers = {
			'X-Device-ID': deviceId || GUEST_DEVICE_ID,
			'X-App-Platform': 'android',
			'X-App-Version': APP_VERSION,
			'X-App-Build': APP_BUILD,
			'Accept': 'application/json'
		}
		const auth = authCache.get(deviceId)
		if(auth && auth.accessToken)
			headers.Authorization = `Bearer ${auth.accessToken}`
		if(json)
			headers['Content-Type'] = 'application/json'
		return headers
	}

	function captureAuth(deviceId, response) {
		const auth = response && (response.auth || response)
		const accessToken = asString(firstValue(auth, ['access_token'], ''))
		const refreshToken = asString(firstValue(auth, ['refresh_token'], ''))
		if(!deviceId || (!accessToken && !refreshToken))
			return

		const current = authCache.get(deviceId) || {}
		authCache.set(deviceId, {
			accessToken: accessToken || current.accessToken || '',
			refreshToken: refreshToken || current.refreshToken || ''
		})
	}

	async function refreshAuth(deviceId) {
		const auth = authCache.get(deviceId)
		if(!auth || !auth.refreshToken)
			return false

		try {
			const headers = deviceHeaders(deviceId, true)
			delete headers.Authorization
			const response = await request({
				uri: `${API_BASE_URL}/auth/refresh`,
				method: 'POST',
				headers,
				body: { refresh_token: auth.refreshToken, device_id: deviceId },
				json: true,
				timeout: 15000
			})
			captureAuth(deviceId, response)
			return Boolean(authCache.get(deviceId) && authCache.get(deviceId).accessToken)
		}
		catch(error) {
			authCache.delete(deviceId)
			return false
		}
	}

	async function apiRequest(method, path, options = {}) {
		function buildRequestOptions() {
			const requestOptions = {
				uri: `${API_BASE_URL}${path}`,
				method,
				headers: deviceHeaders(options.deviceId, true),
				json: true,
				timeout: 15000
			}
			if(options.query)
				requestOptions.qs = options.query
			if(options.body !== undefined)
				requestOptions.body = options.body
			return requestOptions
		}

		try {
			const response = await request(buildRequestOptions())
			captureAuth(options.deviceId, response)
			return response
		}
		catch(error) {
			if(error && error.statusCode === 401 && await refreshAuth(options.deviceId)) {
				const response = await request(buildRequestOptions())
				captureAuth(options.deviceId, response)
				return response
			}
			throw error
		}
	}

	async function withWriteStage(code, action) {
		try {
			return await action()
		}
		catch(error) {
			if(error && !error.code)
				error.code = code
			throw error
		}
	}

	async function uploadImage(image, deviceId, imageFormat = 'jpg') {
		if(!image)
			return null

		let buffer
		if(Buffer.isBuffer(image))
			buffer = image
		else if(image instanceof ArrayBuffer)
			buffer = Buffer.from(image)
		else if(ArrayBuffer.isView(image))
			buffer = Buffer.from(image.buffer, image.byteOffset, image.byteLength)
		else if(image && image.type === 'Buffer' && Array.isArray(image.data))
			buffer = Buffer.from(image.data)
		else {
			const encoded = asString(image).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
			buffer = Buffer.from(encoded, 'base64')
		}
		if(!buffer.length)
			throw new Error('LoLWiki image upload received an empty image')

		const normalizedFormat = imageFormat === 'gif' ? 'gif' : 'jpg'
		const headers = deviceHeaders(deviceId, false)
		delete headers.Authorization
		const response = await withWriteStage('LOLWIKI_IMAGE_UPLOAD_FAILED', () => request({
			uri: IMAGE_UPLOAD_URL,
			method: 'POST',
			headers,
			formData: {
				password: 'lolwiki-app-marker',
				image: {
					value: buffer,
					options: {
						filename: `lolwikidj-${requestId()}.${normalizedFormat}`,
						contentType: normalizedFormat === 'gif' ? 'image/gif' : 'image/jpeg'
					}
				}
			},
			json: true,
			timeout: 30000
		}))
		const imageId = firstValue(response && response.data, ['id'], firstValue(response, ['image_id', 'id'], ''))
		if(!imageId)
			throw new Error('LoLWiki image upload did not return an image id')
		return { id: asString(imageId), format: normalizedFormat }
	}

	async function getIdentity(legacyId) {
		if(!legacyId || legacyId === GUEST_DEVICE_ID)
			return null

		const cached = identityCache.get(legacyId)
		if(cached && Date.now() - cached.savedAt < IDENTITY_CACHE_TTL_MS)
			return cached.value

		try {
			const response = await apiRequest('GET', '/users/legacy-identity', {
				deviceId: legacyId,
				query: { platform: 'android', legacy_id: legacyId }
			})
			const responseHasUser = response && Object.prototype.hasOwnProperty.call(response, 'user')
			const rawUser = responseHasUser ? response.user : firstValue(response, ['result'], response)
			const value = response && response.found === false ? null : normalizeUser(rawUser, legacyId)
			identityCache.set(legacyId, { savedAt: Date.now(), value })
			return value
		}
		catch(error) {
			if(error && (error.statusCode === 404 || error.statusCode === 400)) {
				identityCache.set(legacyId, { savedAt: Date.now(), value: null })
				return null
			}
			throw error
		}
	}

	async function getNewMemo(socket, legacyId) {
		const identity = await getIdentity(legacyId)
		if(!identity || !identity.local_user_key)
			return false

		const response = await apiRequest('GET', '/memos', {
			deviceId: legacyId,
			query: { local_user_key: identity.local_user_key, limit: 20 }
		})
		const results = asArray(response && response.results)
		const hasUnread = Number(firstValue(response, ['unread_count'], 0)) > 0 || results.some(item => item.unread || Number(item.unread_count) > 0)
		if(hasUnread && socket)
			socket.emit('lol_get_new_memo')
		return hasUnread
	}

	function addComparable(set, value) {
		const comparable = asString(value).trim().toLocaleLowerCase()
		if(comparable)
			set.add(comparable)
	}

	function createBlockedAuthorFilter(blocks) {
		const ids = new Set()
		const nicknames = new Set()
		for(const block of blocks) {
			if(!block || block.blocked === false)
				continue

			const blockedUser = firstValue(block, ['blocked_user', 'target_user', 'target', 'user'], null)
			for(const key of ['blocked_user_id', 'target_user_id', 'target_id', 'user_id', 'blocked_local_user_key', 'target_local_user_key', 'local_user_key', 'target_legacy_android_id'])
				addComparable(ids, block[key])
			for(const key of ['blocked_nickname', 'target_nickname', 'nickname'])
				addComparable(nicknames, block[key])

			if(blockedUser && typeof blockedUser === 'object') {
				for(const key of ['id', 'user_id', 'local_user_key', 'user_key', 'legacy_android_id', 'android_id'])
					addComparable(ids, blockedUser[key])
				addComparable(nicknames, blockedUser.nickname)
			}
			else if(block.nickname)
				addComparable(ids, block.id)
		}
		return { ids, nicknames }
	}

	function isBlockedPost(post, blockedAuthors) {
		if(!post || (!blockedAuthors.ids.size && !blockedAuthors.nicknames.size))
			return false

		const author = post.author && typeof post.author === 'object' ? post.author : null
		const authorIds = [post.author_id, post.author_user_id, post.user_id, post.author_legacy_android_id]
		const authorNicknames = [typeof post.author === 'string' ? post.author : '', post.nickname]
		if(author) {
			authorIds.push(author.id, author.user_id, author.local_user_key, author.user_key, author.legacy_android_id, author.android_id)
			authorNicknames.push(author.nickname)
		}

		return authorIds.some(value => {
			const comparable = asString(value).trim().toLocaleLowerCase()
			return comparable && blockedAuthors.ids.has(comparable)
		}) || authorNicknames.some(value => {
			const comparable = asString(value).trim().toLocaleLowerCase()
			return comparable && blockedAuthors.nicknames.has(comparable)
		})
	}

	async function getBlockedAuthors(legacyId, identity, forceRefresh = false) {
		if(!legacyId || legacyId === GUEST_DEVICE_ID)
			return createBlockedAuthorFilter([])

		const cached = blockCache.get(legacyId)
		if(!forceRefresh && cached && Date.now() - cached.savedAt < BLOCK_CACHE_TTL_MS)
			return cached.value

		const blocks = []
		const requests = []
		if(identity && identity.local_user_key) {
			requests.push({
				path: '/blocks',
				query: { local_user_key: identity.local_user_key }
			})
		}
		requests.push({
			path: '/legacy-client-compat/blocks',
			query: { android_id: legacyId }
		})

		const responses = await Promise.all(requests.map(blockRequest => apiRequest('GET', blockRequest.path, {
			deviceId: legacyId,
			query: blockRequest.query
		}).catch(() => null)))
		for(const response of responses)
			blocks.push(...asArray(response && response.results))

		const value = createBlockedAuthorFilter(blocks)
		blockCache.set(legacyId, { savedAt: Date.now(), value })
		return value
	}

	async function getArticleList(socket, legacyId, offset = 0, limit = 30, searchBody = '', searchNickname = '', popular = false, mine = false, viewerLegacyId = legacyId) {
		const numericOffset = Math.max(0, Number(offset) || 0)
		const numericLimit = Math.max(1, Math.min(50, Number(limit) || 30))
		const normalizedViewerLegacyId = viewerLegacyId || legacyId || GUEST_DEVICE_ID
		const viewerIdentity = normalizedViewerLegacyId !== GUEST_DEVICE_ID ? await ensureModernIdentity(normalizedViewerLegacyId) : null
		const authorIdentity = mine && legacyId && legacyId !== normalizedViewerLegacyId ? await getIdentity(legacyId) : viewerIdentity
		const pageKey = JSON.stringify({ legacyId, viewerLegacyId: normalizedViewerLegacyId, searchBody, searchNickname, popular, mine, numericLimit })
		const query = {
			mode: mine ? 'mine' : popular ? 'popular' : 'latest',
			limit: numericLimit
		}
		const savedPage = socket && numericOffset > 0 ? paginationBySocket.get(socket) : null
		if(savedPage && savedPage.key === pageKey) {
			if(savedPage.done)
				return []
			if(popular && savedPage.nextCursorSeq !== '') {
				query.cursor_likes = savedPage.nextCursorLikes
				query.cursor_seq = savedPage.nextCursorSeq
			}
			else if(savedPage.nextBeforeSeq)
				query.before_seq = savedPage.nextBeforeSeq
		}
		else
			query.offset = numericOffset

		if(searchBody)
			query.q = searchBody
		if(searchNickname)
			query.nickname = searchNickname
		if(viewerIdentity && viewerIdentity.local_user_key)
			query.viewer_id = viewerIdentity.local_user_key
		if(normalizedViewerLegacyId !== GUEST_DEVICE_ID && viewerIdentity)
			query.viewer_legacy_android_id = normalizedViewerLegacyId
		if(mine)
			query.author_id = authorIdentity && authorIdentity.local_user_key ? authorIdentity.local_user_key : legacyId

		const response = await apiRequest('GET', '/legacy-read-compat/posts', { deviceId: normalizedViewerLegacyId, query })
		let posts = asArray(response && response.results)
		const blockedAuthors = await getBlockedAuthors(normalizedViewerLegacyId, viewerIdentity, numericOffset === 0)
		posts = posts.filter(post => !isBlockedPost(post, blockedAuthors))
		if(query.before_seq)
			posts = posts.filter(post => !Number(post.notice))
		for(const post of posts) {
			const postSeq = asString(firstValue(post, ['post_seq', 'legacy_post_seq', 'id'], ''))
			if(postSeq)
				rememberPost(postSeq, post)
		}
		if(socket) {
			const nextBeforeSeq = firstValue(response, ['next_before_seq'], '')
			const nextCursorLikes = firstValue(response, ['next_cursor_likes'], '')
			const nextCursorSeq = firstValue(response, ['next_cursor_seq'], '')
			const hasCursor = popular ? nextCursorSeq !== '' : nextBeforeSeq !== ''
			paginationBySocket.set(socket, {
				key: pageKey,
				nextBeforeSeq,
				nextCursorLikes,
				nextCursorSeq,
				done: Boolean(response && response.has_more === false) || !hasCursor
			})
		}

		if(normalizedViewerLegacyId !== GUEST_DEVICE_ID && socket)
			getNewMemo(socket, normalizedViewerLegacyId).catch(() => {})

		return posts.map(normalizeListPost)
	}

	async function getArticleDetail(legacyId, postSeq) {
		const identity = legacyId && legacyId !== GUEST_DEVICE_ID ? await getIdentity(legacyId) : null
		const query = { post_seq: postSeq }
		if(identity && identity.local_user_key)
			query.viewer_id = identity.local_user_key

		const response = await apiRequest('GET', '/legacy-read-compat/post', { deviceId: legacyId, query })
		const responsePost = firstValue(response, ['post', 'result'], null)
		const cachedPost = postCache.get(asString(postSeq))
		const post = responsePost ? Object.assign({}, cachedPost || {}, responsePost) : cachedPost
		return post ? normalizeDetailPost(post, identity) : normalizeDetailPost({}, identity)
	}

	async function getArticleReplies(legacyId, postSeq) {
		const identity = legacyId && legacyId !== GUEST_DEVICE_ID ? await getIdentity(legacyId) : null
		const query = { post_seq: postSeq, limit: 200 }
		if(identity && identity.local_user_key)
			query.viewer_id = identity.local_user_key
		const response = await apiRequest('GET', '/legacy-read-compat/comments', { deviceId: legacyId, query })
		return asArray(response && response.results).map(normalizeComment)
	}

	async function getArticleAuthorId(postSeq) {
		const response = await apiRequest('GET', '/legacy-read-compat/post', {
			deviceId: GUEST_DEVICE_ID,
			query: { post_seq: postSeq }
		})
		return asString(firstValue(firstValue(response, ['post', 'result'], {}), ['author_id'], ''))
	}

	function userPayload(identity, legacyId, overrides = {}) {
		return Object.assign({
			local_user_key: identity.local_user_key || legacyId,
			legacy_android_id: legacyId,
			nickname: identity.nickname || '롤백유저',
			motto: identity.motto,
			avatar_image_id: identity.avatar_image_id,
			fixed_image_id: identity.fixed_image_id
		}, overrides)
	}

	async function ensureModernIdentity(legacyId) {
		const identity = await getIdentity(legacyId)
		if(!identity || identity.local_user_key)
			return identity
		if(identityUpgradePromises.has(legacyId))
			return identityUpgradePromises.get(legacyId)

		const upgrade = (async () => {
			try {
				const response = await apiRequest('POST', '/users', {
					deviceId: legacyId,
					body: userPayload(identity, legacyId)
				})
				const responseUser = firstValue(response, ['user', 'result'], {})
				const upgraded = normalizeUser(Object.assign({}, identity, responseUser, {
					local_user_key: firstValue(responseUser, ['local_user_key', 'user_key'], legacyId)
				}), legacyId)
				identityCache.set(legacyId, { savedAt: Date.now(), value: upgraded })
				return upgraded
			}
			catch(error) {
				return identity
			}
			finally {
				identityUpgradePromises.delete(legacyId)
			}
		})()
		identityUpgradePromises.set(legacyId, upgrade)
		return upgrade
	}

	async function getUserInfo(legacyId) {
		return ensureModernIdentity(legacyId)
	}

	async function requireIdentity(legacyId) {
		const identity = await ensureModernIdentity(legacyId)
		if(!identity)
			throw new Error('LoLWiki legacy identity was not found')
		return identity
	}

	function authError(message, cause) {
		const error = new Error(message)
		error.code = 'LOLWIKI_AUTH_FAILED'
		if(cause && cause.statusCode)
			error.statusCode = cause.statusCode
		return error
	}

	async function authenticate(legacyId, accountId, password) {
		const identity = await requireIdentity(legacyId)
		const normalizedAccountId = asString(accountId).trim()
		const normalizedPassword = asString(password)
		const cachedAuth = authCache.get(legacyId)
		if(cachedAuth && cachedAuth.accessToken && (!normalizedAccountId || credentialAccountIds.get(legacyId) === normalizedAccountId))
			return identity

		if(!normalizedAccountId || !normalizedPassword)
			throw authError('LoLWiki account credentials are required')

		let response
		try {
			response = await apiRequest('POST', '/users/login', {
				deviceId: legacyId,
				body: { account_id: normalizedAccountId, password: normalizedPassword }
			})
		}
		catch(loginError) {
			if(!loginError || ![400, 401, 404].includes(loginError.statusCode))
				throw loginError

			try {
				response = await apiRequest('POST', '/users', {
					deviceId: legacyId,
					body: userPayload(identity, legacyId, {
						account_id: normalizedAccountId,
						password: normalizedPassword
					})
				})
			}
			catch(upsertError) {
				throw authError('LoLWiki account login or registration failed', upsertError)
			}
		}

		const responseUser = firstValue(response, ['user', 'result'], null)
		if(responseUser) {
			const authenticatedIdentity = normalizeUser(Object.assign({}, identity, responseUser), legacyId)
			identityCache.set(legacyId, { savedAt: Date.now(), value: authenticatedIdentity })
		}

		let auth = authCache.get(legacyId)
		if(!auth || !auth.accessToken) {
			try {
				response = await apiRequest('POST', '/users/login', {
					deviceId: legacyId,
					body: { account_id: normalizedAccountId, password: normalizedPassword }
				})
				const loginUser = firstValue(response, ['user', 'result'], null)
				if(loginUser) {
					const authenticatedIdentity = normalizeUser(Object.assign({}, identity, loginUser), legacyId)
					identityCache.set(legacyId, { savedAt: Date.now(), value: authenticatedIdentity })
				}
			}
			catch(loginError) {
				throw authError('LoLWiki account login failed', loginError)
			}
			auth = authCache.get(legacyId)
		}

		if(!auth || !auth.accessToken)
			throw authError('LoLWiki login did not return an access token')
		credentialAccountIds.set(legacyId, normalizedAccountId)
		blockCache.delete(legacyId)
		return identityCache.get(legacyId).value
	}

	function logout(legacyId) {
		authCache.delete(legacyId)
		credentialAccountIds.delete(legacyId)
		blockCache.delete(legacyId)
	}

	async function changeNickname(legacyId, nickname) {
		const identity = await requireIdentity(legacyId)
		try {
			await apiRequest('POST', '/users', {
				deviceId: legacyId,
				body: userPayload(identity, legacyId, { nickname })
			})
			identityCache.delete(legacyId)
			return true
		}
		catch(error) {
			if(error && (error.statusCode === 400 || error.statusCode === 409 || error.statusCode === 422))
				return false
			throw error
		}
	}

	async function registerBoardImage(uploaded, legacyId) {
		if(!uploaded)
			return
		await withWriteStage('LOLWIKI_IMAGE_PENDING_FAILED', () => apiRequest('POST', '/board/legacy-write/images/pending', {
			deviceId: legacyId,
			body: { image_id: uploaded.id, image_format: uploaded.format }
		}))
	}

	async function writeReply(postSeq, legacyId, body, image = '', accountId = '', password = '') {
		await authenticate(legacyId, accountId, password)
		const uploaded = image ? await uploadImage(image, legacyId, 'jpg') : null
		await registerBoardImage(uploaded, legacyId)
		return withWriteStage('LOLWIKI_COMMENT_WRITE_FAILED', () => apiRequest('POST', `/board/legacy-write/posts/${postSeq}/comments`, {
			deviceId: legacyId,
			body: {
				body,
				parent_id: 0,
				mention_user_id: '',
				image_id: uploaded ? uploaded.id : '',
				image_format: uploaded ? uploaded.format : '',
				request_id: requestId()
			}
		}))
	}

	async function votePost(postSeq, legacyId) {
		const response = await apiRequest('POST', `/board/legacy-write/posts/${postSeq}/vote`, {
			deviceId: legacyId,
			body: { action: 'up' }
		})
		return Boolean(response && response.status === 'OK' && firstValue(response, ['vote', 'vote_state', 'post_vote'], 'up') !== 'neutral')
	}

	async function deleteReply(legacyId, postSeq, replySeq) {
		return apiRequest('POST', `/board/legacy-write/posts/${postSeq}/comments/${replySeq}/delete`, {
			deviceId: legacyId,
			body: { request_id: requestId() }
		})
	}

	async function writePost(legacyId, subject, body, youtubeUrl, image = '', isGif = false, accountId = '', password = '') {
		await authenticate(legacyId, accountId, password)
		const uploaded = image ? await uploadImage(image, legacyId, isGif ? 'gif' : 'jpg') : null
		await registerBoardImage(uploaded, legacyId)
		return withWriteStage('LOLWIKI_POST_WRITE_FAILED', () => apiRequest('POST', '/board/legacy-write/posts', {
			deviceId: legacyId,
			body: {
				title: subject,
				body,
				image_id: uploaded ? uploaded.id : '',
				image_format: uploaded ? uploaded.format : '',
				youtube_url: youtubeUrl || '',
				notice: false,
				request_id: requestId()
			}
		}))
	}

	async function changeIcon(legacyId, image) {
		const identity = await requireIdentity(legacyId)
		const uploaded = await uploadImage(image, legacyId, 'jpg')
		await apiRequest('POST', '/users/images/pending', {
			deviceId: legacyId,
			body: { image_id: uploaded.id }
		})
		await apiRequest('POST', '/users', {
			deviceId: legacyId,
			body: userPayload(identity, legacyId, { avatar_image_id: uploaded.id, avatar_url: null })
		})
		identityCache.delete(legacyId)
	}

	async function deletePost(legacyId, postSeq) {
		return apiRequest('POST', `/board/legacy-write/posts/${postSeq}/delete`, {
			deviceId: legacyId,
			body: { request_id: requestId() }
		})
	}

	return {
		getNewMemo,
		getArticleList,
		getArticleDetail,
		getArticleReplies,
		getArticleAuthorId,
		getUserInfo,
		changeNickname,
		writeReply,
		votePost,
		deleteReply,
		writePost,
		changeIcon,
		deletePost,
		getIdentity,
		authenticate,
		logout,
		uploadImage
	}
}

module.exports = {
	createLolWikiClient,
	normalizeListPost,
	normalizeDetailPost,
	normalizeComment,
	normalizeUser,
	requestId,
	constants: {
		API_BASE_URL,
		IMAGE_UPLOAD_URL,
		APP_VERSION,
		APP_BUILD,
		GUEST_DEVICE_ID
	}
}

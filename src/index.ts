import { HmacSHA1, enc } from 'crypto-js'
import OAuth, { Options } from 'oauth-1.0a'

export default {
	async fetch(): Promise<Response> {
		return new Response(`© ${new Date().getFullYear()} Luki120`)
	},
	async scheduled(event: Event, env: Env, ctx: ExecutionContext): Promise<void> {
		const bot = new LDRLyricsBot(env)
		try {
			// Validate environment variables before proceeding
			bot.validateEnvironment()
			ctx.waitUntil(bot.tweetRandomLDRLyrics())
		}
		catch (error) {
			console.error("❌ Error when scheduling cron job:", error)
		}
	}
}

interface LyricsResponse {
	plainLyrics: string
}

interface TwitterErrorResponse {
	errors?: Array<{
		code: number
		message: string
		parameter?: string
	}>
	title?: string
	detail?: string
	type?: string
}

interface RetryConfig {
	maxAttempts: number
	baseDelayMs: number
	maxDelayMs: number
}

class LDRLyricsBot {
	private oAuth: OAuth
	private oAuthConfig: Options
	private tokenConfig: { key: string, secret: string }
	private debugMode: boolean
	private retryConfig: RetryConfig = {
		maxAttempts: 3,
		baseDelayMs: 1000,
		maxDelayMs: 30000
	}
	private ldrSongs: string[] = [
		// Born to Die + Paradise (2012)
		"Born To Die", "Off To The Races", "Blue Jeans", "Video Games", "Diet Mountain Dew", "National Anthem", "Dark Paradise", "Radio", "Carmen", "Million Dollar Man", "Summertime Sadness", "This Is What Makes Us Girls", "Without You", "Lolita", "Lucky Ones",
		"Ride", "American", "Cola", "Body Electric", "Blue Velvet", "Gods & Monsters", "Yayo", "Bel Air", "Burning Desire",
		// Ultraviolence (2014)
		"Cruel World", "Ultraviolence", "Shades Of Cool", "Brooklyn Baby", "West Coast", "Sad Girl", "Pretty When You Cry", "Money Power Glory", "Fucked My Way Up To The Top", "Old Money", "The Other Woman", "Black Beauty", "Guns And Roses", "Florida Kilos",
		// Honeymoon (2015)
		"Honeymoon", "Music To Watch Boys To", "Terrence Loves You", "God Knows I Tried", "High By The Beach", "Freak", "Art Deco", "Burnt Norton - Interlude", "Religion", "Salvatore", "The Blackest Day", "24", "Swan Song", "Don't Let Me Be Misunderstood",
		// Lust For Life (2017)
		"Love", "Lust For Life (with The Weeknd)", "13 Beaches", "Cherry", "White Mustang", "Summer Bummer", "Groupie Love", "In My Feelings", "Coachella - Woodstock In My Mind", "God Bless America - And All The Beautiful Women In It", "When The World Was At War We Kept Dancing", "Beautiful People Beautiful Problems", "Tomorrow Never Came", "Heroin", "Change", "Get Free",
		// Norman Fucking Rockwell (2019)
		"Norman fucking Rockwell", "Mariners Apartment Complex", "Venice Bitch", "Fuck it I love you", "Doin' Time", "Love song", "Cinnamon Girl", "How to disappear", "California", "The Next Best American Record", "The greatest", "Bartender", "Happiness is a butterfly", "hope is a dangerous thing for a woman like me to have - but I have it",
		// Chemtrails Over The Country Club (2021)
		"White Dress", "Chemtrails Over The Country Club", "Tulsa Jesus Freak", "Let Me Love You Like A Woman", "Wild At Heart", "Dark But Just A Game", "Not All Who Wander Are Lost", "Yosemite", "Breaking Up Slowly", "Dance Till We Die", "For Free",
		// Blue Banisters (2021)
		"Text Book", "Blue Banisters", "Arcadia", "Black Bathing Suit", "If You Lie Down With Me", "Beautiful", "Violets for Roses", "Dealer", "Thunder", "Wildflower Wildfire", "Nectar Of The Gods", "Living Legend", "Cherry Blossom", "Sweet Carolina",
		// Did you know that there's a tunnel under Ocean Blvd (2023)
		"The Grants", "Did you know that there's a tunnel under Ocean Blvd", "Sweet", "A&W", "Candy Necklace", "Kintsugi", "Fingertips", "Paris, Texas", "Grandfather please stand on the shoulders of my father while he's deep-sea fishing", "Let The Light In", "Margaret", "Fishtail", "Peppers", "Taco Truck x VB",
		// Singles
		"Tough", "Take Me Home, Country Roads", "Blue Skies", "Lost At Sea", "Say Yes To Heaven", "Buddy's Rendezvous", "Watercolor Eyes", "Summertime The Gershwin Version", "Season Of The Witch",
		// Unreleased
		"Flipside", "Is This Happiness", "Jealous Girl", "Kill Kill", "Meet Me In The Pale Moonlight", "Queen Of Disaster", "Serial Killer", "Trash Magic"
	]
	private reqAuth = {
		url: "https://api.twitter.com/2/tweets",
		method: 'POST'
	}

	constructor(env: Env) {
		this.debugMode = env.DEBUG_MODE === 'true'
		
		this.oAuthConfig = {
			consumer: {
				key: env.TWITTER_API_KEY,
				secret: env.TWITTER_API_SECRET
			},
			signature_method: 'HMAC-SHA1',
			hash_function: this.hashSHA1
		}
		this.tokenConfig = {
			key: env.TWITTER_ACCESS_TOKEN,
			secret: env.TWITTER_ACCESS_TOKEN_SECRET
		}

		this.oAuth = new OAuth(this.oAuthConfig)
	}

	public validateEnvironment(): void {
		const requiredVars = [
			'TWITTER_API_KEY',
			'TWITTER_API_SECRET', 
			'TWITTER_ACCESS_TOKEN',
			'TWITTER_ACCESS_TOKEN_SECRET'
		]

		const missing = requiredVars.filter(varName => {
			const value = this.getEnvValue(varName)
			return !value || value.trim() === ''
		})

		if (missing.length > 0) {
			throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`)
		}

		console.log('✅ Environment variables validated successfully')
		if (this.debugMode) {
			console.log('🐛 Debug mode enabled')
		}
	}

	private getEnvValue(varName: string): string {
		switch (varName) {
			case 'TWITTER_API_KEY': return this.oAuthConfig.consumer.key
			case 'TWITTER_API_SECRET': return this.oAuthConfig.consumer.secret
			case 'TWITTER_ACCESS_TOKEN': return this.tokenConfig.key
			case 'TWITTER_ACCESS_TOKEN_SECRET': return this.tokenConfig.secret
			default: return ''
		}
	}

	private hashSHA1(baseString: string, key: string): string {
		if (this.debugMode) {
			console.log('🔐 OAuth Base String (for debugging):', baseString)
		}
		return HmacSHA1(baseString, key).toString(enc.Base64)
	}

	private maskSecretValue(value: string): string {
		if (!value || value.length < 8) return '[REDACTED]'
		return value.substring(0, 4) + '***' + value.substring(value.length - 4)
	}

	private logOAuthHeaders(headers: Record<string, string>): void {
		if (!this.debugMode) return

		const safeHeaders = { ...headers }
		
		// Mask sensitive OAuth values in authorization header
		if (safeHeaders.Authorization) {
			safeHeaders.Authorization = safeHeaders.Authorization
				.replace(/oauth_consumer_key="[^"]*"/, `oauth_consumer_key="${this.maskSecretValue(this.oAuthConfig.consumer.key)}"`)
				.replace(/oauth_token="[^"]*"/, `oauth_token="${this.maskSecretValue(this.tokenConfig.key)}"`)
				.replace(/oauth_signature="[^"]*"/, 'oauth_signature="[REDACTED]"')
		}

		console.log('🔐 OAuth Headers:', safeHeaders)
	}

	private async delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}

	private calculateBackoffDelay(attempt: number): number {
		const delay = Math.min(
			this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
			this.retryConfig.maxDelayMs
		)
		// Add jitter to prevent thundering herd
		return delay + Math.random() * 1000
	}

	private async handleTwitterError(response: Response, responseText: string): Promise<void> {
		const status = response.status
		let errorDetails = ''
		
		try {
			const errorData = JSON.parse(responseText) as TwitterErrorResponse
			if (errorData.errors && errorData.errors.length > 0) {
				errorDetails = errorData.errors.map(err => 
					`Code ${err.code}: ${err.message}${err.parameter ? ` (parameter: ${err.parameter})` : ''}`
				).join('; ')
			} else if (errorData.detail) {
				errorDetails = errorData.detail
			} else if (errorData.title) {
				errorDetails = errorData.title
			}
		} catch {
			errorDetails = responseText || response.statusText
		}

		// Log detailed error information
		console.error(`❌ Twitter API Error [${status}]:`, errorDetails)
		
		// Convert headers to plain object for logging
		const headersObj: Record<string, string> = {}
		response.headers.forEach((value, key) => {
			headersObj[key] = value
		})
		console.error('📊 Response Headers:', headersObj)
		
		if (this.debugMode) {
			console.error('🐛 Full Response Body:', responseText)
		}

		// Handle specific error codes
		switch (status) {
			case 401:
				console.error('🔐 Authentication failed - check OAuth credentials and signatures')
				break
			case 403:
				console.error('🚫 Authorization failed - check API permissions and rate limits')
				break
			case 429:
				const rateLimitReset = response.headers.get('x-rate-limit-reset')
				if (rateLimitReset) {
					const resetTime = new Date(parseInt(rateLimitReset) * 1000)
					console.error(`⏰ Rate limit exceeded. Reset at: ${resetTime.toISOString()}`)
				}
				break
			case 500:
			case 502:
			case 503:
			case 504:
				console.error('🔧 Twitter server error - retrying may help')
				break
		}
	}

	private isRetryableError(status: number): boolean {
		// Retry on server errors and rate limits
		return status === 429 || (status >= 500 && status <= 599)
	}

	private async makeTwitterRequest(lyrics: string, attempt: number = 1): Promise<Response> {
		const requestData = {
			url: this.reqAuth.url,
			method: this.reqAuth.method,
			data: {}
		}

		// Generate OAuth authorization
		const authHeader = this.oAuth.toHeader(this.oAuth.authorize(requestData, this.tokenConfig))
		
		const headers = {
			...authHeader,
			'Content-Type': 'application/json',
			'User-Agent': 'LDRLyricsBot/1.0 (Cloudflare Worker)'
		}

		if (this.debugMode) {
			console.log(`🚀 Attempt ${attempt}: Making request to Twitter API`)
			this.logOAuthHeaders(headers)
		}

		const requestBody = JSON.stringify({ "text": lyrics })
		
		if (this.debugMode) {
			console.log('📝 Request Body:', requestBody)
		}

		const response = await fetch(this.reqAuth.url, {
			method: this.reqAuth.method,
			headers,
			body: requestBody
		})

		const responseText = await response.text()

		if (!response.ok) {
			await this.handleTwitterError(response, responseText)
			
			if (attempt < this.retryConfig.maxAttempts && this.isRetryableError(response.status)) {
				const delayMs = this.calculateBackoffDelay(attempt)
				console.log(`⏳ Retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.retryConfig.maxAttempts})`)
				await this.delay(delayMs)
				return this.makeTwitterRequest(lyrics, attempt + 1)
			}
			
			throw new Error(`Twitter API request failed with status ${response.status}: ${responseText}`)
		}

		console.log('✅ Tweet posted successfully')
		if (this.debugMode) {
			console.log('📊 Success Response:', responseText)
		}

		return new Response(responseText, {
			status: response.status,
			headers: { 'Content-Type': 'application/json' }
		})
	}

	private async getRandomLDRLyrics(): Promise<string | undefined> {
		const randomSong = this.ldrSongs[Math.floor(Math.random() * this.ldrSongs.length)]
		const uri = `https://lrclib.net/api/get?artist_name=Lana+Del+Rey&track_name=${encodeURIComponent(randomSong)}`

		console.log(`🎵 Fetching lyrics for: ${randomSong}`)

		try {
			const response = await fetch(uri)

			if (!response.ok) {
				console.error('❌ Failed to fetch lyrics:', response.status, response.statusText)
				return undefined
			}

			const data = await response.json() as LyricsResponse

			if (!data.plainLyrics) {
				console.error(`❌ Lyrics for song "${randomSong}" are null`)
				return undefined
			}

			const lyrics = data.plainLyrics.split('\n\n')
			const randomVerse = lyrics[Math.floor(Math.random() * lyrics.length)]
			const verseLines = randomVerse.split('\n')

			if (verseLines.length < 2) {
				console.error(`❌ Verse "${verseLines}" for song "${randomSong}" has less than 2 lines, retrying...`)
				return await this.getRandomLDRLyrics()
			}
			
			const selectedLyrics = verseLines.slice(0, 4).join('\n')
			console.log(`✨ Selected lyrics from "${randomSong}": ${selectedLyrics.split('\n')[0]}...`)
			
			return selectedLyrics
		}
		catch (error) {
			console.error('❌ Error fetching lyrics:', error)
			return undefined
		}
	}

	public async tweetRandomLDRLyrics(): Promise<Response> {
		try {
			console.log('🤖 Starting LDR Lyrics Bot tweet process...')
			
			const lyrics = await this.getRandomLDRLyrics()
			if (!lyrics) {
				const errorMsg = '❌ Failed to fetch lyrics'
				console.error(errorMsg)
				return new Response(errorMsg, { status: 500 })
			}

			return await this.makeTwitterRequest(lyrics)
		}
		catch (error) {
			console.error('❌ Bot execution failed:', error)
			return new Response(`❌ Bot execution failed: ${error}`, { status: 500 })
		}
	}
}

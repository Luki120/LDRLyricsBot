import { HmacSHA1, enc } from 'crypto-js'
import OAuth, { Options } from 'oauth-1.0a'

export default {
	async fetch(): Promise<Response> {
		return new Response(`© ${new Date().getFullYear()} Luki120`)
	},
	async scheduled(event: Event, env: Env, ctx: ExecutionContext): Promise<void> {
		const bot = new LDRLyricsBot(env)
		try {
			ctx.waitUntil(bot.tweetRandomLDRLyrics())
		}
		catch (error) {
			console.error('❌ Error when scheduling cron job: ', error)
		}
	}
}

interface LyricsResponse {
	plainLyrics: string
}

class LDRLyricsBot {
	private oAuth: OAuth
	private oAuthConfig: Options
	private tokenConfig: { key: string, secret: string }
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
		"Flipside", "Is This Happiness", "Jealous Girl", "Kill Kill", "Meet Me In The Pale Moonlight", "Queen Of Disaster", "Serial Killer", "Trash Magic",
		// LDR10
		"Henry, come on", "Bluebird"
	]
	private reqAuth = {
		url: "https://api.twitter.com/2/tweets",
		method: 'POST'
	}

	constructor(env: Env) {
		this.oAuthConfig = {
			consumer: {
				key: env.TWITTER_API_KEY,
				secret: env.TWITTER_API_SECRET
			},
			signature_method: 'HMAC-SHA1',
			hash_function(baseString: string, key: string) {
				return HmacSHA1(baseString, key).toString(enc.Base64)
			}
		}
		this.tokenConfig = {
			key: env.TWITTER_ACCESS_TOKEN,
			secret: env.TWITTER_ACCESS_TOKEN_SECRET
		}

		this.oAuth = new OAuth(this.oAuthConfig)
	}

	private async getRandomLDRLyrics(): Promise<string> {
		const randomSong = this.ldrSongs[Math.floor(Math.random() * this.ldrSongs.length)]
		const uri = `https://lrclib.net/api/get?artist_name=Lana+Del+Rey&track_name=${encodeURIComponent(randomSong)}`

		try {
			const response = await fetch(uri)

			if (!response.ok) {
				const errorText = await response.text()

				console.error('❌ Failed to fetch lyrics:', errorText)
				return
			}

			const data = await response.json() as LyricsResponse

			if (!data.plainLyrics) {
				console.error(`❌ Lyrics for song ${randomSong} are null`)
				return
			}

			const lyrics = data.plainLyrics.split('\n\n')
			const randomVerse = lyrics[Math.floor(Math.random() * lyrics.length)]
			const verseLines = randomVerse.split('\n')

			if (verseLines.length < 2) {
				console.error(`❌ Verse "${verseLines}" for song ${randomSong} has less than 2 lines, retrying...`)
				return await this.getRandomLDRLyrics()
			}
			return verseLines.slice(0, 4).join('\n')
		}
		catch (error) {
			console.error('❌ Something went wrong:', error)
			return
		}
	}

	public async tweetRandomLDRLyrics(): Promise<Response> {
		try {
			const authHeader = this.oAuth.toHeader(this.oAuth.authorize(this.reqAuth, this.tokenConfig))
			const response = await fetch(this.reqAuth.url, {
				method: this.reqAuth.method,
				headers: {
					'Content-Type': 'application/json',
					'Authorization': authHeader.Authorization
				},
				body: JSON.stringify({ text: await this.getRandomLDRLyrics() })
			})

			if (!response.ok) {
				const errorText = await response.text()

				console.error(`❌ Error when trying to post tweet: ${errorText}`)
				console.error('❌ Error when trying to post tweet:', response.status, response.statusText)

				return new Response(`❌ Error when trying to post tweet: ${errorText}`)
			}
			return new Response('✅ Success!')
		}
		catch (error) {
			console.error('❌ Something went wrong:', error)
			return new Response('❌ Something went wrong:', { status: 500 })
		}
	}
}

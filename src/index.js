import { HmacSHA1, enc } from 'crypto-js'
import OAuth from 'oauth-1.0a'

export default {
	async fetch() {
		return new Response(`© ${new Date().getFullYear()} Luki120`)
	},
	async scheduled(event, env, ctx) {
		try {
			ctx.waitUntil(tweetRandomLDRLyrics(env))
		}
		catch (error) {
			console.error("Error when scheduling cron job: ", error)
		}
	}
}

const reqAuth = {
	url: "https://api.twitter.com/2/tweets",
	method: 'POST'
}

const ldrSongs = [
	// Born to Die + Paradise (2012)
	"Born To Die", "Off to the Races", "Blue Jeans", "Video Games", "Diet Mountain Dew", "National Anthem", "Dark Paradise", "Radio", "Carmen", "Million Dollar Man", "Summertime Sadness", "This Is What Makes Us Girls", "Without You", "Lolita", "Lucky Ones",
	"Ride", "American", "Cola", "Body Electric", "Blue Velvet", "Gods & Monsters", "Yayo", "Bel Air", "Burning Desire",
	// Ultraviolence (2014)
	"Cruel World", "Ultraviolence", "Shades of Cool", "Brooklyn Baby", "West Coast", "Sad Girl", "Pretty When You Cry", "Money Power Glory", "Fucked My Way Up to the Top", "Old Money", "The Other Woman", "Black Beauty", "Guns And Roses", "Florida Kilos",
	// Honeymoon (2015)
	"Honeymoon", "Music to Watch Boys To", "Terrence Loves You", "God Knows I Tried", "High By The Beach", "Freak", "Art Deco", "Burnt Norton - Interlude", "Religion", "Salvatore", "The Blackest Day", "24", "Swan Song", "Don't Let Me Be Misunderstood",
	// Lust for Life (2017)
	"Love", "Lust for Life", "13 Beaches", "Cherry", "White Mustang", "Summer Bummer", "Groupie Love", "In My Feelings", "Coachella - Woodstock In My Mind", "God Bless America - And All The Beautiful Women In It", "When The World Was At War We Kept Dancing", "Beautiful People Beautiful Problems", "Tomorrow Never Came", "Heroin", "Change", "Get Free",
	// Norman Fucking Rockwell (2019)
	"Norman fucking Rockwell", "Mariners Apartment Complex", "Venice Bitch", "Fuck it I Love you", "Doin' Time", "Love Song", "Cinnamon Girl", "How to disappear", "California", "The Next Best American Record", "The greatest", "Bartender", "Happiness is a butterfly", "hope is a dangerous thing for a woman like me to have - but I have it",
	// Chemtrails over the Country Club (2021)
	"White Dress", "Chemtrails Over the Country Club", "Tulsa Jesus Freak", "Let Me Love You Like A Woman", "Wild At Heart", "Dark But Just A Game", "Not All Who Wander Are Lost", "Yosemite", "Breaking Up Slowly", "Dance Till We Die", "For Free",
	// Blue Banisters (2021)
	"Text Book", "Blue Banisters", "Arcadia", "Interlude - The Trio", "Black Bathing Suit", "If You Lie Down With Me", "Beautiful", "Violets for Roses", "Dealer", "Thunder", "Wildflower Wildfire", "Nectar Of The Gods", "Living Legend", "Cherry Blossom", "Sweet Carolina",
	// Did you know that there's a tunnel under Ocean Blvd (2023)
	"The Grants", "Did you know that there's a tunnel under Ocean Blvd", "Sweet", "A&W", "Candy Necklace", "Kintsugi", "Fingertips", "Paris, Texas", "Grandfather please stand on the shoulders of my father while he's deep-sea fishing", "Let The Light In", "Margaret", "Fishtail", "Peppers", "Taco Truck x VB"
]

async function getRandomLDRLyrics() {
	const randomSong = ldrSongs[Math.floor(Math.random() * ldrSongs.length)]
	const uri = `https://lrclib.net/api/get?artist_name=Lana+Del+Rey&track_name=${encodeURIComponent(randomSong)}`

	try {
		const response = await fetch(uri)

		if (response.ok) {
			const data = await response.json()
			const plainLyrics = data.plainLyrics

			const lyrics = plainLyrics.split('\n\n')
			console.log('Lyrics: \n', lyrics)

			const randomVerse = lyrics[Math.floor(Math.random() * lyrics.length)]
			const verseLines = randomVerse.split('\n')
			const randomVerseLimited = verseLines.slice(0, Math.min(4, verseLines.length)).join('\n')

			console.log('Random verse: \n', randomVerseLimited)
			return randomVerseLimited
		}

		else {
			console.error('Failed to fetch lyrics:', response.status)
			return
		}
	}
	catch (error) {
		console.error('Error:', error)
		return
	}
}

async function tweetRandomLDRLyrics(env) {
	const oAuthConfig = {
		consumer: {
			key: env.TWITTER_API_KEY,
			secret: env.TWITTER_API_SECRET
		},
		signature_method: 'HMAC-SHA1',
		hash_function: hashSHA1
	}
	const tokenConfig = {
		key: env.TWITTER_ACCESS_TOKEN,
		secret: env.TWITTER_ACCESS_TOKEN_SECRET
	}

	const oAuth = new OAuth(oAuthConfig)
	const reqBody = JSON.stringify({ "text": await getRandomLDRLyrics() })

	try {
		const response = await fetch(reqAuth.url, {
			method: reqAuth.method,
			headers: {
				...oAuth.toHeader(oAuth.authorize(reqAuth, tokenConfig)),
				'Content-Type': 'application/json'
			},
			body: reqBody
		})

		if (!response.ok) {
			console.log('Error when trying to post tweet:', response.statusText)
			return new Response('Error when trying to post tweet:', { status: response.status })
		}
		return new Response(await response.json())
	}
	catch (error) {
		console.error('Something went wrong:', error)
		return new Response('Something went wrong:', { status: 500 })
	}
}

function hashSHA1(baseString, key) {
	return HmacSHA1(baseString, key).toString(enc.Base64)
}

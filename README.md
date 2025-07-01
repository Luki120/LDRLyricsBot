# LDRLyricsBot

* Twitter bot that posts random Lana Del Rey lyrics every two hours, deployed to Cloudflare Workers.

## Features

### Core Functionality
* Automatically posts random Lana Del Rey lyrics every 2 hours via cron job
* Fetches lyrics from lrclib.net API for 100+ songs across all eras (Born to Die through Ocean Blvd)
* Selects random verses (up to 4 lines) from the chosen songs

### Enhanced Authentication & Error Handling (v1.0)
* **Environment Variable Validation**: Startup validation ensures all required Twitter API credentials are present
* **Comprehensive Error Handling**: Detailed logging of response status, headers, and body for debugging
* **OAuth Signature Debugging**: Logs OAuth base string and headers (with secrets masked) in debug mode
* **Twitter API Error Handling**: Specific handling for common error codes:
  - `401`: Authentication failures with credential guidance
  - `403`: Authorization issues and permission checks
  - `429`: Rate limit exceeded with reset time logging
  - `5xx`: Server errors with retry recommendations
* **Rate Limiting & Retry Logic**: 
  - Exponential backoff for rate limit errors (429) and server errors (5xx)
  - Up to 3 retry attempts with jitter to prevent thundering herd
  - Smart retry logic only for transient failures
* **Twitter API v2 Compliance**:
  - Proper User-Agent header: `LDRLyricsBot/1.0 (Cloudflare Worker)`
  - Correct content-type headers for JSON requests
  - Validated request format matching API v2 requirements exactly

### Security & Debugging
* **Debug Mode**: Enable detailed logging via `DEBUG_MODE=true` environment variable
* **Secret Masking**: All sensitive credentials are masked in logs (shows first/last 4 chars only)
* **OAuth Security**: Base strings logged for debugging without exposing signature secrets

## Environment Variables

Required environment variables for Twitter API authentication:

```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret
```

Optional environment variables:

```
DEBUG_MODE=true  # Enable detailed debug logging
```

## Deployment

This bot is designed to run on Cloudflare Workers with the following configuration:

1. Install dependencies: `npm install`
2. Set up environment variables in Cloudflare Workers dashboard
3. Deploy: `npm run deploy`

The cron job is configured to run every 2 hours (`0 */2 * * *`).

## Development

* **Type checking**: `npm run type-check`
* **Local development**: `npm run dev`
* **Generate types**: `npm run generate-types`

## Socials

* [Twitter](https://twitter.com/Lukii120)

## Contributing

* Contributions are more than welcomed, but should follow this etiquette:

	* If you're a contributor with write access to this repository, you **should NOT** push to main branch, preferably push to a new one and *then* create the PR.
	* Keep commit titles short and then explain them in comments or preferably in the commit's description.
	* Push small commits (e.g if you changed 2 directories, commit one directory, then commit the other one and only THEN push)

## LICENSE

* [Mozilla Public License 2.0](https://www.mozilla.org/en-US/MPL/2.0/)

## Assets LICENSE

* Under no means shall the visual assets of this repository – i.e., all photo-, picto-, icono-, and videographic material – (if any) be altered and/or redistributed for any independent commercial or non-commercial intent beyond its original function in this project. Permissible usage of such content is restricted solely to its express application in this repository and any forks that retain the material in its original, unaltered form only.

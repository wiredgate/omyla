# RAPP live rap integration

The app keeps the existing four generated rap clips until the server has a music API credential. No browser speech is used.

To activate: add a Cloudflare Worker **secret** named `GEMINI_API_KEY` to the **rapp** Worker using Workers & Pages > rapp > Settings > Variables and Secrets. Use a Gemini API project with Lyria access. Never put the key in the HTML, Git repository, or chat. The server's `/api/capabilities` reports whether the secret and required bindings exist; this is configuration detection, not a verified provider health check.

When configured, users can select “即興生成”. Each turn sends the recognized text and previous reply to Workers AI, writes a four-line Japanese answer, then sends the lyrics to the Gemini music endpoint. Playback begins only after the audio is returned. The voice is generated for each turn and is not guaranteed identical to the current prerecorded voice. Lyrics/rhyme quality and alignment require live listening tests. Current fixed clips remain a selectable option.

The global durable budget permits at most 20 generation attempts per UTC day and one concurrent generation. Failed attempts count too, so errors cannot create unlimited costs. No automatic provider retries. Provider requests time out; resetting the game cancels the browser request and ignores late results, but an already-started provider request may still incur a charge. Generation latency is not instant.

Mock tests cover provider configuration, input validation, lyric validation, audio response parsing, origin checks, and budget limit/release. Real provider generation remains unverified until the credential is connected. References: https://ai.google.dev/gemini-api/docs/music-generation and https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/

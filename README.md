# Two Sides

An information-gap listening and speaking activity for Novice High English. In each round, two people tell the same incident from their own points of view. Learners listen to both accounts, ask up to three questions total, and use a detail from each person to tell what they think happened. **Change story** starts a new round and clears the notes and question count.

The incidents draw on Tennessee Language Center French Beginner 1 topics: introductions, names and languages, course registration and contact details, and basic event information. The learner interface and witness conversations are in English. Each witness has a short opening, extra details, and limits on what they saw. Edit the stories in [public/stories.js](public/stories.js).

## Run locally

1. Use Node.js 22 or newer and run `npm start`.
2. Open [http://localhost:3000](http://localhost:3000). Demo mode uses scripted sample questions, text, and your browser's speech synthesis when available.
3. To enable live voice, create a local `.env` file with `OPENAI_API_KEY=your_key_here`, then restart the server. Use an OpenAI API project with access to `gpt-realtime-2.1`. Allow microphone access when prompted. Choose **Start question**, speak, and choose **Send question**.

## Deploy to Netlify

1. In Netlify, import an existing project from GitHub and select `cbbarnet79/infogap` and the `main` branch.
2. Keep the repository root as the base directory and leave the build command blank. The repository configuration sets `public` as the publish directory and `netlify/functions` as the functions directory.
3. To use live voice, add `OPENAI_API_KEY` in the site's environment variables, available to Functions, and deploy or redeploy. Keep the key out of GitHub and browser code. A deployment without the variable runs in demo mode.
4. Open the Netlify HTTPS URL and try one question with each witness.

The Netlify Function exchanges the browser's WebRTC offer for an OpenAI Realtime answer. Audio then travels between the browser and OpenAI. The three-question limit is an activity rule enforced by the page. If the live deployment is public, anyone who can reach it can start a billable API session. Use site access controls for a classroom-only pilot.

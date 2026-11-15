Add computer opponent with Easy/Medium/Hard difficulty

- Server-side bot strategy (botShouldHold) and POST /api/games/:id/bot
- Bot turn returned as steps and replayed in the UI with dice animation
- Setup screen: mode switch, difficulty picker, bot opponent card
- Bot turn resumes after a page refresh; humans cannot roll or hold for the bot
- Unit tests per difficulty and API tests for the vs-computer flow


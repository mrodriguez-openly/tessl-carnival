# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack as many as you can before the
clock runs out.

## How to play

- Click a mole while it's up to whack it.
- Each mole stays up for a moment, then drops back down.
- Moles pop up more often, and stay up for less time, as the round goes on:
  one every 1 second at the start down to one every 0.4 seconds at the end,
  staying up for 1.2 seconds at the start down to 0.6 seconds at the end.
- The round lasts 30 seconds. Click again on the game over screen to play
  another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `spawnInterval`,
  `upTime`, `timeLeft`) and the `whackAMole` entry, the default export the
  midway finds.
- `game.test.ts`: tests for the game logic.

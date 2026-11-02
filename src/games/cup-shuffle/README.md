# Cup Shuffle

Keep your eye on the quarter while three cups shuffle, then pick the cup it is
under. The game uses carnival points only: no real money or wagering.

## How to play

- Each guess starts with the three cups lifted, showing the quarter under one of them.
- The cups come down and shuffle: two cups trade places, six times over.
- When the shuffle stops, click the cup you think hides the quarter.
- The cups lift to show your pick and where the quarter was.
- A round is 5 guesses. Click again on the round over screen to play another round.

## Scoring

| Guess   | Points |
| ------- | ------ |
| Correct | 2      |
| Wrong   | 0      |

The best possible round scores 10. Your total is saved to the carnival's score
board once, after the fifth guess has been revealed.

## Files

- `game.ts`: the game logic (`createState`, `startGuess`, `planSwaps`,
  `applySwap`, `step`, `guess`, `cupAt`) and the `cupShuffle` entry, the default
  export the midway finds.
- `game.test.ts`: tests for the game logic.

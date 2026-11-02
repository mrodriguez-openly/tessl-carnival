# Hook a Duck

Rubber ducks float round a stream in a loop. Hook one as it passes.

## How to play

- Move the mouse to aim. The red circle shows where the hook will drop.
- Click to lower the hook. It takes half a second to reach the water, so aim
  where a duck is going to be, not where it is.
- Only one hook is down at a time: wait for it to come back before casting again.
- You have 6 casts. The round ends when you are out of casts and the last hook
  has landed.
- Click again on the game over screen to play another round.

## Scoring

Each duck has a number on its base, and hooking it scores that number. The
hook catches a duck when it lands within 20 px of the duck's centre; if two
ducks are in reach, it catches the closer one. A hook that catches nothing
scores nothing.

The stream has ten ducks:

| Ducks | Points |
| ----- | ------ |
| 5     | 5      |
| 3     | 10     |
| 1     | 20     |
| 1     | 50     |

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `cast`, `step`, `duckAt`,
  `duckPosition`) and the `hookADuck` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.

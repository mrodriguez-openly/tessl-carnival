# Ring Toss

Land rings over the necks of the bottles at the back of the booth.

## How to play

- Move the mouse to aim. The red cross shows where the ring will land.
- Your hand sways from side to side, so the cross drifts: time your throw.
- Click to throw a ring. It lands where the cross was when you clicked.
- You have 8 rings. The round ends when you are out of rings and the last ring has landed.
- Click again on the game over screen to play another round.

## Scoring

A ring scores when it lands within 14 px of the centre of a bottle's neck.
Bottles further back score more:

| Row    | Points |
| ------ | ------ |
| Back   | 30     |
| Middle | 20     |
| Front  | 10     |

A bottle can take more than one ring, and each one scores. A ring that lands
anywhere else scores nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `throwRing`, `step`, `bottleAt`,
  `swayAt`) and the `ringToss` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.

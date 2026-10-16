const assert = require('assert');
const {
  BOARD_SIZE,
  createBoard,
  createTile,
  createStraightTile,
  createCornerTile,
  rotateTile,
  createPiece,
  rotatePiece,
  canPlace,
  placePiece,
  checkClears,
  isGameOver
} = require('./logic');

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    passedTests++;
    console.log(`✓ Test ${passedTests}: ${name}`);
  } catch (err) {
    console.error(`✗ Test FAILED: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Four corners forming a 2x2 ring clear: the board ends up empty and the score goes up by 40.
runTest('Four corners forming a 2x2 ring clear: the board ends up empty and score goes up by 40', () => {
  const board = createBoard(6);
  // (0,0) connects E and S
  board[0][0] = createCornerTile('ES');
  // (0,1) connects W and S
  board[0][1] = createCornerTile('SW');
  // (1,1) connects W and N
  board[1][1] = createCornerTile('WN');
  // (1,0) connects E and N
  board[1][0] = createCornerTile('NE');

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 1, 'Expected exactly 1 loop cleared');
  assert.strictEqual(result.clearedTiles, 4, 'Expected 4 tiles cleared');
  assert.strictEqual(result.points, 40, 'Expected 40 points (4 tiles * 10)');

  // Assert board ends up empty
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      assert.strictEqual(board[r][c], null, `Expected board[${r}][${c}] to be empty`);
    }
  }
});

// 2. Three corners of that ring with the 4th cell empty: nothing clears.
runTest('Three corners of that ring with the 4th cell empty: nothing clears', () => {
  const board = createBoard(6);
  board[0][0] = createCornerTile('ES');
  board[0][1] = createCornerTile('SW');
  board[1][0] = createCornerTile('NE');
  // (1,1) is left empty

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 0, 'Expected 0 loops cleared');
  assert.strictEqual(result.clearedTiles, 0, 'Expected 0 tiles cleared');
  assert.strictEqual(result.points, 0, 'Expected 0 points');
  assert.notStrictEqual(board[0][0], null, 'board[0][0] should remain');
  assert.notStrictEqual(board[0][1], null, 'board[0][1] should remain');
  assert.notStrictEqual(board[1][0], null, 'board[1][0] should remain');
  assert.strictEqual(board[1][1], null, 'board[1][1] should remain empty');
});

// 3. A 2x2 ring plus one extra tile connected to it that has an open end: nothing clears.
runTest('A 2x2 ring plus one extra tile connected to it that has an open end: nothing clears', () => {
  const board = createBoard(6);
  // Ring at (0,0), (0,1), (1,1), (1,0)
  board[0][0] = createCornerTile('ES');
  board[0][1] = createCornerTile('SW');
  board[1][1] = createCornerTile('WN');
  // (1,0) has 3 openings: connects to E, N, and S
  board[1][0] = createTile('junction', ['E', 'N', 'S']);
  // Extra tile at (2,0) connected to (1,0) pointing N and S (pointing S into empty (3,0))
  board[2][0] = createStraightTile('NS');

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 0, 'Expected 0 loops cleared because component has an open end');
  assert.strictEqual(result.clearedTiles, 0, 'Expected 0 tiles cleared');
  assert.strictEqual(result.points, 0, 'Expected 0 points');
  assert.notStrictEqual(board[0][0], null, 'board[0][0] should still be present');
  assert.notStrictEqual(board[1][0], null, 'board[1][0] should still be present');
  assert.notStrictEqual(board[2][0], null, 'board[2][0] should still be present');
});

// 4. A 6-tile ring (2x3: 4 corners + 2 straights) clears with +60.
runTest('A 6-tile ring (2x3: 4 corners + 2 straights) clears with +60', () => {
  const board = createBoard(6);
  // Top row: (0,0) corner, (0,1) straight, (0,2) corner
  board[0][0] = createCornerTile('ES');
  board[0][1] = createStraightTile('EW');
  board[0][2] = createCornerTile('SW');
  // Bottom row: (1,0) corner, (1,1) straight, (1,2) corner
  board[1][0] = createCornerTile('NE');
  board[1][1] = createStraightTile('EW');
  board[1][2] = createCornerTile('WN');

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 1, 'Expected 1 loop cleared');
  assert.strictEqual(result.clearedTiles, 6, 'Expected 6 tiles cleared');
  assert.strictEqual(result.points, 60, 'Expected 60 points (6 tiles * 10)');

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      assert.strictEqual(board[r][c], null, `Expected board[${r}][${c}] to be cleared`);
    }
  }
});

// 5. One placement that completes two separate loops: points = tiles×10×2.
runTest('One placement that completes two separate loops: points = tiles×10×2', () => {
  const board = createBoard(6);
  // Loop 1 setup: 2x2 ring at rows 0-1, cols 0-1 missing (1,1)
  board[0][0] = createCornerTile('ES');
  board[0][1] = createCornerTile('SW');
  board[1][0] = createCornerTile('NE');
  // Cell (1,1) will be completed with corner 'WN'

  // Loop 2 setup: 2x2 ring at rows 1-2, cols 2-3 missing (1,2)
  // Cell (1,2) will be completed with corner 'ES'
  board[1][3] = createCornerTile('SW');
  board[2][3] = createCornerTile('WN');
  board[2][2] = createCornerTile('NE');

  // Notice: (1,1) and (1,2) are adjacent cells!
  // (1,1) needs 'WN' (openings W and N; facing E is closed)
  // (1,2) needs 'ES' (openings E and S; facing W is closed)
  // Thus placing a 2-tile piece spanning (1,1) and (1,2) completes two separate, disjoint loops!
  const piece = createPiece([
    { r: 0, c: 0, tile: createCornerTile('WN') },
    { r: 0, c: 1, tile: createCornerTile('ES') }
  ]);

  const placed = placePiece(board, piece, 1, 1);
  assert.strictEqual(placed, true, 'Piece should be placed successfully');

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 2, 'Expected 2 separate loops cleared');
  assert.strictEqual(result.clearedTiles, 8, 'Expected 8 tiles cleared (4 + 4)');
  assert.strictEqual(result.points, 8 * 10 * 2, 'Expected points = tiles * 10 * 2 = 160');

  // Verify both loops cleared
  assert.strictEqual(board[0][0], null);
  assert.strictEqual(board[1][1], null);
  assert.strictEqual(board[1][2], null);
  assert.strictEqual(board[2][3], null);
});

// 6. Rotating any tile 4 times gives back the original. A rotated straight swaps N-S for E-W.
runTest('Rotating any tile 4 times gives back the original. A rotated straight swaps N-S for E-W', () => {
  const straightNS = createStraightTile('NS');
  const r1 = rotateTile(straightNS);
  assert.deepStrictEqual(r1.openings, ['E', 'W'], 'Straight NS rotated once must swap N-S for E-W');

  const r2 = rotateTile(r1);
  const r3 = rotateTile(r2);
  const r4 = rotateTile(r3);
  assert.deepStrictEqual(r4.openings, straightNS.openings, 'Straight rotated 4 times must return original openings');

  const cornerNE = createCornerTile('NE');
  let currentCorner = cornerNE;
  for (let i = 0; i < 4; i++) {
    currentCorner = rotateTile(currentCorner);
  }
  assert.deepStrictEqual(currentCorner.openings, cornerNE.openings, 'Corner rotated 4 times must return original openings');
});

// 7. canPlace rejects out-of-bounds and occupied cells and accepts a valid empty cell.
runTest('canPlace rejects out-of-bounds and occupied cells and accepts a valid empty cell', () => {
  const board = createBoard(6);
  const single = createPiece([{ r: 0, c: 0, tile: createStraightTile('NS') }]);
  const twoTile = createPiece([
    { r: 0, c: 0, tile: createStraightTile('NS') },
    { r: 0, c: 1, tile: createStraightTile('NS') }
  ]);

  // Valid empty cell
  assert.strictEqual(canPlace(board, single, 2, 2), true, 'Valid empty cell should be accepted');
  assert.strictEqual(canPlace(board, twoTile, 2, 2), true, 'Valid empty 2-tile placement should be accepted');

  // Out of bounds
  assert.strictEqual(canPlace(board, single, -1, 0), false, 'Negative row should be rejected');
  assert.strictEqual(canPlace(board, single, 6, 0), false, 'Row >= 6 should be rejected');
  assert.strictEqual(canPlace(board, single, 0, -1), false, 'Negative col should be rejected');
  assert.strictEqual(canPlace(board, single, 0, 6), false, 'Col >= 6 should be rejected');

  // 2-tile piece extending out of bounds
  assert.strictEqual(canPlace(board, twoTile, 0, 5), false, '2-tile piece extending past col 5 should be rejected');

  // Occupied cell
  board[3][3] = createStraightTile('NS');
  assert.strictEqual(canPlace(board, single, 3, 3), false, 'Occupied cell should be rejected');
  assert.strictEqual(canPlace(board, twoTile, 3, 2), false, 'Placement overlapping occupied cell should be rejected');
});

// 8. isGameOver is true for a full board with a 1-tile piece, and false when one cell is empty.
runTest('isGameOver is true for a full board with a 1-tile piece, and false when one cell is empty', () => {
  const board = createBoard(6);
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      board[r][c] = createStraightTile('NS');
    }
  }

  const tray = [createPiece([{ r: 0, c: 0, tile: createCornerTile('NE') }])];

  assert.strictEqual(isGameOver(board, tray), true, 'Full board should be game over');

  // Leave one cell empty
  board[0][0] = null;
  assert.strictEqual(isGameOver(board, tray), false, 'Board with 1 empty cell should not be game over for a 1-tile piece');
});

// 9. An opening pointing off the board edge counts as an open end, so a "ring" missing its partner off-board doesn't clear.
runTest('An opening pointing off the board edge counts as an open end, so it does not clear', () => {
  const board = createBoard(6);
  // Place two corners along the left edge (col 0):
  // (0,0) has openings ['S', 'W'] -> W points off board (col -1)
  // (1,0) has openings ['N', 'W'] -> W points off board (col -1)
  // S of (0,0) matches N of (1,0), but their W openings point off-board
  board[0][0] = createCornerTile('SW');
  board[1][0] = createCornerTile('WN');

  const result = checkClears(board);

  assert.strictEqual(result.numLoops, 0, 'Expected 0 loops cleared because edges point off-board');
  assert.strictEqual(result.clearedTiles, 0, 'Expected 0 tiles cleared');
  assert.strictEqual(result.points, 0, 'Expected 0 points');
  assert.notStrictEqual(board[0][0], null, 'Tile at (0,0) should remain');
  assert.notStrictEqual(board[1][0], null, 'Tile at (1,0) should remain');
});

// 10. Rotate a vertical domino once -> all offsets >= 0, and canPlace succeeds with its left tile at column 0. Also: rotating 4 times returns the same offsets.
runTest('Rotate a vertical domino once -> all offsets >= 0, and canPlace succeeds with its left tile at column 0; 4 rotations return same offsets', () => {
  const board = createBoard(6);
  const vDomino = createPiece([
    { r: 0, c: 0, tile: createStraightTile('NS') },
    { r: 1, c: 0, tile: createStraightTile('NS') }
  ]);

  const r1 = rotatePiece(vDomino);
  // All offsets >= 0
  for (const t of r1.tiles) {
    assert.ok(t.r >= 0, `Expected row offset >= 0, got ${t.r}`);
    assert.ok(t.c >= 0, `Expected col offset >= 0, got ${t.c}`);
  }

  // canPlace succeeds with its left tile at column 0
  assert.strictEqual(canPlace(board, r1, 0, 0), true, 'canPlace should succeed at column 0');

  // Verify left tile is placed at column 0
  const testBoard = createBoard(6);
  assert.strictEqual(placePiece(testBoard, r1, 0, 0), true, 'placePiece should succeed at column 0');
  assert.notStrictEqual(testBoard[0][0], null, 'Left tile must be at column 0');

  // Rotating 4 times returns the same offsets
  const r2 = rotatePiece(r1);
  const r3 = rotatePiece(r2);
  const r4 = rotatePiece(r3);

  assert.strictEqual(r4.tiles.length, vDomino.tiles.length, 'Tile count must match');
  for (let i = 0; i < vDomino.tiles.length; i++) {
    assert.strictEqual(r4.tiles[i].r, vDomino.tiles[i].r, `Tile ${i} r offset should match original`);
    assert.strictEqual(r4.tiles[i].c, vDomino.tiles[i].c, `Tile ${i} c offset should match original`);
  }
});

console.log(`\nAll ${passedTests} acceptance tests passed successfully!`);

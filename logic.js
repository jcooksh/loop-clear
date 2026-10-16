/**
 * Loop Clear - Pure Game Logic
 * Can run in Node.js (module.exports) or browser (window.LoopClearLogic).
 */

const BOARD_SIZE = 6;
const DIRS = ['N', 'E', 'S', 'W'];
const DIR_ORDER = { N: 0, E: 1, S: 2, W: 3 };

const OPPOSITE = {
  N: 'S',
  S: 'N',
  E: 'W',
  W: 'E'
};

const DIR_DELTAS = {
  N: { r: -1, c: 0 },
  S: { r: 1, c: 0 },
  E: { r: 0, c: 1 },
  W: { r: 0, c: -1 }
};

const ROTATION = {
  N: 'E',
  E: 'S',
  S: 'W',
  W: 'N'
};

function normalizeOpenings(openings) {
  return [...openings].sort((a, b) => DIR_ORDER[a] - DIR_ORDER[b]);
}

function createTile(type, openings) {
  return {
    type,
    openings: normalizeOpenings(openings)
  };
}

function createStraightTile(orientation = 'NS') {
  const openings = orientation === 'EW' ? ['E', 'W'] : ['N', 'S'];
  return createTile('straight', openings);
}

function createCornerTile(corner = 'NE') {
  // corner is two letters, e.g. NE, ES, SW, WN
  const openings = corner.split('');
  return createTile('corner', openings);
}

function rotateTile(tile) {
  const rotatedOpenings = tile.openings.map(d => ROTATION[d]);
  return {
    ...tile,
    openings: normalizeOpenings(rotatedOpenings)
  };
}

function createPiece(tiles, id = null, color = null) {
  // tiles: array of { r, c, tile }
  return {
    id: id || ('p_' + Math.random().toString(36).substring(2, 9)),
    color: color || '#38bdf8',
    tiles: tiles.map(t => ({
      r: t.r,
      c: t.c,
      tile: { ...t.tile, openings: [...t.tile.openings] }
    }))
  };
}

function rotatePiece(piece) {
  // Rotate 90 deg clockwise around (0,0)
  // Grid coords: (r, c) -> (c, -r)
  const rotatedTiles = piece.tiles.map(t => ({
    r: t.c,
    c: -t.r,
    tile: rotateTile(t.tile)
  }));

  // Shift all tile offsets so min r = 0 and min c = 0
  const minR = Math.min(...rotatedTiles.map(t => t.r));
  const minC = Math.min(...rotatedTiles.map(t => t.c));

  return {
    ...piece,
    tiles: rotatedTiles.map(t => ({
      r: t.r - minR,
      c: t.c - minC,
      tile: t.tile
    }))
  };
}

function createBoard(size = BOARD_SIZE) {
  const board = [];
  for (let r = 0; r < size; r++) {
    const row = [];
    for (let c = 0; c < size; c++) {
      row.push(null);
    }
    board.push(row);
  }
  return board;
}

function cloneBoard(board) {
  return board.map(row => row.map(cell => cell ? {
    ...cell,
    openings: [...cell.openings]
  } : null));
}

function canPlace(board, piece, startR, startC) {
  const size = board.length;
  for (const t of piece.tiles) {
    const r = startR + t.r;
    const c = startC + t.c;
    if (r < 0 || r >= size || c < 0 || c >= size) {
      return false;
    }
    if (board[r][c] !== null) {
      return false;
    }
  }
  return true;
}

function placePiece(board, piece, startR, startC) {
  if (!canPlace(board, piece, startR, startC)) {
    return false;
  }
  for (const t of piece.tiles) {
    const r = startR + t.r;
    const c = startC + t.c;
    board[r][c] = {
      type: t.tile.type,
      openings: [...t.tile.openings],
      color: piece.color
    };
  }
  return true;
}

/**
 * Finds all connected components of pipe tiles on the board.
 * Two tiles connect iff their facing openings match.
 */
function findConnectedComponents(board) {
  const size = board.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const components = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === null || visited[r][c]) continue;

      const comp = [];
      const queue = [{ r, c }];
      visited[r][c] = true;

      while (queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        const tile = board[curr.r][curr.c];

        for (const dir of tile.openings) {
          const delta = DIR_DELTAS[dir];
          const nr = curr.r + delta.r;
          const nc = curr.c + delta.c;

          // Check if neighbor is in bounds and connects back
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const neighbor = board[nr][nc];
            if (neighbor && neighbor.openings.includes(OPPOSITE[dir])) {
              if (!visited[nr][nc]) {
                visited[nr][nc] = true;
                queue.push({ r: nr, c: nc });
              }
            }
          }
        }
      }
      components.push(comp);
    }
  }

  return components;
}

/**
 * Checks for completed loops (components with NO open ends).
 * Clears them from the board and returns score details.
 */
function checkClears(board) {
  const size = board.length;
  const components = findConnectedComponents(board);

  const clearedComponents = [];

  for (const comp of components) {
    let hasOpenEnd = false;

    for (const cell of comp) {
      const tile = board[cell.r][cell.c];
      for (const dir of tile.openings) {
        const delta = DIR_DELTAS[dir];
        const nr = cell.r + delta.r;
        const nc = cell.c + delta.c;

        if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
          hasOpenEnd = true;
          break;
        }

        const neighbor = board[nr][nc];
        if (!neighbor || !neighbor.openings.includes(OPPOSITE[dir])) {
          hasOpenEnd = true;
          break;
        }
      }
      if (hasOpenEnd) break;
    }

    if (!hasOpenEnd) {
      clearedComponents.push(comp);
    }
  }

  const numLoops = clearedComponents.length;
  let totalTiles = 0;
  const clearedCells = [];

  for (const comp of clearedComponents) {
    totalTiles += comp.length;
    for (const cell of comp) {
      clearedCells.push(cell);
      board[cell.r][cell.c] = null;
    }
  }

  // Score: 10 per cleared tile. Clearing 2+ loops multiplies move's points by number of loops.
  const multiplier = numLoops >= 2 ? numLoops : 1;
  const points = totalTiles * 10 * multiplier;

  return {
    numLoops,
    clearedTiles: totalTiles,
    points,
    clearedCells
  };
}

/**
 * Checks if game is over: returns true when no tray piece fits anywhere in any rotation.
 */
function isGameOver(board, tray) {
  if (!tray || tray.length === 0) return false;
  const size = board.length;

  for (const piece of tray) {
    let currentPiece = piece;
    for (let rot = 0; rot < 4; rot++) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (canPlace(board, currentPiece, r, c)) {
            return false;
          }
        }
      }
      currentPiece = rotatePiece(currentPiece);
    }
  }
  return true;
}

const PALETTE = [
  '#38bdf8', // Sky blue
  '#f43f5e', // Rose
  '#10b981', // Emerald
  '#fbbf24', // Amber
  '#a855f7'  // Purple
];

function getRandomTile() {
  // 80% corner, 20% straight
  const isCorner = Math.random() < 0.8;
  if (isCorner) {
    const corners = [['N', 'E'], ['E', 'S'], ['S', 'W'], ['W', 'N']];
    const pick = corners[Math.floor(Math.random() * corners.length)];
    return createTile('corner', pick);
  } else {
    const straights = [['N', 'S'], ['E', 'W']];
    const pick = straights[Math.floor(Math.random() * straights.length)];
    return createTile('straight', pick);
  }
}

function generatePiece() {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  // 70% 1-tile, 30% 2-tile
  const isSingle = Math.random() < 0.7;

  if (isSingle) {
    return createPiece([{ r: 0, c: 0, tile: getRandomTile() }], null, color);
  } else {
    // 2-tile piece: either horizontal (0,1) or vertical (1,0)
    const isHoriz = Math.random() < 0.5;
    const tile1 = { r: 0, c: 0, tile: getRandomTile() };
    const tile2 = isHoriz
      ? { r: 0, c: 1, tile: getRandomTile() }
      : { r: 1, c: 0, tile: getRandomTile() };
    return createPiece([tile1, tile2], null, color);
  }
}

function generateTray(count = 3) {
  const tray = [];
  for (let i = 0; i < count; i++) {
    tray.push(generatePiece());
  }
  return tray;
}

const LoopClearLogic = {
  BOARD_SIZE,
  DIRS,
  OPPOSITE,
  DIR_DELTAS,
  createTile,
  createStraightTile,
  createCornerTile,
  rotateTile,
  createPiece,
  rotatePiece,
  createBoard,
  cloneBoard,
  canPlace,
  placePiece,
  findConnectedComponents,
  checkClears,
  isGameOver,
  generatePiece,
  generateTray
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoopClearLogic;
} else if (typeof window !== 'undefined') {
  window.LoopClearLogic = LoopClearLogic;
}

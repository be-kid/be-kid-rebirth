import React, { useState, useEffect, useCallback, useReducer } from 'react';
import './Grid.css';

const GRID_SIZE = 25;
const INITIAL_PLAYER_POSITION = { x: 12, y: 12 };
const SNAKE_LENGTH = 9;
const MAX_SNAKES = 7;
const SNAKE_SPAWN_INTERVAL = 7000; // 7 seconds
const SNAKE_MOVE_INTERVAL = 500; // 0.5 second

const getRandomCoordinate = () => ({
  x: Math.floor(Math.random() * GRID_SIZE),
  y: Math.floor(Math.random() * GRID_SIZE),
});

const initialState = {
  playerPosition: INITIAL_PLAYER_POSITION,
  foodPosition: getRandomCoordinate(),
  snakes: [],
  score: 0,
  gameStatus: 'PLAYING', // 'PLAYING', 'GAME_OVER'
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'MOVE_PLAYER':
      return { ...state, playerPosition: action.payload };
    case 'SET_FOOD':
      return { ...state, foodPosition: action.payload };
    case 'INCREASE_SCORE':
      return { ...state, score: state.score + 1 };
    case 'ADD_SNAKE':
      if (state.snakes.length < MAX_SNAKES) {
        return { ...state, snakes: [...state.snakes, action.payload] };
      }
      return state;
    case 'MOVE_SNAKES':
      return { ...state, snakes: action.payload };
    case 'GAME_OVER':
      return { ...state, gameStatus: 'GAME_OVER' };
    case 'RESET':
      return {
        ...initialState,
        foodPosition: getRandomCoordinate(),
        snakes: [],
      };
    default:
      throw new Error();
  }
}

const Grid = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { playerPosition, foodPosition, snakes, score, gameStatus } = state;

  const handleReset = () => {
    dispatch({ type: 'RESET' });
  };

  const handleKeyDown = useCallback((e) => {
    if (gameStatus !== 'PLAYING') return;

    let { x, y } = playerPosition;
    switch (e.key) {
      case 'ArrowUp':
        y = Math.max(0, y - 1);
        break;
      case 'ArrowDown':
        y = Math.min(GRID_SIZE - 1, y + 1);
        break;
      case 'ArrowLeft':
        x = Math.max(0, x - 1);
        break;
      case 'ArrowRight':
        x = Math.min(GRID_SIZE - 1, x + 1);
        break;
      default:
        return;
    }
    dispatch({ type: 'MOVE_PLAYER', payload: { x, y } });
  }, [playerPosition, gameStatus]);

  // Snake Spawning Effect
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const spawnInterval = setInterval(() => {
      const startX = Math.floor(Math.random() * (GRID_SIZE - SNAKE_LENGTH));
      const startY = GRID_SIZE - 1;
      const newSnake = {
        id: Date.now(),
        body: Array.from({ length: SNAKE_LENGTH }, (_, i) => ({ x: startX + i, y: startY })),
        direction: 'RIGHT',
      };
      dispatch({ type: 'ADD_SNAKE', payload: newSnake });
    }, SNAKE_SPAWN_INTERVAL);

    return () => clearInterval(spawnInterval);
  }, [snakes.length, gameStatus]);

  // Snake Movement Effect
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;

    const moveInterval = setInterval(() => {
      const newSnakes = snakes.map(snake => {
        const head = { ...snake.body[snake.body.length - 1] };
        let { direction } = snake;

        const possibleDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'].filter(dir => {
          if (direction === 'UP' && dir === 'DOWN') return false;
          if (direction === 'DOWN' && dir === 'UP') return false;
          if (direction === 'LEFT' && dir === 'RIGHT') return false;
          if (direction === 'RIGHT' && dir === 'LEFT') return false;
          return true;
        });
        
        if (Math.random() < 0.2) { // 20% chance to change direction
            direction = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        }

        switch (direction) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
          default: break;
        }
        
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
            // Simple wall collision: reverse direction
            switch (direction) {
                case 'UP': direction = 'DOWN'; head.y += 2; break;
                case 'DOWN': direction = 'UP'; head.y -= 2; break;
                case 'LEFT': direction = 'RIGHT'; head.x += 2; break;
                case 'RIGHT': direction = 'LEFT'; head.x -= 2; break;
                default: break;
            }
        }


        const newBody = [...snake.body.slice(1), head];
        return { ...snake, body: newBody, direction };
      });
      dispatch({ type: 'MOVE_SNAKES', payload: newSnakes });
    }, SNAKE_MOVE_INTERVAL);

    return () => clearInterval(moveInterval);
  }, [snakes, gameStatus]);

  // Player-Food Collision
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;
    if (playerPosition.x === foodPosition.x && playerPosition.y === foodPosition.y) {
      dispatch({ type: 'INCREASE_SCORE' });
      dispatch({ type: 'SET_FOOD', payload: getRandomCoordinate() });
    }
  }, [playerPosition, foodPosition, gameStatus]);

  // Player-Snake Collision
  useEffect(() => {
    if (gameStatus !== 'PLAYING') return;
    for (const snake of snakes) {
      for (const segment of snake.body) {
        if (playerPosition.x === segment.x && playerPosition.y === segment.y) {
          dispatch({ type: 'GAME_OVER' });
          return;
        }
      }
    }
  }, [playerPosition, snakes, gameStatus]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const renderGrid = () => {
    const grid = Array(GRID_SIZE * GRID_SIZE).fill(null);

    // Player
    grid[playerPosition.y * GRID_SIZE + playerPosition.x] = 'player';
    // Food
    grid[foodPosition.y * GRID_SIZE + foodPosition.x] = 'food';
    // Snakes
    snakes.forEach(snake => {
        snake.body.forEach(segment => {
            grid[segment.y * GRID_SIZE + segment.x] = 'snake';
        });
    });

    return grid.map((cellType, i) => (
      <div key={i} className={`cell ${cellType || ''}`}></div>
    ));
  };

  return (
    <div>
      <h1>Score: {score}</h1>
      {gameStatus === 'GAME_OVER' && <h2>Game Over</h2>}
      <div className="grid-container">
        {renderGrid()}
      </div>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
};

export default Grid;
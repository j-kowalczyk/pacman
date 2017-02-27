import Ember from 'ember';
import SharedStuff from '../mixins/shared-stuff';
import Ghost from '../models/ghost';
import Pac from '../models/pac';
import Level from '../models/level';
import Level2 from '../models/level2';
import TeleportLevel from '../models/teleport-level';
import KeyboardShortcuts from 'ember-keyboard-shortcuts/mixins/component';

export default Ember.Component.extend(KeyboardShortcuts, SharedStuff, {
  score: 0,
  levelNumber: 1,
  lives: 3,
  levels: [TeleportLevel, Level, Level2],
  directions: {
    'up': {x: 0, y: -1},
    'down': {x: 0, y: 1},
    'left': {x: -1, y: 0},
    'right': {x: 1, y: 0},
    'stopped': {x: 0, y: 0}
  },
  isMoving: false,
  direction: 'down',
  intent: 'down',
  frameCycle: 1,
  framesPerMovement: 30,

  screenPixelWidth: Ember.computed(function(){
    return this.get('screenWidth') * this.get('level.squareSize');
  }),
  screenPixelHeight: Ember.computed(function() {
    return this.get('screenHeight') * this.get('level.squareSize');
  }),

  screenHeight: Ember.computed(function(){
    return this.get('level.layout.length');
  }),
  screenWidth: Ember.computed(function(){
    return this.get('level.layout.firstObject.length');
  }),


  //didInsertElement runs whenever the component (the element) is loaded and put on the screen (more on this in the next chapter). I
  //didInsertElement is your way of telling the Ember component "hey, after you're done putting this component on the screen, I want you to do this."
  didInsertElement() {
    this.startNewLevel();
    this.loop();
    // this.drawCircle(200, 300);
    // this.drawCircle(500, 300);
  },
  ctx: Ember.computed(function(){
    let canvas = document.getElementById("myCanvas");
    let ctx = canvas.getContext("2d");
    return ctx;
  }),
  drawWall(x, y) {
    let squareSize = this.get('level.squareSize');
    let ctx = this.get('ctx');

    ctx.fillStyle = '#000';
    ctx.fillRect(x * squareSize,
      y * squareSize,
      squareSize,
      squareSize)
  },
  drawGrid: function(){
    let grid = this.get('level.layout');
    grid.forEach((row, rowIndex)=>{
      row.forEach((cell, columnIndex)=>{
        if(cell === 1) {
          this.drawWall(columnIndex, rowIndex);
        }
        if(cell === 2) {
          this.drawPellet(columnIndex, rowIndex);
        }
        if(cell == 3){
          this.drawPowerPellet(columnIndex, rowIndex)
        }
      })

    })
  },
  drawPowerPellet(x, y){
    let radiusDivisor = 4;
    this.drawCircle(x, y, radiusDivisor, 'stopped', 'green')
  },
  drawPellet(x, y){
    let radiusDivisor = 6;
    this.drawCircle(x, y, radiusDivisor, 'stopped', '#fe0');
  },
  offsetFor(coordinate, direction){
    let frameRatio = this.get('frameCycle') / this.get('framesPerMovement');
    return this.get(`directions.${direction}.${coordinate}`) * frameRatio;
  },

  clearScreen(){
    let ctx = this.get('ctx');
    let screenPixelWidth = this.get('screenWidth') * this.get('squareSize'); // 800
    let screenPixelHeight = this.get('screenHeight') * this.get('squareSize'); // 600

    ctx.clearRect(0, 0, screenPixelWidth, screenPixelHeight)
  },
  collidedWithBorder(){
    let x = this.get('x');
    let y = this.get('y');
    let screenHeight = this.get('screenHeight');
    let screenWidth = this.get('screenWidth');

    let pacOutOfBounds = x < 0 ||
                          y < 0 ||
                          x >= screenWidth ||
                          y >= screenHeight
    return pacOutOfBounds
  },
  collidedWithWall: function(){
    let x = this.get('x');
    let y = this.get('y');
    let grid = this.get('grid');

    return grid[y][x] === 1;
  },
  loadNewLevel(){
    let levelIndex = (this.get('levelNumber') - 1) % this.get('levels.length')
    let levelClass = this.get('levels')[levelIndex]
    return levelClass.create()
  },
  restart(){
    if(this.get('lives') <= 0) {
      this.set('score', 0)
      this.set('lives', 3)
      this.set('levelNumber', 1)
      this.startNewLevel()
      // this.get('pac').restart();
    }
    // this.get('level').restart();
    this.get('pac').restart();
    this.get('ghosts').forEach( ghost => ghost.restart() );
  },
  processAnyPellets: function(){
    let x = this.get('pac.x');
    let y = this.get('pac.y');
    let grid = this.get('level.layout');

    if(grid[y][x] == 2){
      grid[y][x] = 0;
      this.incrementProperty('score');

      if(this.get('level').isComplete()){
        this.incrementProperty('levelNumber')
        // this.get('level').restart();
        // this.restart()
        this.startNewLevel();
      }
    } else if(grid[y][x] == 3){
      grid[y][x] = 0;
      this.set('pac.powerModeTime', this.get('pac.maxPowerModeTime'));    }
  },
  detectGhostCollisions(){
    return this.get('ghosts').filter((ghost)=>{
      return this.get('pac.x') == ghost.get('x') &&
             this.get('pac.y') == ghost.get('y')
    })
  },

  levelComplete: function(){
    let hasPelletsLeft = false;
    let grid = this.get('level.grid');

    grid.forEach((row)=>{
      row.forEach((cell)=>{
        if(cell == 2){
          hasPelletsLeft = true
        }
      })
    })
    return !hasPelletsLeft;
  },

  startNewLevel(){
    let level = this.loadNewLevel();
    this.set('level', level)
    let pac = Pac.create({
      level: level,
      x: level.get('startingPac.x'),
      y: level.get('startingPac.y')
    });
    this.set('pac', pac);
    let ghosts = level.get('startingGhosts').map((startingPosition)=>{
      return Ghost.create({
        level: level,
        x: startingPosition.x,
        y: startingPosition.y,
        pac: pac
      })
    })
    // let ghosts = [ghost1, ghost2]
    this.set('ghosts', ghosts)
  },

  loop(){
    this.get('pac').move();
    this.get('ghosts').forEach(ghost => ghost.move() );


    this.processAnyPellets();

    this.clearScreen();
    this.drawGrid();
    this.get('pac').draw();
    this.get('ghosts').forEach(ghost => ghost.draw() )

    let ghostCollisions = this.detectGhostCollisions();
    if(ghostCollisions.length > 0){
      if(this.get('pac.powerMode')){
        ghostCollisions.forEach( ghost => ghost.retreat() )
      } else {
        this.decrementProperty('lives');
        this.restart();
      }
    }

    Ember.run.later(this, this.loop, 1000/60);
  },


  keyboardShortcuts: {
    up: function() {
      this.set('pac.intent', 'up');
      // this.movePacMan('up');
    },
    down: function() {
      this.set('pac.intent', 'down');
      // this.movePacMan('down');
    },
    left: function() {
      this.set('pac.intent', 'left');
      // this.movePacMan('left');
    },
    right: function() {
      this.set('pac.intent', 'right');
      // this.movePacMan('right');
    },
    r: function() {
      this.restart();
    },
    // 'esc' : 'cancel',
    tab : function() {
      console.log('Tab pressed');
      return false; // preventDefault
    }
  },
});

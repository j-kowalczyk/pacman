import Ember from 'ember';
import SharedStuff from '../mixins/shared-stuff';
import Movement from '../mixins/movement';

export default Ember.Object.extend(SharedStuff, Movement, {
  direction: 'down',
  intent: 'down',

  level: null,
  x: null,
  y: null,
  powerMode: Ember.computed.gt('powerModeTime', 0),
  powerModeTime: 0,
  maxPowerModeTime: 400,
  timers: ['powerModeTime'],

  draw(){
    let radiusDivisor = 2;
    // let color = this.get('powerMode') ? '#AF0' : '#FE0';
    // this.drawCircle(this.x, this.y, radiusDivisor, this.get('direction'), color);
    this.drawCircle(this.x, this.y, radiusDivisor, this.get('direction'), this.get('color'));
  },
  move(){
    if(this.animationCompleted()){
      this.finalizeMove();
      this.changeDirection();
    } else if(this.get('direction') == 'stopped'){
      this.changeDirection();
    } else {
      this.incrementProperty('frameCycle');
    }
  },
  animationCompleted(){
    return this.get('frameCycle') == this.get('framesPerMovement');
  },
  finalizeMove(){
    let direction = this.get('direction');
    this.set('x', this.nextCoordinate('x', direction));
    this.set('y', this.nextCoordinate('y', direction));

    this.set('frameCycle', 1);
  },
  color: Ember.computed('powerModeTime', function(){
    let timerPercentage = this.get('powerModeTime') / this.get('maxPowerModeTime');
    let powered = {r: 0, g: 100, b: 0};
    let normal = {r: 100, g: 92, b: 0};
    let [r, g, b] = ['r', 'g', 'b'].map(function(rgbSelector){
      let color =  powered[rgbSelector] * timerPercentage +
                   normal[rgbSelector] * (1 - timerPercentage)
      return Math.round(color)
    })
    return `rgb(${r}%,${g}%,${b}%)`
  }),
  pathBlockedInDirection(direction) {
    let cellTypeInDirection = this.cellTypeInDirection(direction);
    return Ember.isEmpty(cellTypeInDirection) || cellTypeInDirection === 1;
  },
  cellTypeInDirection(direction) {
    let nextX = this.nextCoordinate('x', direction);
    let nextY = this.nextCoordinate('y', direction);

    return this.get(`level.layout.${nextY}.${nextX}`);
  },
  nextCoordinate(coordinate, direction){
    return this.get(coordinate) + this.get(`directions.${direction}.${coordinate}`);
  },
  changeDirection(){
    let intent = this.get("intent")
    if(this.pathBlockedInDirection(intent)){
      this.set('direction', 'stopped');
    } else {
      this.set('direction', intent);
    }
  },

  restart(){
    this.set('x', this.get('level.startingPac.x'));
    this.set('y', this.get('level.startingPac.y'));
    this.set('frameCycle', 0);
    this.set('direction', 'stopped');
  }
})

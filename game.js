/*
TODO:
x draw player
x move player
x create enemy
x click to shoot enemy 
- terrain
- visibility
- lunge spells
- destructible terrain
*/
var Game = {
    scheduler: null,
    display: null,
    drawable: [],
    mapSize: 9,
    entities: [],
    init: function() {
        this.scheduler = new ROT.Scheduler.Simple();
        this.engine = new ROT.Engine(this.scheduler);
        this.display = new ROT.Display({
            forceSquareRatio: true,
            width: 30,
            height: 9,
            fontSize: 20
        });
        document.body.appendChild(this.display.getContainer());
        this._generateMap();
        this.engine.start();
        window.requestAnimationFrame(redraw);

    },
    _generateMap: function() {
        this.player = new Player(0,0);
        this.drawable.push(this.player);
        this.scheduler.add(this.player, true);
        this.enemy = new Enemy(5,5);
        this.drawable.push(this.enemy);
        this.entities.push(this.enemy);
        this.scheduler.add(this.enemy, true);
    },
    _removeItemFromList: function(item, list)
    {
        for (var i = 0; i < list.length; i++) {
            if(list[i] === item)
            {
                list.splice(i, 1);
                this.scheduler.remove(item);
                return;
            }
        }
    },
    removeEntity: function(entity)
    {
        this._removeItemFromList(entity, this.entities);
        this._removeItemFromList(entity, this.drawable);
    },
    getEntitiesAtPosition: function(x,y) {
        var res = [];
        var list = this.entities;
        for (var i = 0; i < list.length; i++) {
            if(list[i].getX() == x && list[i].getY() == y)
            {
                res.push(list[i]);
            }
        }
        return res;
    },
    draw: function() {
        // draw the current map
        for (var x = 0; x < this.mapSize; x++) {
            for (var y = 0; y < this.mapSize; y++) {
                this.display.draw(x,y,' ');
            }
        }
        for (var i = 0; i < this.drawable.length; i++) {
            this.drawable[i].draw();
        }
    }
}
var redraw = function(timestamp)
{
    Game.draw();
    window.requestAnimationFrame(redraw)
}
var Entity = function(x,y)
{
    this._x = x;
    this._y = y;
}
Entity.prototype.getX = function()
{
    return this._x;
}
Entity.prototype.getY = function()
{
    return this._y;
}
Entity.prototype.setX = function(x)
{
    this._x = x;
}
Entity.prototype.setY = function(y)
{
    this._y = y;
}
Entity.prototype.setPosition = function(x,y)
{
    this._x = x;
    this._y = y;
}
var Enemy = function(x,y)
{
    this.setPosition(x,y);
    this.shootable = true;
}
Enemy.prototype = Object.create(Entity.prototype);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.draw = function()
{
    Game.display.draw(this.getX(), this.getY(), 'e', '#f00');
}
Enemy.prototype.act = function()
{

}
Enemy.prototype.onShot = function()
{
    Game.removeEntity(this);
}
var Player = function(x,y)
{
    this.setPosition(x,y);
}
Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;
Player.prototype.act = function()
{
    Game.engine.lock();
    window.addEventListener("keydown", this);
    window.addEventListener("mousemove", this);
    window.addEventListener("mousedown", this);
}
Player.prototype.draw = function()
{
    // draw the targeting line
    if(this.lineTarget != null)
        line(this.getX(), this.getY(), this.lineTarget[0], this.lineTarget[1]);
    Game.display.draw(this.getX(), this.getY(), '@');
}
Player.prototype.handleEvent = function(e)
{
    switch(e.type)
    {
        case 'keydown':
            return this.handleKeyEvent(e);
        case 'mousemove':
            return this.handleMouseMoveEvent(e);
        case 'mousedown':
            return this.handleMouseDownEvent(e);
    }
}
function line(x0, y0, x1, y1){
   var dx = Math.abs(x1-x0);
   var dy = Math.abs(y1-y0);
   var sx = (x0 < x1) ? 1 : -1;
   var sy = (y0 < y1) ? 1 : -1;
   var err = dx-dy;

   while(true){
     Game.display.draw(x0,y0, '.');  // Do what you need to for this

     if ((x0==x1) && (y0==y1)) break;
     var e2 = 2*err;
     if (e2 >-dy){ err -= dy; x0  += sx; }
     if (e2 < dx){ err += dx; y0  += sy; }
   }
}
Player.prototype.handleMouseMoveEvent = function(e)
{
    // draw a line between the player and the mouse position
    this.lineTarget = Game.display.eventToPosition(e);
}
Player.prototype.handleMouseDownEvent = function(e)
{
    // check to see if the level has a shootable entity on the current spot
    var target = Game.display.eventToPosition(e);
    var entitiesAtPosition = Game.getEntitiesAtPosition(target[0], target[1]);
    for (var i = entitiesAtPosition.length - 1; i >= 0; i--) {
        if(entitiesAtPosition[i].shootable)
        {
            entitiesAtPosition[i].onShot();
        }
    }
}
Player.prototype.handleKeyEvent = function(e)
{
    var keyMap = {};
    // support wasd keys?
    // I think the more roguelike way to do it would be to have a key to target next
    // visible enemy
    // also that gets around my problem of not being able to dev with dvorak
    keyMap[38] = 0;
    keyMap[39] = 1;
    keyMap[40] = 2;
    keyMap[37] = 3;
    var code = e.keyCode;
    // update the position of the player
    if(code in keyMap)
    {
        var dir = ROT.DIRS[4][keyMap[code]];
        this.setPosition(this.getX()+dir[0], this.getY()+dir[1]);
    }    
}
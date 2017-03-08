/*
TODO:
x shooting enemy
x enemy attacks
- enemy movement?
- enemy shooter attack
- visibility
- lunge spells
- destructible terrain
- room types
- room decoration
- room subdivision
- office placement (place rect within room)
- boundary walls
- room entrance / exit
- two gun types (laser / kinetic)
- windows smashable with kinetic / lunge spell
- soundtrack
- sound effects
*/
var ENVDEFS = {
    floor: {key: 'floor', char: '░', fgColor: '#141301', bgColor: '#091921', passable: true},
    wall: {key: 'wall', char: '■', fgColor: '#6A8D73', bgColor: '#47544D'},
    window: {key: 'window', char: '║', fgColor: '#E2FFF2', bgColor: '#7ADDDA'},
    plant: {key: 'plant', char:'§', fgColor: '#79CC5F', bgColor: '#091921'}
}
var Game = {
    scheduler: null,
    display: null,
    drawable: [],
    map: {},
    mapSize: 13,
    entities: [],
    init: function() {
        this.scheduler = new ROT.Scheduler.Simple();
        this.engine = new ROT.Engine(this.scheduler);
        this.display = new ROT.Display({
            forceSquareRatio: true,
            width: 30,
            height: this.mapSize,
            fontSize: 20
        });
        document.body.appendChild(this.display.getContainer());
        this._generateMap();
        this.engine.start();
        window.requestAnimationFrame(redraw);
    },
    _generateMap: function() {
        var freeCells = [];
        var noise = new ROT.Noise.Simplex();
        for (var x = 0; x < this.mapSize; x++) {
            for (var y = 0; y < this.mapSize; y++) {
                var cell = this.map[this.getKey(x,y)] = {key: 'floor', colorOffset: noise.get(x/5, y/5)*0.4};
                this._generateColorOffsetsForCell(cell);
                freeCells.push(this.getKey(x,y));
            }
        }
        // this all sucks!
        // should replace with sensible map layout something
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            var xy = this._keyToXY(key);
            this.map[key] = {key:'wall', colorOffset: noise.get(xy[0]/5,xy[1]/5)*0.1};
            this._generateColorOffsetsForCell(this.map[key]);
        }
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            var xy = this._keyToXY(key);
            this.map[key] = {key:'window', colorOffset: noise.get(xy[0]/5,xy[1]/5)*0.1};
            this._generateColorOffsetsForCell(this.map[key]);
        }
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            var xy = this._keyToXY(key);
            this.map[key] = {key:'plant', colorOffset: noise.get(xy[0]/5,xy[1]/5)*0.3};
            this._generateColorOffsetsForCell(this.map[key]);
        }

        this.player = new Player(0,0);
        this.drawable.push(this.player);
        this.scheduler.add(this.player, true);

        this.enemy = new Enemy(5,5);
        this.drawable.push(this.enemy);
        this.entities.push(this.enemy);
        this.scheduler.add(this.enemy, true);

        this.drawable.push(new Hud());
    },
    _keyToXY: function(key)
    {
        return key.split(',');
    },
    _generateColorOffsetsForCell: function(cell)
    {

        var envDef = ENVDEFS[cell.key];
        cell.envDef = envDef;
        var fgColorHSL = ROT.Color.rgb2hsl(ROT.Color.fromString(envDef.fgColor));
        fgColorHSL[1]+=cell.colorOffset;
        var bgColorHSL = ROT.Color.rgb2hsl(ROT.Color.fromString(envDef.bgColor));
        bgColorHSL[1]+=cell.colorOffset;
        cell.bgColor = this.hsl2rgbString(bgColorHSL);
        cell.fgColor = this.hsl2rgbString(fgColorHSL);
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
    getKey: function(x,y){
        return x+","+y;
    },
    draw: function() {
        // draw the current map
        for (var x = 0; x < this.mapSize; x++) {
            for (var y = 0; y < this.mapSize; y++) {
                var cell = this.map[this.getKey(x,y)];
                var envDef = ENVDEFS[cell.key];
                this.display.draw(x,y,envDef.char,cell.fgColor,cell.bgColor);
            }
        }
        for (var i = 0; i < this.drawable.length; i++) {
            this.drawable[i].draw();
        }
    },
    hsl2rgbString: function(hsl)
    {
        var rgb = ROT.Color.hsl2rgb(hsl);
        return 'rgb('+rgb[0]+','+rgb[1]+','+rgb[2]+')';
    },
    gameOver: function()
    {
        this.drawable = [];
        this.entities = [];
        this.map = {};
        this.scheduler.clear();
        this._generateMap();
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
Entity.prototype.checkAlongPath = function(dirx, diry, checkFunction)
{
    var res = [];
    var checkX = this.getX()+dirx;
    var checkY = this.getY()+diry;
    var checkKey = Game.getKey(checkX, checkY);
    while(checkKey in Game.map)
    {
        
        var checkRes = checkFunction(checkX, checkY);
        if(checkRes)
        {
            if(checkRes !== true){
                if(checkRes.constructor === Array)
                {
                    for (var i = checkRes.length - 1; i >= 0; i--) {
                        res.push(checkRes[i]);
                    }
                }else{
                    res.push(checkRes)
                }
                
            }
        }else{
            return res;
        }
        checkX += dirx;
        checkY += diry;
        checkKey = Game.getKey(checkX, checkY);
    }
    return res;
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
    this.movement();
    // check if player is along shot path
    this.melee();
}
Enemy.prototype.movement = function()
{
    /* prepare path to given coords */
    var enemy = this;
    var astar = new ROT.Path.AStar(Game.player.getX(), Game.player.getY(), function(x,y){
        var pathKey = Game.getKey(x,y);
        var isSelf = Game.getEntitiesAtPosition(x,y).length == 1 && Game.getEntitiesAtPosition(x,y)[0] === enemy;
        return pathKey in Game.map
            && Game.map[pathKey].envDef.passable
            && (Game.getEntitiesAtPosition(x,y).length == 0 || isSelf)
    }, {topology: 4});

    /* compute from given coords #1 */
    var moved = false;
    astar.compute(this.getX(), this.getY(), function(x,y){
        if(moved)
            return;
        var pathOnSelf = enemy.getX() == x && enemy.getY() == y;
        var pathOnPlayer = x==Game.player.getX() && y ==Game.player.getY();
        if(!pathOnSelf && !pathOnPlayer){
            moved = true;
            enemy.setX(x); enemy.setY(y);
        }
    });
    return moved;
}
Enemy.prototype.melee = function()
{
    // check to see if the player is next to an enemy, and end the game if so
    for (var i = 0; i < ROT.DIRS[4].length; i++) {
        var neighbor = [ROT.DIRS[4][i][0]+this.getX(), ROT.DIRS[4][i][1]+this.getY()];
        if((Game.getKey(neighbor[0],neighbor[1]) in Game.map)
            && Game.player.getX() == neighbor[0]
            && Game.player.getY() == neighbor[1])
        {
            Game.player.hit();
        }
    }
}
Enemy.prototype.onShot = function()
{
    Game.removeEntity(this);
}
var Hud = function()
{

}
Hud.prototype.draw = function()
{

    var leftSide = Game.mapSize+1;
    // clear screen
    for(var x=leftSide;x<Game.display.getOptions().width;x++)
    {
        for(var y=0;y<Game.display.getOptions().height;y++)
        {
            Game.display.draw(x, y, ' ', '#000', '#000');
        }
    }
    var currentLine = 0;
    var hpStr = 'HP:%c{red}';
    for (var i = 0; i < Game.player.hp; i++) {
        hpStr += '♥';
    }
    Game.display.drawText(leftSide, currentLine++,hpStr);
}  
var Player = function(x,y)
{
    this.setPosition(x,y);
    this.hp = 3;
}
Player.prototype = Object.create(Entity.prototype);
Player.prototype.constructor = Player;
Player.prototype.act = function()
{
    Game.engine.lock();
    window.addEventListener("keydown", this);
    // window.addEventListener("mousemove", this);
    // window.addEventListener("mousedown", this);
}
Player.prototype.hit = function()
{
    this.hp--;
    if(this.hp<=0)
        Game.gameOver();
}
Player.prototype.draw = function()
{
    // draw the targeting line
    if(this.lineTarget != null)
        line(this.getX(), this.getY(), this.lineTarget[0], this.lineTarget[1]);
    cell = Game.map[Game.getKey(this.getX(), this.getY())];
    Game.display.draw(this.getX(), this.getY(), '@', '#E5E7E6', cell.bgColor);
}
Player.prototype.handleEvent = function(e)
{
    switch(e.type)
    {
        case 'keydown':
            return this.handleKeyEvent(e);
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
        var newX = this.getX()+dir[0];
        var newY = this.getY()+dir[1];
        var orthagonalShotHits = this.checkAlongPath(dir[0], dir[1], function(x,y){
            if(Game.getEntitiesAtPosition(x, y).length > 0){
                return Game.getEntitiesAtPosition(x, y);
            }
            return Game.map[Game.getKey(x,y)].envDef.passable;
        });
        if(orthagonalShotHits.length > 0){
            orthagonalShotHits[0].onShot();
            return;
        }
        
        // check to make sure it is a legal move
        var newPositionKey = Game.getKey(newX, newY);
        if(newPositionKey in Game.map && ENVDEFS[Game.map[newPositionKey].key].passable)
        {
            this.setPosition(this.getX()+dir[0], this.getY()+dir[1]);
        }
    }
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
}

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
Entity.prototype.draw = function()
{
    cell = Game.map[Game.getKey(this.getX(), this.getY())];
    var bgColor = cell.bgColor
    if(this.useCustomBG)
        bgColor = this.bgColor;
    Game.display.draw(this.getX(),this.getY(), this.char, this.fgColor, bgColor);
}
var RestartListener = function(x,y)
{
    this.setPosition(x,y);
}
RestartListener.extend(Entity);
RestartListener.prototype.act = function()
{
    Game.engine.lock();
    window.addEventListener("keydown", this);
}
RestartListener.prototype.handleEvent = function(e)
{
    if(e.keyCode == 32)
    {
        Game.restart();
        Game.engine.unlock();
    }
}
var Window = function(x,y)
{
    this.setPosition(x,y);
    this.breakable = true;
    this.char = ['|','-'];
    this.char = this.char[ROT.RNG.getUniformInt(0, this.char.length-1)];
    this.draw();
    this.fgColor= '#E2F3F1';
    this.bgColor= '#7AADAA'
    this.useCustomBG = true
}
Window.extend(Entity);
Window.prototype.break = function()
{
    Game.removeEntity(this);
}
Window.prototype.onMelee = function()
{
    this.break();
}
var Acid = function(x,y)
{
    this.setPosition(x,y);
    this.passable = true;
    // states = âäàå full to nearly empty
    this.char = 'â';
}
var Enemy = function(x,y)
{
    this.setPosition(x,y);
    this.shootable = true;
    this.draw();
    this.fgColor = '#f33';
    this.char = 'e'
}
Enemy.extend(Entity);
Enemy.prototype.act = function()
{
    // check if player is along shot path
    if(!this.melee())
    {
        this.movement();
    }
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
            return true;
        }
    }
}
Enemy.prototype.onShot = function()
{
    Game.removeEntity(this);
}
Enemy.prototype.onMelee = function()
{
    Game.removeEntity(this);
}
EnemySpitter = function(x,y)
{
    this.setPosition(x,y);
    this.state = 'seeking';
    this.shootable = true;

    // this.state = 'charging'
    this.char = 's';
    this.fgColor = '#f33';
}
EnemySpitter.extend(Enemy);
EnemySpitter.prototype.checkShot = function()
{
    var hasShot = false;
    for (var i = 0; i < ROT.DIRS[4].length; i++) {
        var shotDistance = 4;
        var dir = ROT.DIRS[4][i];
        var orthagonalShotHits = this.checkAlongPath(dir[0], dir[1], function(x,y){
            shotDistance--;
            if(shotDistance<=0)
                return false;
            var playerAtPosition = Game.player._x == x && Game.player._y == y;
            if(playerAtPosition)
                return Game.player;
            // this doesn't check to see if there is an enemy along shot path

            return Game.map[Game.getKey(x,y)].envDef.passable;
        });
        if(orthagonalShotHits.length > 0 && orthagonalShotHits[orthagonalShotHits.length-1] == Game.player)
            hasShot = true;
        if(hasShot)
            break;
    }
    if(hasShot)
    {
        if(this.state == 'seeking'){
            this.state = 'shooting'
            this.char = 'S';
        }else{
            Game.player.hit();
        }
        return true;
    }else{
        this.state = 'seeking';
    }
    this.char = 's';
    return false;
}
EnemySpitter.prototype.act = function()
{
    // check if player is along shot path
    if(!this.checkShot())
    {
        this.movement();
    }
}
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
    this.draw();
}
Enemy.prototype = Object.create(Entity.prototype);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.draw = function()
{
    cell = Game.map[Game.getKey(this.getX(), this.getY())];
    Game.display.draw(this.getX(),this.getY(), "e", '#f33', cell.bgColor);
}
Enemy.prototype.act = function()
{
    console.log('enemy act');
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
var Hud = function()
{

}
Hud.prototype.draw = function()
{

    var leftSide = 0;
    // clear screen
    for(var x=0;x<Game.huddisplay.getOptions().width;x++)
    {
        for(var y=0;y<Game.huddisplay.getOptions().height;y++)
        {
            Game.huddisplay.draw(x, y, ' ', '#000', '#000');
        }
    }
    if(Game.gameHasBeenWon)
        return this.drawGameWin();
    else if(Game.gameHasBeenLost)
        return this.drawGameLoss();
    var currentLine = 0;
    Game.huddisplay.drawText(leftSide, currentLine++,'LEVEL: '+Game.currentLevel);
    currentLine++;
    var hpStr = 'HP:%c{red}';
    for (var i = 0; i < Game.player.hp; i++) {
        hpStr += '♥';
    }
    Game.huddisplay.drawText(leftSide, currentLine++,hpStr);
    if(Game.player.laser.isChargeReady())
    {
        Game.huddisplay.drawText(leftSide, currentLine++,'BEAM: OK');
    }else{
        Game.huddisplay.drawText(leftSide, currentLine++,'BEAM IN: '+Game.player.laser.turnsUntilReady());
    }
    currentLine++;
    if(Game.player.roll.isChargeReady())
    {
        let rollColor = Game.player.rolling?"%c{#f00}":"%c{#fff}";
        Game.huddisplay.drawText(leftSide, currentLine++,rollColor+'1: LUNGE OK');
    }else{
        Game.huddisplay.drawText(leftSide, currentLine++,'1: LUNGE IN: '+Game.player.roll.turnsUntilReady());
    }
}
Hud.prototype.drawGameLoss = function()
{
    var leftSide = 0;
    var currentLine = 0;
    Game.huddisplay.drawText(leftSide, currentLine++,'YOU HAVE LOST');
    Game.huddisplay.drawText(leftSide, currentLine++,'PRESS SPACE TO RESTART');
}
Hud.prototype.drawGameWin = function()
{
    var leftSide = 0;
    var currentLine = 0;
    Game.huddisplay.drawText(leftSide, currentLine++,'YOU HAVE WON');
    Game.huddisplay.drawText(leftSide, currentLine++,'PRESS SPACE TO RESTART');
}
var ChargableItem = function(fullCharge)
{
    this.fullCharge = fullCharge;
    this.currentCharge = this.fullCharge;
}
ChargableItem.prototype.turnsUntilReady = function()
{
    return this.fullCharge-this.currentCharge;
}
ChargableItem.prototype.isChargeReady = function()
{
    return this.currentCharge >= this.fullCharge;
}
ChargableItem.prototype.discharge = function()
{
    this.currentCharge = 0;
}
ChargableItem.prototype.charge = function()
{
    this.currentCharge++;
}

var Player = function(x,y)
{
    this.setPosition(x,y);
    this.hp = 3;
    this.laser = new ChargableItem(3);
    this.roll = new ChargableItem(3);
    this.rolling = false;
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
Player.prototype.endTurn = function()
{
    window.removeEventListener("keydown", this);
    var key = Game.getKey(this.getX(), this.getY());
    if(Game.map[key].key == 'exit')
    {
        Game.nextLevel();
    }
    Game.engine.unlock();
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
Player.prototype.attemptLaserShot = function(dir)
{
    if(this.laser.isChargeReady())
    {
        var orthagonalShotHits = this.checkAlongPath(dir[0], dir[1], function(x,y){
            if(Game.getEntitiesAtPosition(x, y).length > 0
                && Game.getEntitiesAtPosition(x, y)[0].shootable){
                return Game.getEntitiesAtPosition(x, y);
            }
            return Game.map[Game.getKey(x,y)].envDef.passable;
        });
        if(orthagonalShotHits.length > 0){
            orthagonalShotHits[0].onShot();
            this.laser.discharge();
            this.endTurn();
            return true;
        }
    }
    return false;
}
Player.prototype.handleMovement = function(dir)
{
    var newX = this.getX()+dir[0];
    var newY = this.getY()+dir[1];
    // check to make sure it is a legal move
    var newPositionKey = Game.getKey(newX, newY);
    if(this.rolling){
        // find the new position within 4 distance
        let maxRollDistance = 4;
        let rollCells = this.checkAlongPath(dir[0], dir[1], function(x,y){
            entitiesAtPosition = Game.getEntitiesAtPosition(x, y);
            let rollOk = Game.map[Game.getKey(x,y)].envDef.passable
                && (entitiesAtPosition.length == 0 || entitiesAtPosition[0].breakable)
                && --maxRollDistance>0;
            if(rollOk)
            {
                if(entitiesAtPosition.length > 0)
                    entitiesAtPosition[0].break();
                return [[x,y]];
            }
            return false;
        });
        if(rollCells.length > 0)
        {
            let newPosition = rollCells[rollCells.length-1];
            this.setPosition(newPosition[0], newPosition[1]);
            this.rolling = false;
            this.roll.discharge();
            this.endTurn();
            return;
        }
    }else if(this.attemptLaserShot(dir))
    {
        this.roll.charge();
        return;
    }
    if(newPositionKey in Game.map)
    {
        var entitiesAtPosition = Game.getEntitiesAtPosition(newX, newY);
        if(entitiesAtPosition.length > 0)
        {
            // check to see if we can melee the enemy on the cell
            for (var i = 0; i < entitiesAtPosition.length; i++) {
                if(entitiesAtPosition[i].onMelee){
                    entitiesAtPosition[i].onMelee();
                    this.laser.charge();
                    this.roll.charge();
                    this.endTurn();
                    return true;
                }
            }
            entitiesAtPosition = Game.getEntitiesAtPosition(newX, newY);
            var allPassable = true;
            for (var i = 0; i < entitiesAtPosition.length; i++) {
                if(entitiesAtPosition[i].passable)
                    continue;
                else
                    allPassable = false;
            }
            if(!allPassable)
                return false;
        }
        if(Game.map[newPositionKey].envDef.passable){

            this.laser.charge();
            this.roll.charge();
            this.setPosition(this.getX()+dir[0], this.getY()+dir[1]);
            this.endTurn();
        }
    }
}
Player.prototype.handleKeyEvent = function(e)
{
    var movementMap = {};
    // support wasd keys?
    // I think the more roguelike way to do it would be to have a key to target next
    // visible enemy
    // also that gets around my problem of not being able to dev with dvorak
    movementMap[38] = 0;
    movementMap[39] = 1;
    movementMap[40] = 2;
    movementMap[37] = 3;
    var code = e.keyCode;
    if(code == 49)
    {
        // are we attempting to roll
        if(this.roll.isChargeReady())
            this.rolling = !this.rolling;
    }else if(code in movementMap)
    {
        this.handleMovement(ROT.DIRS[4][movementMap[code]]);
    }
}

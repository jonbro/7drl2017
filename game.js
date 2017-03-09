/*
TODO:
x shooting enemy
x enemy attacks
x enemy movement?
x room entrance / exit
x laser recharge
x lunge spells
- two gun types (laser / kinetic)
- kinetic reload
- windows smashable with kinetic / lunge spell
- enemy shooter attack
- visibility
- destructible terrain
- room types
- room decoration
- room subdivision
- office placement (place rect within room)
- boundary walls
- soundtrack
- sound effects
BUGS:
- player can move on top of enemy (should do a melee attack?)
- should be able to roll into the level exit

CURRENT LOC: 694
`cloc . --not-match-f=rot.js`

_the ship is infested and the crew is dead. reactivate the power core and get to the shuttle_
*/


// original map gen stuff
// this all sucks!
// should replace with sensible map layout something
// for (var i=0;i<Game.mapSize;i++) {
//     var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
//     var key = freeCells.splice(index, 1)[0];
//     this._setMapToTileType(key, 'wall');
//     this._generateColorOffsetsForCell(this.map[key]);
// }
// for (var i=0;i<Game.mapSize;i++) {
//     var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
//     var key = freeCells.splice(index, 1)[0];
//     this._setMapToTileType(key, 'window');
//     this._generateColorOffsetsForCell(this.map[key]);
// }
// for (var i=0;i<120;i++) {
//     var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
//     var key = freeCells.splice(index, 1)[0];
//     this._setMapToTileType(key, 'plant');
//     this._generateColorOffsetsForCell(this.map[key]);
// }

ROT.Map.BSP = function(width, height, options)
{
    ROT.Map.Dungeon.call(this, width, height);
    this._options = {
        roomWidth: [3, 9], /* room minimum and maximum width */
        roomHeight: [3, 5], /* room minimum and maximum height */
        roomDugPercentage: 0.1, /* we stop after this percentage of level area has been dug out by rooms */
        timeLimit: 1000 /* we stop after this much time has passed (msec) */
    }
    for (var p in options) { this._options[p] = options[p]; }
}
ROT.Map.BSP.extend(ROT.Map.Dungeon);
ROT.Map.BSP.prototype.create = function(callback)
{
    var rootNode = new this.Node(new this.Rect(0,0,this._width,this._height));
    var toDivide = [];
    var toCorridor = []
    var leafNodes = [];
    toDivide.push(rootNode);
    while(toDivide.length > 0)
    {
        var currentLeaf = toDivide.pop();
        if(currentLeaf._rect._w < this._options.roomWidth[1]
            || currentLeaf._rect._h < this._options.roomHeight[1])
        {
            leafNodes.push(currentLeaf);
        }else{
            currentLeaf.split();
            toCorridor.push(currentLeaf);
            if(currentLeaf._children.length > 0)
            {
                for(var i=0;i<2;i++){
                    toDivide.push(currentLeaf._children[i]);
                }
            }
        }
    }
    this._map = this._fillMap(1);
    while(leafNodes.length > 0)
    {
        var currentLeaf = leafNodes.pop();
        console.log(currentLeaf._rect);
        currentLeaf._rect.shrinkRandom();
        for (var x = currentLeaf._rect._x; x < currentLeaf._rect._x+currentLeaf._rect._w; x++) {
            for (var y = currentLeaf._rect._y; y < currentLeaf._rect._y+currentLeaf._rect._h; y++) {
                this._map[x][y] = 0;
            }
        }
    }
    // try and use the pathfinding code
    // just pick and random room within the current node, then starting from an edge
    // move out to the nearest room
    while(toCorridor.length > 0)
    {

        // this code is all bad :(
        var currentPair = toCorridor.pop();
        if(currentPair._splitHorizontal)
        {
            let lowX = Math.max(currentPair._children[0]._rect._x, currentPair._children[1]._rect._x);
            let highX = Math.min(currentPair._children[0]._rect.getRight(), currentPair._children[1]._rect.getRight());
            let corridorPosition = Math.floor(ROT.RNG.getUniform()*(highX-lowX))+lowX;
            console.log('adding corridor', corridorPosition, currentPair._children[0]._rect.getBottom(),currentPair._children[1]._rect._y);
            for (var y = currentPair._children[0]._rect.getBottom(); y <= currentPair._children[1]._rect._y; y++) {
                console.log('digging', currentPair, corridorPosition, y);
                this._map[corridorPosition][y] = 0;
            }
        }
        if(!currentPair._splitHorizontal)
        {
            let lowX = Math.max(currentPair._children[0]._rect._y, currentPair._children[1]._rect._y);
            let highX = Math.min(currentPair._children[0]._rect.getBottom(), currentPair._children[1]._rect.getBottom());
            let corridorPosition = Math.floor(ROT.RNG.getUniform()*(highX-lowX))+lowX;
            for (var y = currentPair._children[0]._rect.getRight(); y <= currentPair._children[1]._rect._x; y++) {
                console.log('digging', currentPair,y,corridorPosition);
                this._map[y][corridorPosition] = 0;
            }
        }
    }
    if (callback) {
        for (var i=0;i<this._width;i++) {
            for (var j=0;j<this._height;j++) {
                callback(i, j, this._map[i][j]);
            }
        }
    }
}
ROT.Map.BSP.prototype.Rect = function(x,y,w,h)
{
    this._x = x;
    this._y = y;
    this._w = w;
    this._h = h;
}
ROT.Map.BSP.prototype.Rect.prototype.getRight = function()
{
    return this._x+this._w;
}
ROT.Map.BSP.prototype.Rect.prototype.getBottom = function()
{
    return this._x+this._w;
}
ROT.Map.BSP.prototype.Rect.prototype.split = function(splitPosition, horizontal)
{
    console.log(splitPosition, horizontal, this);
    if(horizontal)
    {
        if(splitPosition >= this._h)
        {
            return false;
        }
        return [
            new ROT.Map.BSP.prototype.Rect(this._x, this._y, this._w, splitPosition),
            new ROT.Map.BSP.prototype.Rect(this._x, this._y+splitPosition, this._w, this._h-splitPosition)
        ];
    }else{
        if(splitPosition >= this._w)
        {
            return false;
        }
        return [
            new ROT.Map.BSP.prototype.Rect(this._x, this._y, splitPosition, this._h),
            new ROT.Map.BSP.prototype.Rect(this._x+splitPosition, this._y, this._w-splitPosition, this._h)
        ];
    }
}
ROT.Map.BSP.prototype.Rect.prototype.shrink = function(x1, y1, x2, y2)
{
    this._x += x1;
    this._y += y1;
    this._w -= x2+x1;
    this._h -= y2+y1;
}
ROT.Map.BSP.prototype.Rect.prototype.shrinkRandom = function()
{
    var shrinkAmount = .25;
    var minShrink = 0;
    // this.shrink(1,1,1,1);
    this.shrink(Math.max(minShrink, Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._w)),
        Math.max(minShrink, Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._h)),
        Math.max(minShrink, Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._w)),
        Math.max(minShrink, Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._h)));
}
ROT.Map.BSP.prototype.Node = function(rect)
{
    this._rect = rect;
    this._children = [];
    this._splitHorizontal = true;
}
ROT.Map.BSP.prototype.Node.prototype.split = function()
{
    var horizontal = ROT.RNG.getUniform()>0.5;
    this._splitHorizontal = horizontal;
    var scaledRNG = ROT.RNG.getUniform()*2-1;
    var horizontalMid = Math.floor(this._rect._h*0.5)+Math.floor(this._rect._h*.5*.2*scaledRNG); // .2 is the amount of variation
    var verticalMid = Math.floor(this._rect._w*0.5)+Math.floor(this._rect._w*.5*.2*scaledRNG); // .2 is the amount of variation;
    var splitPosition = horizontal?horizontalMid:verticalMid;
    this._children = this._rect.split(splitPosition, horizontal);
    if(!this._children)
    {
        this._children = [];
    }else{
        this._children = [
            new ROT.Map.BSP.prototype.Node(this._children[0]),
            new ROT.Map.BSP.prototype.Node(this._children[1])
        ];
    }
}

var tileSet;
var Game = {
    scheduler: null,
    display: null,
    drawable: [],
    map: {},
    mapSize: 15,
    entities: [],
    init: function() {
        this.scheduler = new ROT.Scheduler.Simple();
        this.engine = new ROT.Engine(this.scheduler);
        this.display = new ROT.Display({
            layout: "tile",
            tileWidth: 32,
            tileHeight: 32,
            tileSet: tileSet,
            tileColorize:true,
            tileMap: {
                "@": [0, 0],
                "e": [32, 0],
                
                ".": [64, 0],
                ",": [64, 32],
                "f": [64, 64],
                "_": [64, 96],

                "#": [128, 0],
                "=": [128, 32],
                "|": [7*32, 0],
                "-": [7*32, 32],
                "p": [96, 0],
                "⌠": [96, 32],
                "<": [6*32, 0],
                ">": [6*32, 0]
            },
            forceSquareRatio: true,
            width: 30,
            height: this.mapSize,
            fontSize: 20
        });
        this.huddisplay = new ROT.Display({
            fontSize:16,
            fontFamily:'Helvetica',
            width: 30
        })
        document.getElementById('mainDisplay').appendChild(this.display.getContainer());
        document.getElementById('hudDisplay').appendChild(this.huddisplay.getContainer());
        this._generateMap();
        this.engine.start();
        window.requestAnimationFrame(redraw);
    },
    _generateHydroponics: function() {
        // add decoration
        for (var x = 1; x < this.mapSize; x+=5) {
            for (var y = 2; y < this.mapSize; y+=5) {
                if(ROT.RNG.getUniform()>.75)
                {
                    this._addRectToMap(x-1,y-1,2+2,1+2,true,'window');
                }
                this._addRectToMap(x,y,2,1,true,'plant');
            }
        }
    },
    _generateMap: function() {
        var freeCells = [];
        var game = this;
        var mapGen = new ROT.Map.BSP(this.mapSize, this.mapSize,{
            roomWidth: [8, 10], /* room minimum and maximum width */
            roomHeight: [8, 10], /* room minimum and maximum height */
            corridorLength: [3, 7], /* corridor minimum and maximum length */
            roomDugPercentage: 0.82, /* we stop after this percentage of level area has been dug out */
            timeLimit: 1000 /* we stop after this much time has passed (msec) */
        });
        mapGen.create(function(x,y,value){
            if(value == 0){
                game._setMapToTileType(game.getKey(x,y), 'floor');
                game._generateColorOffsetsForCell(game.map[game.getKey(x,y)]);
                freeCells.push(game.getKey(x,y));
            }else{
                game._setMapToTileType(game.getKey(x,y), 'wall');
                game._generateColorOffsetsForCell(game.map[game.getKey(x,y)]);
            }
        });
        // for (var x = 0; x < this.mapSize; x++) {
        //     for (var y = 0; y < this.mapSize; y++) {
        //         this._setMapToTileType(this.getKey(x,y), 'floor');
        //         this._generateColorOffsetsForCell(this.map[this.getKey(x,y)]);
        //         freeCells.push(this.getKey(x,y));
        //     }
        // }

        this._generateHydroponics();

        // add entrance tile
        var entranceY = Math.floor(ROT.RNG.getUniform() * this.mapSize);
        this._setMapToTileType(this.getKey(0,entranceY), 'entrance');

        // add exit tile
        var exitY = Math.floor(ROT.RNG.getUniform() * this.mapSize);
        this._setMapToTileType(this.getKey(this.mapSize-1,exitY), 'exit');
        var enemies = [];
        for (var i = 0; i < 6; i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            let xy = this._keyToXY(key);
            var e = new Enemy(xy[0], xy[1]);
            this.drawable.push(e);
            this.entities.push(e);
            this.scheduler.add(e, true);
        }

        if(this.player == null){
            this.player = new Player(0,entranceY);
        }else{
            this.player.setPosition(0,entranceY);
        }
        this.drawable.push(this.player);
        this.scheduler.add(this.player, true);
        this.drawable.push(new Hud());
    },
    _addRectToMap: function(_x,_y,w,h,filled,tileKey)
    {
        for (var x = _x; x < _x+w; x++) {
            for (var y = _y; y < _y+h; y++) {
                this._setMapToTileType(this.getKey(x,y), tileKey);
                this._generateColorOffsetsForCell(this.map[this.getKey(x,y)]);
            }
        }
    },
    _setMapToTileType: function(positionKey, tileKey)
    {
        var noise = new ROT.Noise.Simplex();
        var xy = this._keyToXY(positionKey);
        this.map[positionKey] = {key:tileKey, colorOffset: noise.get(xy[0]/5,xy[1]/5)*0.3};
        this.map[positionKey].envDef = ENVDEFS[tileKey];
        this.map[positionKey].char = ENVDEFS[tileKey].char;
        if(this.map[positionKey].char.constructor === Array)
        {
            this.map[positionKey].char = this.map[positionKey].char[Math.floor(ROT.RNG.getUniform() * this.map[positionKey].char.length)]
        }
    },
    _keyToXY: function(key)
    {
        var xy = key.split(',');
        xy[0] = parseInt(xy[0]);
        xy[1] = parseInt(xy[1]);
        return xy;
    },
    _generateColorOffsetsForCell: function(cell)
    {
        var envDef = cell.envDef;
        var fgColorHSL = ROT.Color.rgb2hsl(ROT.Color.fromString(envDef.fgColor));
        fgColorHSL[2]+=cell.colorOffset*.1;
        var bgColorHSL = ROT.Color.rgb2hsl(ROT.Color.fromString(envDef.bgColor));
        // bgColorHSL[2]+=cell.colorOffset*.1;
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
                this.display.draw(x,y,cell.char,cell.fgColor||envDef.fgColor,cell.bgColor||envDef.bgColor);
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
    nextLevel: function()
    {
        this.drawable = [];
        this.entities = [];
        this.map = {};
        this.scheduler.clear();
        this._generateMap();
    },
    gameOver: function()
    {
        this.player = null;
        this.nextLevel();
    },
}
var redraw = function(timestamp)
{
    Game.draw();
    window.requestAnimationFrame(redraw)
}
document.addEventListener('DOMContentLoaded', function() {
    tileSet = document.createElement("img");
    tileSet.src = "tilemap.png";
    tileSet.onload = function() {
        Game.init();
    }
}, false);


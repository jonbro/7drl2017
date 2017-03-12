/*
TODO:
- pickup types
- acid floor
- double move enemy
- enemy with extra hp
- full shot enemy
- two gun types (laser / kinetic)
- kinetic reload
- spawner boxes
- room types
- room decoration
- visibility
- beam display
- item pickups
- destructible terrain
- soundtrack
- sound effects

FOR RELEASE:
- not enough depth
- action log
- sound music and sfx
- shot effects

BUGS:
- enemies shouldn't block other enemies pathing to player 
- check on either side of window for floor before generating window
CURRENT LOC: 1044
`cloc . --not-match-f=rot.js`

_the ship is infested and the crew is dead. reactivate the power core and get to the shuttle_
*/

var tileSet;
var Game = {
    scheduler: null,
    display: null,
    drawable: [],
    map: {},
    mapSize: 15,
    currentLevel: 1,
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
                "@": [0, 0], // player
                
                "e": [32, 0], // basic enemy
                "S": [32, 128], // spitter moving
                "s": [32, 160], // spitter ready to spit

                'â':[64, 128],
                'ä':[64, 128+32],
                'à':[64, 128+32*2],
                'å':[64, 128+32*3],

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
                this._addRectToMap(x,y,2,1,true,'plant');
            }
        }
    },
    _generateMap: function() {
        var freeCells = [];
        var game = this;
        var mapGen = new ROT.Map.BSP(this.mapSize-2, this.mapSize-2,{
            roomWidth: [8, 10], /* room minimum and maximum width */
            roomHeight: [8, 10], /* room minimum and maximum height */
            corridorLength: [3, 7], /* corridor minimum and maximum length */
            roomDugPercentage: 0.82, /* we stop after this percentage of level area has been dug out */
            timeLimit: 1000 /* we stop after this much time has passed (msec) */
        });
        this._addRectToMap(0,0,this.mapSize, this.mapSize, false, 'wall');
        mapGen.create(function(x,y,value){
            x+=1;
            y+=1;
            if(value == 0){
                game._setMapToTileType(game.getKey(x,y), 'floor');
                game._generateColorOffsetsForCell(game.map[game.getKey(x,y)]);
                freeCells.push(game.getKey(x,y));
            }else{
                game._setMapToTileType(game.getKey(x,y), 'wall');
                game._generateColorOffsetsForCell(game.map[game.getKey(x,y)]);
            }
        });
        // this._generateHydroponics();
        var rooms = mapGen.getRooms();
        var leftRoom = null;
        var rightRoom = null;
        for (var i = 0; i < rooms.length; i++) {
            if(leftRoom == null || leftRoom.getLeft() > rooms[i].getLeft())
                leftRoom = rooms[i];
            if(rightRoom == null || rightRoom.getRight() < rooms[i].getRight())
                rightRoom = rooms[i];
        }
        this._placeWindowsOnSharedWalls(rooms);
        // add entrance tile
        var entranceY = ROT.RNG.getUniformInt(leftRoom.getTop()+2, leftRoom.getBottom());
        var entranceX = leftRoom.getLeft();
        this._setMapToTileType(this.getKey(entranceX,entranceY), 'entrance');

        var exitY = ROT.RNG.getUniformInt(rightRoom.getTop()+2, rightRoom.getBottom());
        var exitX = rightRoom.getRight()+1;
        this._setMapToTileType(this.getKey(exitX,exitY), 'exit');

        // check passable from entrance to exit
        var astar = new ROT.Path.AStar(entranceX, entranceY, function(x,y){
            var pathKey = Game.getKey(x,y);
            var entities = Game.getEntitiesAtPosition(x,y);
            var allPassable = true;
            return pathKey in Game.map && Game.map[pathKey].envDef.passable && allPassable;
        }, {topology: 4});

        /* compute from given coords #1 */
        var foundEnd = false;
        astar.compute(exitX, exitY, function(x,y){
            foundEnd = true;
        });
        if(!foundEnd)
            this._generateMap();

        if(this.player == null){
            this.player = new Player(entranceX,entranceY);
        }else{
            this.player.setPosition(entranceX,entranceY);
        }
        this.drawable.push(this.player);
        this.scheduler.add(this.player, true);

        var enemies = [];
        var maxAttempts = 30;
        for (var i = 0; i < 6; i++) {
            maxAttempts--;
            if(maxAttempts==0)
                break;
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            let xy = this._keyToXY(key);
            var e = new Enemy(xy[0], xy[1]);
            if(ROT.RNG.getUniform() > 0.5)
                e = new EnemySpitter(xy[0], xy[1]);
            if(e.isVisibleByPlayer())
            {
                i--;
                continue;
            }
            this.drawable.push(e);
            this.entities.push(e);
            this.scheduler.add(e, true);
        }

        this.drawable.push(new Hud());
    },
    _placeWindowsOnSharedWalls: function(rooms)
    {
        for (var i = 0; i < rooms.length; i++) {
            for (var j = 0; j < rooms.length; j++) {
                if(i!=j)
                {
                    var topRoom = i;
                    var bottomRoom = j;
                    var leftRoom = i;
                    var rightRoom = j;

                    if(rooms[i].getTop() > rooms[j].getTop())
                    {
                        topRoom = j;
                        bottomRoom = i;
                    }
                    if(rooms[i].getLeft() > rooms[j].getRight())
                    {
                        leftRoom = j;
                        rightRoom = i;
                    }
                    
                    if(rooms[topRoom].getBottom()+1 == rooms[bottomRoom].getTop())
                    {
                        var leftSide = Math.max(rooms[topRoom].getLeft(), rooms[bottomRoom].getLeft());
                        var rightSide = Math.min(rooms[topRoom].getRight(), rooms[bottomRoom].getRight());
                        for(var x = leftSide; x < rightSide; x++)
                        {
                            var key = this.getKey(x+1,rooms[topRoom].getBottom()+1);
                            if(this.map[key].key == 'wall'){
                                this._setMapToTileType(key, 'floor');
                                var e = new Window(x+1,rooms[topRoom].getBottom()+1);
                                this.drawable.push(e);
                                this.entities.push(e);

                            }
                        }
                    }
                    if(rooms[leftRoom].getRight()+1 == rooms[rightRoom].getLeft())
                    {
                        var topSide = Math.max(rooms[leftRoom].getTop(), rooms[rightRoom].getTop());
                        var bottomSide = Math.min(rooms[leftRoom].getBottom(), rooms[rightRoom].getBottom());
                        for(var y = topSide; y < bottomSide; y++)
                        {
                            var key = this.getKey(rooms[leftRoom].getRight()+1, y+1);
                            if(this.map[key].key == 'wall'){
                                this._setMapToTileType(key, 'floor');
                                var e = new Window(rooms[leftRoom].getRight()+1, y+1);
                                this.drawable.push(e);
                                this.entities.push(e);
                            }
                        }
                    }

                }
            }
        }
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
        if(this.currentLevel == 9)
            return this.gameWin();
        this.drawable = [];
        this.entities = [];
        this.map = {};
        this.currentLevel++;
        this.scheduler.clear();
        this._generateMap();
    },
    gameOver: function()
    {
        this.scheduler.clear();
        this.scheduler.add(new RestartListener(0,0));
        this.currentLevel = 0;
        this.gameHasBeenLost = true;
    },
    gameWin: function()
    {
        this.scheduler.clear();
        this.scheduler.add(new RestartListener(0,0));
        this.currentLevel = 0;
        this.gameHasBeenWon = true;
    },
    restart: function()
    {
        this.gameHasBeenWon = false;
        this.gameHasBeenLost = false;
        this.player = null;
        this.currentLevel = 0;
        this.nextLevel();
    }
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


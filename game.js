/*
TODO:
x shooting enemy
x enemy attacks
x enemy movement?
x room entrance / exit
x laser recharge
x lunge spells
x room subdivision
- generate windows between rooms that share wall
- windows smashable with kinetic / lunge spell
- room types
- room decoration
- two gun types (laser / kinetic)
- kinetic reload
- enemy shooter attack
- visibility
- destructible terrain
- office placement (place rect within room)
- boundary walls
- soundtrack
- sound effects
BUGS:
- player can move on top of enemy (should do a melee attack?)
- should be able to roll into the level exit

CURRENT LOC: 768
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
                // if(ROT.RNG.getUniform()>.75)
                // {
                //     this._addRectToMap(x-1,y-1,2+2,1+2,true,'window');
                // }
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
        // add entrance tile
        var entranceY = ROT.RNG.getUniformInt(leftRoom.getTop()+1, leftRoom.getBottom()-1);
        var entranceX = leftRoom.getLeft();
        this._setMapToTileType(this.getKey(entranceX,entranceY), 'entrance');

        var exitY = ROT.RNG.getUniformInt(rightRoom.getTop()+1, rightRoom.getBottom()-1);
        var exitX = rightRoom.getRight()+1;
        this._setMapToTileType(this.getKey(exitX,exitY), 'exit');


        // add exit tile
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
            this.player = new Player(entranceX,entranceY);
        }else{
            this.player.setPosition(entranceX,entranceY);
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


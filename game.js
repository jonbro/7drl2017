/*
TODO:
x shooting enemy
x enemy attacks
x enemy movement?
x room entrance / exit
x laser recharge
- two gun types (laser / kinetic)
- kinetic reload
- windows smashable with kinetic / lunge spell
- lunge spells
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
*/
var tileSet;
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
                "|": [7*32, 0],
                "p": [96, 0],
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
    _generateMap: function() {
        var freeCells = [];
        for (var x = 0; x < this.mapSize; x++) {
            for (var y = 0; y < this.mapSize; y++) {
                this._setMapToTileType(this.getKey(x,y), 'floor');
                this._generateColorOffsetsForCell(this.map[this.getKey(x,y)]);
                freeCells.push(this.getKey(x,y));
            }
        }
        // this all sucks!
        // should replace with sensible map layout something
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this._setMapToTileType(key, 'wall');
            this._generateColorOffsetsForCell(this.map[key]);
        }
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this._setMapToTileType(key, 'window');
            this._generateColorOffsetsForCell(this.map[key]);
        }
        for (var i=0;i<Game.mapSize;i++) {
            var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            var key = freeCells.splice(index, 1)[0];
            this._setMapToTileType(key, 'plant');
            this._generateColorOffsetsForCell(this.map[key]);
        }
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


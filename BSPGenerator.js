/*
TODO:
- make it so the room size ratio can't be too small, i.e. you get squarish rooms
    rather than tall and skinny ones
- properly link the rooms
*/
ROT.Map.BSP = function(width, height, options)
{
    ROT.Map.Dungeon.call(this, width, height);
    this._options = {
        roomWidth: [3, 7], /* room minimum and maximum width */
        roomHeight: [3, 7], /* room minimum and maximum height */
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
        if(currentLeaf._rect._w <= this._options.roomWidth[1]
            && currentLeaf._rect._h <= this._options.roomHeight[1])
        {
            leafNodes.push(currentLeaf);
        }else{
            currentLeaf.split();
            if(currentLeaf._children.length > 0)
            {
                toCorridor.push(currentLeaf);
                for(var i=0;i<2;i++){
                    toDivide.push(currentLeaf._children[i]);
                }
            }else{
                leafNodes.push(currentLeaf);
            }
        }
    }
    this._map = this._fillMap(1);
    while(leafNodes.length > 0)
    {
        var currentLeaf = leafNodes.pop();
        currentLeaf._rect.shrinkRandom();
        var room = new ROT.Map.Feature.Room(currentLeaf._rect._x, currentLeaf._rect._y, currentLeaf._rect._x+currentLeaf._rect._w, currentLeaf._rect._y+currentLeaf._rect._h);
        this._rooms.push(room);

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

        var left = currentPair._children[0].getLeaf()._rect;
        // given a room, it should attempt to find the closest feature
        // either room or corridor in the other half of the binary tree
        var right = currentPair._children[1].getLeaf()._rect;
        if(left.isOverlapAxisHorizontal(right))
        {
            var yMin = Math.max(left._y, right._y);
            var yMax = Math.min(left._y+left._h, right._y+right._h);
            var corridorPosition = ROT.RNG.getUniformInt(yMin, yMax);
            var xMin = Math.min(left.getCenter()[0], right.getCenter()[0]);
            var xMax = Math.max(left.getCenter()[0], right.getCenter()[0]);
            this._digLine(xMin, corridorPosition, xMax, corridorPosition);
        }else{
            var xMin = Math.max(left._x, right._x);
            var xMax = Math.min(left._x+left._w, right._x+right._w);
            var corridorPosition = ROT.RNG.getUniformInt(xMin, xMax);
            var yMin = Math.min(left.getCenter()[1], right.getCenter()[1]);
            var yMax = Math.max(left.getCenter()[1], right.getCenter()[1]);

            this._digLine(corridorPosition, yMin, corridorPosition, yMax);
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
ROT.Map.BSP.prototype._digLine = function(x1, y1, x2, y2)
{
    if(x1 == x2)
    {
        for (var j=y1;j<y2;j++) {
            if(x1 >= 0 && x1 < this._width && j >= 0 && j < this._height)
                this._map[x1][j] = 0;
        }
    }else{
        for (var i=x1;i<x2;i++) {
            if(i >= 0 && i < this._width && y1 >= 0 && y1 < this._height)
                this._map[i][y1] = 0;
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
ROT.Map.BSP.prototype.Rect.prototype.getCenter = function()
{
    return [
        Math.floor(this._w/2)+this._x,
        Math.floor(this._h/2)+this._y
    ];
}
ROT.Map.BSP.prototype.Rect.prototype.splitRandom = function(depth)
{
    if(depth>20){
        return false;
    }
    var horizontal = ROT.RNG.getUniform()>0.5;
    this._splitHorizontal = horizontal;
    var scaledRNG = ROT.RNG.getUniform()*2-1;
    var horizontalMid = Math.floor(this._h*0.5)+Math.floor(this._h*.5*scaledRNG); // .2 is the amount of variation
    var verticalMid = Math.floor(this._w*0.5)+Math.floor(this._w*.5*scaledRNG); // .2 is the amount of variation;
    var splitPosition = horizontal?horizontalMid:verticalMid;
    return this.split(splitPosition, horizontal,depth);
}

ROT.Map.BSP.prototype.Rect.prototype.split = function(splitPosition, horizontal,depth)
{
    var H_RATIO = .45;
    var W_RATIO = .45;
    if(horizontal)
    {
        if(splitPosition >= this._h)
        {
            return false;
        }
        var res = [
            new ROT.Map.BSP.prototype.Rect(this._x, this._y, this._w, splitPosition),
            new ROT.Map.BSP.prototype.Rect(this._x, this._y+splitPosition, this._w, this._h-splitPosition)
        ];
        var r1_h_ratio = res[0]._h / res[0]._w
        var r2_h_ratio = res[1]._h / res[1]._w
        if (r1_h_ratio < H_RATIO || r2_h_ratio < H_RATIO) {
            return this.splitRandom(depth+1);
        }
        return res;
    }else{
        if(splitPosition >= this._w)
        {
            return false;
        }
        var res =  [
            new ROT.Map.BSP.prototype.Rect(this._x, this._y, splitPosition, this._h),
            new ROT.Map.BSP.prototype.Rect(this._x+splitPosition, this._y, this._w-splitPosition, this._h)
        ];
        var r1_w_ratio = res[0]._w / res[0]._h;
        var r2_w_ratio = res[1]._w / res[1]._h;
        if (r1_w_ratio < W_RATIO || r2_w_ratio < W_RATIO) {
            return this.splitRandom(depth+1);
        }
        return res;
    }
}
ROT.Map.BSP.prototype.Rect.prototype.shrink = function(x1, y1, x2, y2,minWidth,minHeight)
{
    x1 = x1.clamp(0,1);
    x2 = x2.clamp(0,1);
    y1 = y1.clamp(0,1);
    y2 = y2.clamp(0,1);
    this._x += x1;
    this._y += y1;
    this._w = Math.max(minWidth, this._w-x2-x1);
    this._h = Math.max(minHeight, this._h-y2-y1);
}
ROT.Map.BSP.prototype.Rect.prototype.shrinkRandom = function()
{
    var shrinkAmount =.3;
    // this.shrink(1,1,1,1);
    this.shrink(Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._w),
        Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._h),
        Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._w),
        Math.floor(ROT.RNG.getUniform()*shrinkAmount*this._h),3,3);
}
ROT.Map.BSP.prototype.Rect.prototype.isOverlapAxisHorizontal = function(rect)
{
    return (rect._y + rect._h > this._y) && (rect._y < this._y+this._h);
}
ROT.Map.BSP.prototype.Node = function(rect)
{
    this._rect = rect;
    this._children = [];
    this._splitHorizontal = true;
}
ROT.Map.BSP.prototype.Node.prototype.getLeaf = function()
{
    var current = this;
    while(current._children.length > 0)
    {
        current = ROT.RNG.getUniform()>0.5?current._children[0]:current._children[1];
    }
    return current;
}
ROT.Map.BSP.prototype.Node.prototype.split = function()
{
    this._children = this._rect.splitRandom(0);
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
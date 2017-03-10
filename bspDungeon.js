var Game = {
    display: null,

    init: function() {
        var map = new ROT.Map.BSP();
        this.display = new ROT.Display({fontSize:8});
        document.body.appendChild(this.display.getContainer());
        map.create(this.display.DEBUG);
    },
}

class Terrain {
    static getProperties(type) {
        const properties = Terrain.TYPES[type];

        if (!properties) {
            throw new Error(`Tipo de terreno inválido: ${type}`);
        }

        return properties;
    }

    static getCost(type) {
        return Terrain.getProperties(type).cost;
    }

    static getSpeedMultiplier(type) {
        return Terrain.getProperties(type).speedMultiplier;
    }

    static isWalkable(type) {
        return Terrain.getProperties(type).walkable;
    }

    static getColor(type) {
        return Terrain.getProperties(type).color;
    }
}

Terrain.SAND = "SAND";
Terrain.MUD = "MUD";
Terrain.WATER = "WATER";
Terrain.OBSTACLE = "OBSTACLE";

Terrain.TYPES = Object.freeze({
    SAND: Object.freeze({
        label: "Areia",
        cost: 10,
        speedMultiplier: 1,
        walkable: true,
        color: Object.freeze([224, 196, 126])
    }),
    MUD: Object.freeze({
        label: "Atoleiro",
        cost: 50,
        speedMultiplier: 0.6,
        walkable: true,
        color: Object.freeze([132, 94, 61])
    }),
    WATER: Object.freeze({
        label: "Água",
        cost: 100,
        speedMultiplier: 0.3,
        walkable: true,
        color: Object.freeze([79, 151, 205])
    }),
    OBSTACLE: Object.freeze({
        label: "Obstáculo",
        cost: Infinity,
        speedMultiplier: 0,
        walkable: false,
        color: Object.freeze([55, 55, 55])
    })
});

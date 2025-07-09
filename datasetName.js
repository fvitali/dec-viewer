// Array dei nomi comuni (senza duplicati)
const commonNouns = [
    "apple", "animal", "basket", "bottle", "bridge", "camera", "castle", "candle", "carpet", "cheese",
    "circle", "client", "coffee", "corner", "cotton", "course", "credit", "desert", "dinner", "driver",
    "engine", "family", "flower", "forest", "friend", "garden", "ground", "handle", "island", "jacket",
    "letter", "market", "member", "minute", "office", "orange", "palace", "parent", "people", "person",
    "pillow", "pocket", "police", "rabbit", "record", "region", "result", "ribbon", "rocket", "school",
    "season", "shadow", "silver", "signal", "soccer", "sponge", "square", "street", "studio", "system",
    "target", "tunnel", "travel", "window", "button", "canvas", "desire", "expert", "fusion", "hunger",
    "lawyer", "moment", "nation", "pencil", "planet", "prince", "prison", "reward", "singer", "speech",
    "stable", "stream", "throne", "ticket", "vessel", "victim", "weapon", "writer", "zodiac", "anchor",
    "beacon", "impact", "jungle", "mythic", "relics", "trophy", "vision", "winter", "wonder"
];

// Funzione per calcolare un hash compreso tra 0 e 99
function calculateHash(input) {
    return Array.from(input.toString()) // Converte la stringa in array di caratteri
        .reduce((sum, char) => sum + char.charCodeAt(0), 0) % 100; // Somma i codici ASCII dei caratteri e calcola il modulo 100
}

// Funzione per creare il nome del dataset
function createDatasetName() {
    const now = new Date();

    // Calcola gli hash separati per data, ora e millisecondi
    const dateHash = calculateHash(`${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}`);
    const timeHash = calculateHash(`${now.getHours()}${now.getMinutes()}${now.getSeconds()}`);
    const millisHash = calculateHash(now.getMilliseconds());

    // Ottieni i nomi dall'array dei nomi comuni
    const part1 = commonNouns[dateHash];
    const part2 = commonNouns[timeHash];
    const part3 = commonNouns[millisHash];

    // Ritorna il nome del dataset come stringa
    return `${part1}-${part2}-${part3}`;
}

// Esportazione della funzione per Node.js
module.exports = createDatasetName;

import crypto from 'node:crypto';

export function randomName() {
    return `${pickAny(adjective)}-${pickAny(animals)}-${pickAny(thing)}`
}

function pickAny<T>(animals: Array<T>) {
    return animals[crypto.randomInt(0, animals.length)];
}

const animals = [
    'wombat',
    'alpaca',
    'pliep',
    'roo',
    'kidna',
    'gecko',
    'ant',
    'guppy',
    'husky',
    'tiger',
    'mole',
    'wolf'
]

const adjective = [
    'quick',
    'lazy',
    'big',
    'hungry',
    'escaped',
    'happy',
    'sad',
    'ticklish',
    'funny',
    'slim',
    'fast',
    'bright',
]

const thing = [
    'maschine',
    'coop',
    'label',
    'box',
    'thing',
    'paper',
    'drum',
    'nest',
    'cage',
]

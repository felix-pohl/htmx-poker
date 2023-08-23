import crypto from 'node:crypto';

const animals = [
    'wombat',
    'alpaca',
    'pliep',
    'roo',
    'kidna'
]

const adjective = [
    'quick',
    'lazy',
    'big',
    'hungry',
    'escaped',
    'happy',
    'sad',
    'ticklish'
]

const thing = [
    'maschine',
    'coop',
    'label',
    'box',
    'thing'
]

export function randomName() {
    const rndAnimal = animals[crypto.randomInt(0, animals.length)];
    const rndAdjective = adjective[crypto.randomInt(0, adjective.length)];
    const rndThing = thing[crypto.randomInt(0, thing.length)];
    return `${rndAdjective}-${rndAnimal}-${rndThing}`
}
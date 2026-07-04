import { IncrementLastNumberTransformer, NestLastNumberTransformer } from './transformers';

const config = [
    {
        "id": "squire-increment-last-number",
        "title": "Squire: Increment Last Number",
        "description": "Increments the last number in the title",
        "transformer": IncrementLastNumberTransformer
    },
    {
        "id": "squire-nest-last-number",
        "title": "Squire: Nest Last Number",
        "description": "Nests the last number in the title",
        "transformer": NestLastNumberTransformer
    }
];

export default config;
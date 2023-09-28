import { UUID } from 'crypto';
import { Response } from "express";

export interface Connection {
    id: UUID,
    client: Client,
    response: Response,
}

export interface Client {
    id: string,
    name: string,
    value: number | null | string
}

export interface Session {
    id: string,
    revealed: boolean,
    connections: Connection[],
    clients: Client[],
    name: string
}
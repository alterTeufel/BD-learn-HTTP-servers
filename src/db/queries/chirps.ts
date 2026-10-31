import { asc, eq } from "drizzle-orm";
import { db } from "../index.js";
import { chirps, type NewChirp } from "../schema.js";

export async function createChirp(chirp: NewChirp) {
    const [createdChirp] = await db
        .insert(chirps)
        .values(chirp)
        .returning();

    return createdChirp;
}

export async function getAllChirps() {
    return db
        .select()
        .from(chirps)
        .orderBy(asc(chirps.createdAt));
}

export async function getChirp(chirpId: string) {
    const [chirp] = await db
        .select()
        .from(chirps)
        .where(eq(chirps.id, chirpId));
    
        return chirp;
}
import { db } from "../index.js";
import { users, type NewUser } from "../schema.js";

export async function createUser(user: NewUser) {
    const [createdUser] = await db
        .insert(users)
        .values(user)
        .onConflictDoNothing()
        .returning();

    return createdUser;
}

export async function deleteAllUsers() {
    await db.delete(users);    
}
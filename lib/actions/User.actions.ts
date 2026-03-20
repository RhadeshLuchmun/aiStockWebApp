'use server';

import {connectToDatabase} from "@/DATABASE/mongoose";

export const getAllUsersForNewsEmail = async () => {
    try {
        const mongoose = await connectToDatabase();
        const db = mongoose.connection.db;
        if(!db) throw new Error('Mongoose connection not connected');

        const projection = { _id: 1, id: 1, email: 1, name: 1, country: 1 } as const;

        // Try the Better Auth default collection first
        let users = await db.collection('user').find(
            { email: { $exists: true, $ne: null } },
            { projection }
        ).toArray();

        // Fallback to "users" collection if empty (different setups may use this)
        if (!users || users.length === 0) {
            try {
                users = await db.collection('users').find(
                    { email: { $exists: true, $ne: null } },
                    { projection }
                ).toArray();
            } catch {}
        }

        return users.filter((user) => !!user.email).map((user) => ({
            id: user.id || user._id?.toString() || '',
            email: user.email,
            name: user.name
        }))
    } catch (e) {
        console.error('Error fetching users for news email:', e)
        return []
    }
}

import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email?: string | null, role?: string, displayName?: string) {
  const userRole = (role && ['student', 'admin'].includes(role)) ? role : 'student';
  const safeEmail = (email && email.trim().length > 0) ? email : `${uid}@user.local`;
  
  const values: any = {
    uid,
    email: safeEmail,
    role: userRole,
  };
  if (displayName) values.displayName = displayName;

  const result = await db.insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        ...(email && email.trim().length > 0 ? { email } : {}),
        ...(displayName ? { displayName } : {})
      },
    })
    .returning();

  return result[0];
}

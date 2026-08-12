import { db } from './src/db/index.js';
import { certificateTemplates } from './src/db/schema.js';

async function updateDB() {
  try {
    const templates = await db.select().from(certificateTemplates);
    for (const t of templates) {
      if (t.layoutConfig) {
        const updatedConfig = { ...t.layoutConfig };
        for (const key in updatedConfig) {
          if (updatedConfig[key]) {
            updatedConfig[key].enabled = false;
          }
        }
        await db.update(certificateTemplates)
          .set({ layoutConfig: updatedConfig })
          .where(certificateTemplates.id.equals(t.id)); // Not correct Drizzle syntax
      }
    }
    console.log("DB updated successfully");
  } catch (err) {
    console.error(err);
  }
}
// updateDB(); // actually it's easier to just use standard SQL

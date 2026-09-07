---
description: "Formats SQL migrations for the user. Use this whenever you produce SQL that needs to be run manually (migrations, schema changes, data fixes, grants, policies)."
---

# SQL Output Format

Whenever you write or present SQL that needs to be run manually:

1. **Always put SQL inside a fenced code block** (triple backticks with `sql` language tag).

2. **Always state which database to run it in** — right before the code block, on its own line. Format:

   > **Run in: Supabase Dashboard → [hirejps-portal] → SQL Editor**

3. If there are multiple separate migrations, number them and give each a short title describing what it does.

4. Never dump raw SQL inline in a paragraph. Always a code block.

5. If the SQL creates or alters tables, briefly say what changed in one line above the block.

This applies to all SQL output — migrations, one-off fixes, grants, RLS policies, seed data, everything.

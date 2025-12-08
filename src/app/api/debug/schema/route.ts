// Diagnostic endpoint to check results table schema
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/compat";

export async function GET() {
  const supabase = await createSupabaseServer();

  try {
    // Check indexes
    const { data: indexes, error: indexError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'results'
        AND schemaname = 'public';
      `,
    });

    // Check constraints
    const { data: constraints, error: constraintError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT conname, contype, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'public.results'::regclass;
      `,
    });

    return NextResponse.json({
      indexes: indexes || [],
      indexError,
      constraints: constraints || [],
      constraintError,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      note: "exec_sql function may not exist - need to check Supabase dashboard manually",
    });
  }
}

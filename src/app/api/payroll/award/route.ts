
import { NextResponse } from 'next/server';
import { interpretTimesheet, STANDARD_AWARD_RULES } from '@/lib/payroll/awardEngine';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { records, hourlyRate } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid records' }, { status: 400 });
    }

    const interpretations = records.map((record: any) => ({
      recordId: record.id,
      date: record.date,
      components: interpretTimesheet(record, hourlyRate || 30, STANDARD_AWARD_RULES)
    }));

    // Persist interpretations if needed (optional for this flow, but good for history)
    const database = db.get();
    database.awardInterpretations.push(...interpretations);
    db.save(database);

    return NextResponse.json(interpretations);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

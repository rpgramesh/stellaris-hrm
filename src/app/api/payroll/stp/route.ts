
import { NextResponse } from 'next/server';
import { generatePayEvent, submitToATO } from '@/lib/payroll/stpService';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, payRunId, payslips, event } = body;

    if (action === 'generate') {
      const database = db.get();
      // Get previous events from DB to calculate YTD correctly
      const previousEvents = database.stpEvents || [];
      
      const newEvent = generatePayEvent(payRunId, payslips, previousEvents);
      
      // Save draft to DB
      database.stpEvents.push(newEvent);
      db.save(database);
      
      return NextResponse.json(newEvent);
    } 
    
    if (action === 'submit') {
      if (!event) {
        return NextResponse.json({ error: 'Event data required' }, { status: 400 });
      }
      
      const result = await submitToATO(event);
      
      if (result.success) {
        const database = db.get();
        const index = database.stpEvents.findIndex((e: any) => e.id === event.id);
        if (index !== -1) {
          database.stpEvents[index].status = 'Submitted';
          db.save(database);
        }
      }
      
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const database = db.get();
  return NextResponse.json(database.stpEvents || []);
}

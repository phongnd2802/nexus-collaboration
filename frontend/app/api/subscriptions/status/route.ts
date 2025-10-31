import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { message: 'Subscriptions are disabled' },
    { status: 410 }
  );
}

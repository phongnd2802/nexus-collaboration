import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { message: 'Subscriptions are disabled' },
    { status: 410 }
  );
}

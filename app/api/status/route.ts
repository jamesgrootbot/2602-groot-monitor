import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const statusPath = path.resolve('../../status.json');
    const data = fs.readFileSync(statusPath, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'Could not read status' }, { status: 500 });
  }
}

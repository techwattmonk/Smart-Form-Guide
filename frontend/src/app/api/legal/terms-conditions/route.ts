import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the terms and conditions markdown file from the project root
    const filePath = path.join(process.cwd(), '..', 'terms-conditions.md');
    const content = fs.readFileSync(filePath, 'utf8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading terms and conditions file:', error);
    // Try alternative path
    try {
      const altPath = path.join(process.cwd(), '..', '..', 'terms-conditions.md');
      const content = fs.readFileSync(altPath, 'utf8');
      return NextResponse.json({ content });
    } catch (altError) {
      return NextResponse.json(
        { error: 'Terms and conditions content not found' },
        { status: 404 }
      );
    }
  }
}

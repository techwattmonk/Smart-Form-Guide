import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the privacy policy markdown file from the project root
    // The frontend is in a subdirectory, so we need to go up to the main project root
    const filePath = path.join(process.cwd(), '..', 'privacy-policy.md');
    const content = fs.readFileSync(filePath, 'utf8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading privacy policy file:', error);
    // Try alternative path
    try {
      const altPath = path.join(process.cwd(), '..', '..', 'privacy-policy.md');
      const content = fs.readFileSync(altPath, 'utf8');
      return NextResponse.json({ content });
    } catch (altError) {
      return NextResponse.json(
        { error: 'Privacy policy content not found' },
        { status: 404 }
      );
    }
  }
}

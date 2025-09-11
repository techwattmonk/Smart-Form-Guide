import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Read the EULA markdown file from the project root
    const filePath = path.join(process.cwd(), '..', 'eula-agreement.md');
    const content = fs.readFileSync(filePath, 'utf8');

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading EULA file:', error);
    // Try alternative path
    try {
      const altPath = path.join(process.cwd(), '..', '..', 'eula-agreement.md');
      const content = fs.readFileSync(altPath, 'utf8');
      return NextResponse.json({ content });
    } catch (altError) {
      return NextResponse.json(
        { error: 'EULA content not found' },
        { status: 404 }
      );
    }
  }
}

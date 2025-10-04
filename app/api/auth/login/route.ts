import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const AUTH_PASSPHRASE = process.env.AUTH_PASSPHRASE || 'change-this-passphrase';

export async function POST(request: NextRequest) {
  try {
    const { passphrase } = await request.json();

    if (!passphrase || passphrase !== AUTH_PASSPHRASE) {
      return NextResponse.json(
        { error: 'Invalid passphrase' },
        { status: 401 }
      );
    }

    // Generate JWT token that expires in 24 hours
    const token = jwt.sign(
      { authenticated: true, timestamp: Date.now() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const id = params.id;
    
    // In a real app, this would:
    // 1. Validate that the invoice exists and is in a status where a reminder is appropriate
    // 2. Get the customer's email
    // 3. Send an actual email through a service like Resend, SendGrid, etc.
    // 4. Log that the reminder was sent
    
    // For demo purposes, we'll just simulate success
    
    // Simulate a slight delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json({
      success: true,
      message: `Reminder sent for invoice ${id}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error sending reminder for invoice ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send invoice reminder',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
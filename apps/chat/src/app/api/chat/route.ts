import { handleChatRequest } from '@/lib/server/chat-handler';
import { getProvider } from '@/lib/server/get-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return handleChatRequest(request, getProvider);
}

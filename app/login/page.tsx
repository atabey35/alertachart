import { headers } from 'next/headers';
import DefaultLogin from '@/components/login/DefaultLogin';
import AndroidLogin from '@/components/login/AndroidLogin';
import IOSLogin from '@/components/login/IOSLogin';

export default async function LoginPage() {
  // 🔥 CRITICAL: Server-side platform detection via User-Agent (fallback to X-Platform header)
  const headersList = await headers();
  const userAgent = headersList.get('user-agent')?.toLowerCase() || '';
  const platformHeader = headersList.get('x-platform')?.toLowerCase() || '';
  
  // Detect platform from User-Agent or X-Platform header
  let platform = platformHeader;
  
  if (!platform) {
    if (userAgent.includes('android') || userAgent.includes('wv')) {
      platform = 'android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ios')) {
      platform = 'ios';
    }
  }

  // Render platform-specific login component
  if (platform === 'android') {
    return <AndroidLogin />;
  }

  if (platform === 'ios') {
    return <IOSLogin />;
  }

  // Default: Web or unknown platform
  return <DefaultLogin />;
}

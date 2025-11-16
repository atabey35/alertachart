import { headers } from 'next/headers';
import DefaultLogin from '@/components/login/DefaultLogin';
import AndroidLogin from '@/components/login/AndroidLogin';
import IOSLogin from '@/components/login/IOSLogin';

export default async function LoginPage() {
  // 🔥 CRITICAL: Server-side platform detection via X-Platform header
  const headersList = await headers();
  const platform = headersList.get('x-platform')?.toLowerCase() || '';

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

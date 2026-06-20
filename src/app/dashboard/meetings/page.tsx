import { MeetingsClient } from './meetings-client';

export const metadata = {
  title: '智能晨会 - 三合一管理系统',
};

export default async function MeetingsPage() {
  return <MeetingsClient />;
}

import {notFound} from 'next/navigation';
import {currentAccount} from '@/app/access-auth';
import AdminPanel from './admin-panel';

export default async function AdminPage(){
  const account=await currentAccount();
  if(!account?.admin)notFound();
  return <AdminPanel me={account.teacher.userId}/>;
}

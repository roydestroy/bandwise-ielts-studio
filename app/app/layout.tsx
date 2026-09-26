import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {currentAccount,logoutUrl} from '@/app/access-auth';
import Pending from './pending';

// The studio is private: keep it out of search results and give it its own tab title.
export const metadata:Metadata={
  title:'Workspace | Bandwise',
  robots:{index:false,follow:false},
};

// Signed-out visitors go to the sign-in page; accounts still waiting for approval see a holding page. The API
// routes check the same thing themselves, so this is about where people land, not what they can read.
export default async function StudioLayout({children}:Readonly<{children:React.ReactNode}>){
  const account=await currentAccount();
  if(!account)redirect('/login');
  if(account.status!=='active')return <Pending email={account.teacher.email} suspended={account.status==='suspended'} signOut={logoutUrl(account)}/>;
  return children;
}

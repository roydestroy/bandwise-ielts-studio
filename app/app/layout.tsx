import type {Metadata} from 'next';

// The studio is private: keep it out of search results and give it its own tab title.
export const metadata:Metadata={
  title:'Workspace | Bandwise',
  robots:{index:false,follow:false},
};

export default function StudioLayout({children}:Readonly<{children:React.ReactNode}>){
  return children;
}

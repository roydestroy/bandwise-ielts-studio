// The Bandwise mark, drawn from the same shapes as public/logo/bandwise-logo.svg and the favicon, so the pages,
// the browser tab and the Google sign-in screen all show one logo.
export default function BrandMark({className='brandmark'}:{className?:string}){
  return <svg className={className} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
    <rect width="512" height="512" rx="120" fill="#145e50"/>
    <path fill="#d8f592" fillRule="evenodd" d="M107 98a26 26 0 0 1 26-26h8a26 26 0 0 1 26 26v111.24A118 118 0 1 1 107 312V98Zm118 152a62 62 0 1 0 0 124a62 62 0 0 0 0-124Z"/>
    <circle cx="375" cy="414" r="30" fill="#8cc97e"/>
  </svg>;
}

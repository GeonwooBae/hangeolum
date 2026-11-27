import assets from '../web/embedded';
export const dynamic='force-dynamic';
export function GET(){return new Response(assets['index.html'],{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

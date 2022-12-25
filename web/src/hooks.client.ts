import type { Handle } from '@sveltejs/kit'
import { PUBLIC_COOKIENAME } from '$env/static/public';

export const handle = (async ({ event, resolve }) => {
    const cookie = event.cookies.get(PUBLIC_COOKIENAME);
    console.log(cookie);
    if(cookie) {
        event.locals.user = undefined;
    }
    return await resolve(event);
}) satisfies Handle
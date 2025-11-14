import { getLink } from '@repo/data-ops/queries/links';
import { Hono } from 'hono';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { getDestinationForCountry } from '@/helpers/route-ops';

export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	const id = c.req.param('id');
	const linkInfo = await getLink(id);
	if (!linkInfo) {
		return c.text('Link not found', 404);
	}

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);
	if (!cfHeader.success) {
		return c.text('Invalid Cloudflare headers', 400);
	}

	const headers = cfHeader.data;
	console.log(headers);
	const destination = getDestinationForCountry(linkInfo, headers.country);
	return c.redirect(destination);
});

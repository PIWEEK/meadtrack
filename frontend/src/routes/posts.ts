import type { EndpointOutput } from '@sveltejs/kit';

export async function get(): Promise<EndpointOutput> {
	const res = await fetch('https://api.merrybrew.app/posts');
	const data = await res.json();

	return { body: data };
}

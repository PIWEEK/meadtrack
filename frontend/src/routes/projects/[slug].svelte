<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ page: { params }, fetch }) => {
		// The params object will contain all of the parameters in the route.
		const { slug } = params;

		// Now, we'll fetch the mead projects from Strapi
		const res = await fetch('http://localhost:1337/posts/' + slug);

		// A 404 status means "NOT FOUND"
		if (res.status === 404) {
			// We can create a custom error and return it.
			// SvelteKit will automatically show us an error page that we'll learn to customise later on.
			const error = new Error(`The post with ID ${slug} was not found`);
			return { status: 404, error };
		} else {
			const data = await res.json();
			return { props: { post: data } };
		}
	};
</script>

<script lang="ts">
	import type { Post } from '$lib/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import user from '$lib/user';

	export let post: Post;

	onMount(async () => {
		// Install the marked package first!
		// Run this command: npm i marked

		// We're using this style of importing because "marked" uses require, which won't work when we import it with SvelteKit.
		// Check the "How do I use a client-side only library" in the FAQ: https://kit.svelte.dev/faq
		const marked = (await import('marked')).default;
	});

	async function deletePost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}

		const res = await fetch('http://localhost:1337/posts/' + post.id, {
			method: 'DELETE',
			headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
		});
		if (res.ok) {
			goto('/');
		} else {
			const data: { message: { messages: { message: string }[] }[] } = await res.json();
			if (data?.message?.[0]?.messages?.[0]?.message) {
				alert(data.message[0].messages[0].message);
			}
		}
	}
</script>

<h1 class="text-center text-4xl mt-4">{post.title}</h1>
<p class="text-center mt-2">By: {post.author.username}</p>
<p class="text-center mt-2">Created at: {post.created_at}</p>
<p class="text-center mt-2">Last updated at: {post.updated_at}</p>

<div>

	<p class="text-center mt-2">
		{#if post.values["finished"]}
		This is a finished project
		{:else}
		This is an ongoing project
		{/if}
	</p>



  </div>

  <h1 class="text-center text-4xl mt-4">Recipe</h1>

<p class="text-center mt-2">Main ingredients</p>
<ul class="text-center mt-2">
	
	{#each post.values["recipe"]["main"] as main, idx}

	<li>
		<p>{main.quantity} {main.units} of {main.type}</p>
	</li>

	{/each}

  </ul>
  <p class="text-center mt-2">Secondary ingredients</p>
  <ul class="text-center mt-2">
	
	{#each post.values["recipe"]["secondary"] as secondary, idx}

	<li>
		<p>{secondary}</p>
	</li>

	{/each}

  </ul>

  <p class="text-center mt-2">Conditions: {post.values["recipe"]["conditions"]}</p>
  <p class="text-center mt-2">Expected result: {post.values["recipe"]["result"]}</p>

  <h1 class="text-center text-4xl mt-4">Process</h1>
  <p class="text-center mt-2">Preparation: {post.values["process"]["preparation"]}</p>
  <p class="text-center mt-2">Materials: {post.values["process"]["materials"]}</p>

  <p class="text-center mt-2">Steps</p>
  <ul class="text-center mt-2">
	
	{#each post.values["process"]["steps"] as step, idx}

	<li>
		<p>{step.type} at {step.date}</p>
	</li>

	{/each}

  </ul>

  <p class="text-center mt-2">Measures</p>
  <ul class="text-center mt-2">
	
	{#each post.values["process"]["measures"] as measure, idx}

	<li>
		<p>{measure.data} at {measure.date}</p>
	</li>

	{/each}

  </ul>

  <p class="text-center mt-2">Notes on this project: {post.values["notes"]}</p>

{#if $user && post.author.id === $user.id}
	<p class="my-2 flex justify-center items-center gap-3">
		<button
			class="bg-blue-500 text-white font-bold py-2 px-4 rounded border-transparent"
			on:click={() => goto('/new?edit=' + post.id)}>Update mead project</button
		>
		<button
			class="bg-red-500 text-white font-bold py-2 px-4 rounded border-transparent"
			on:click={deletePost}>Delete mead project</button
		>
	</p>
{/if}


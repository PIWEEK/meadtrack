<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ fetch }) => {
		const res = await fetch('/posts');
		const data = await res.json();

		return { props: { posts: data } };
	};
</script>

<script lang="ts">
	import type { Post } from '$lib/types';
	import { goto } from '$app/navigation';
import { validate_each_argument } from 'svelte/internal';

	export let posts: Post[];
</script>

<div class="my-4">
	<h1 class="text-center text-3xl font-bold">My mead projects</h1>
</div>

<div class="container mx-auto mt-4">
	{#each posts as post}
		<div
			class="hover:bg-gray-200 cursor-pointer px-6 py-2 border-b border-gray-500"
			on:click={() => goto('/projects/' + post.id)}
		>
			<h4 class="font-bold">{post.title}</h4>
			<p class="text-gray-500">By: {post.author.username}</p>
			<p class="text-gray-500">Created at: {post.created_at}</p>
			<p class="text-gray-500">Last updated at: {post.updated_at}</p>
			<p class="text-gray-500">
			{#if post.values["finished"]}
			This is a finished project
			{:else}
			This is an ongoing project
			{/if}
			</p>
		</div>
	{/each}
</div>

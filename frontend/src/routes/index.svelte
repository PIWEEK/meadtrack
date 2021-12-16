<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';
	import user from '$lib/user';
	import Fa from 'svelte-fa'

	import { faBeer, faPlus,  faCalendar, faCalendarAlt, faClock, faUser, faWineGlass, faCertificate} from '@fortawesome/free-solid-svg-icons'
	import { faEye, faEyeSlash, faTrash, faEdit, faClone, faCheck } from '@fortawesome/free-solid-svg-icons'

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
	<h1 class="text-center text-3xl font-bold max-w-md">My mead projects</h1>
</div>

<div class='fixed bottom-0 max-w-md'>
<a href="/new" class="flex float-right font-mono font-serif no-underline mr-3" alt="Create"><Fa icon={faPlus} translateY="-0.5"  size="lg"/><Fa icon={faBeer} translateY="-0.5" size="2x"/></a>
</div>

<div class="container max-w-md mt-4">
	{#each posts as post}
	{#if $user && post.author.id === $user.id}
		<div
			class="p-10 m-10 rounded-xl shadow-lg flex items-center space-x-4 hover:bg-gray-200 cursor-pointer"
			on:click={() => goto('/projects/' + post.id)}
		>
			<h4 class="font-bold">{post.title}</h4>
			<p class="justify-end text-right py-2 px-1 mt-4">
				{#if post.values["finished"]}
				<Fa icon={faCheck} size="lg"/>
				{:else}
				<Fa icon={faCertificate} size="lg" spin />
				{/if}
			</p>
			<p class="justify-end text-right py-2 pr-4 mt-4">
				{#if post.values["public"]}
				<Fa icon={faEye} size="lg"/>
				{:else}
				<Fa icon={faEyeSlash} size="lg"/>
				{/if}
			</p>
		</div>
		{/if}
	{/each}
</div>

<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';
	import user from '$lib/user';
	import Fa from 'svelte-fa'

	import { faBeer, faPlus, faPlusCircle, faCalendar, faCalendarAlt, faClock, faUser, faWineGlass, faCertificate} from '@fortawesome/free-solid-svg-icons'
	import { faEye, faEyeSlash,faHourglassHalf, faTrash, faEdit, faClone, faCheck, faWineBottle, faBacteria } from '@fortawesome/free-solid-svg-icons'

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

{#if !$user}
{ goto('/login/')}
{/if}


<div class="flex flex-col h-screen max-w-4xl">

    <div class="flex-grow">
		<div class="my-4">
			<h1 class="text-center font-serif text-4xl font-bold ">My brew projects</h1>
		</div>
		
		<div class="container  mt-2">
			{#each posts as post}
			{#if $user && post.author.id === $user.id}
				<div class="p-4 container rounded-md shadow-lg space-x-2 hover:bg-gray-200 cursor-pointer" on:click={() => goto('/projects/' + post.id)}>
					

					<div class="flex justify-left">
						<p class="font-bold font-serif text-lg">{post.title}</p>
						<p class="ml-5 mx-1 my-2 mt-2">
							{#if post.values["finished"]}
							<Fa icon={faWineBottle} translateY="0"  size="sm"/>
							{:else}
							<Fa icon={faHourglassHalf} translateY="0" size="sm" spin />
							{/if}
						</p>
						<p class=" mx-0 my-1 mt-1">
							{#if post.values["public"]}
							<Fa icon={faEye} translateY="0.2" size="sm"/>
							{:else}
							<Fa icon={faEyeSlash} translateY="0.2" size="sm"/>
							{/if}
						</p>
						
					</div>
					{#if post.values["description"]}
					<p class="ml-1 italic font-serif text-md">{post.values["description"]}</p>
					{/if}
					<p class="ml-1 mt-3 italic text-xs">Last updated: {post.updated_at.substring(0,10)}</p>
				</div>
				{/if}
			{/each}
		</div>

	</div>
	

	<div class="sticky grid justify-items-end absolute bottom-0 ">
			<div class="pb-14">
			<a href="/new"  alt="Create"><Fa icon={faPlusCircle} color="#333333" translateY="0" translateX="-0.1" size="4x"/></a>
			</div>
		
	</div>
</div>


		


	
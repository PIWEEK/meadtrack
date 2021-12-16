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
	import Chart from 'svelte-frappe-charts';
	import Fa from 'svelte-fa'
	import { faPlus,  faCalendar, faClock, faUser, faEye} from '@fortawesome/free-solid-svg-icons'

	export let post: Post;

	var datay = post.values["process"]["measures"].map(function(x: any[]) {
    	return x["date"];
	});
	var datax = post.values["process"]["measures"].map(function(x: any[]) {
    	return x["data"]-1000;
	});

	let data = {
    	labels: datay, 
		yMarkers: [{ label: "Target Gravity", value: post.values["recipe"]["targetgravity"]-1000, options: { labelPos: "right" } },
		{ label: "", value: 0, }],
    	datasets: [
    	  {
    	    values: datax
    	  },
   	 ],
		//yRegions: [{ label: "", start: 0, end: 1000 }],
  };
	let valuesOverPoints = true;
	let lineOptions = { dotSize: 8};
	let title = "Gravity measurements in excess of 1000";
	let height = 350;
	let colors = ['#000000'];

  	export let basicVisible = true;
	export let stepsVisible = false;
	export let measuresVisible = false;
	export let notesVisible = false;

	onMount(async () => {
		// Install the marked package first!
		// Run this command: npm i marked

		// We're using this style of importing because "marked" uses require, which won't work when we import it with SvelteKit.
		// Check the "How do I use a client-side only library" in the FAQ: https://kit.svelte.dev/faq
		const marked = (await import('marked')).default;
	});


	function showBasic(){
		basicVisible = true;
		stepsVisible = false;
		measuresVisible = false;
		notesVisible = false;

	};

	function showSteps(){
		basicVisible = false;
		stepsVisible = true;
		measuresVisible = false;
		notesVisible = false;

	};

	function showMeasures(){
		basicVisible = false;
		stepsVisible = false;
		measuresVisible = true;
		notesVisible = false;

	};

	function showNotes(){
		basicVisible = false;
		stepsVisible = false;
		measuresVisible = false;
		notesVisible = true;

	};
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
	};

	async function clonePost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}
		let summaryvalues = post.values;
		summaryvalues["process"]["steps"] = [];
		summaryvalues["process"]["measures"] = [];
		summaryvalues["public"] = false;

		const res = await fetch('http://localhost:1337/posts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: 'Bearer ' + localStorage.getItem('token')
			},
			body: JSON.stringify({ title: "Copy of "+post.title, values: summaryvalues })
		});
		if (!res.ok) {
			const data: { message: { messages: { message: string }[] }[] } = await res.json();
			if (data?.message?.[0]?.messages?.[0]?.message) {
				alert(data.message[0].messages[0].message);
			}
		} else {
			const data: Post = await res.json();
			goto('/projects/' + data.id);
		}
	};
</script>

{#if post.values["public"] ||post.author.id === $user.id }

<h1 class="font-serif text-left py-2 px-4 text-4xl mt-4 max-w-md">{post.title}</h1>
{#if post.values["when"]}
<h2 class="text-left py-0 px-4 text-2xl mt-4 max-w-md">[{post.values["when"]}]</h2>
{/if}


<div id="basic" class="{basicVisible ? '' : 'hidden'}">

<div class="shadow-xl py-2 rounded-lg border-2 max-w-md">
	<p class="flex gap-2 text-left py-2 px-4 mt-2"><Fa icon={faUser} size="lg"/>{post.author.username}</p>
<p class="flex gap-2 text-left py-0 px-4 mt-2"><Fa icon={faCalendar} size="lg"/>{post.created_at}</p>
<p class="flex gap-2 text-left py-0 px-4 mt-2"><Fa icon={faClock} size="lg"/>{post.updated_at}</p>

<div>

	<p class="text-left py-0 px-4 mt-2">
		{#if post.values["finished"]}
		This is a finished project
		{:else}
		This is an ongoing project
		{/if}
	</p>
  </div>
  <div>

	<p class="text-left py-0 px-4 mt-2">
		{#if post.values["public"]}
		This is a PUBLIC project
		{:else}
		This is a PRIVATE project
		{/if}
	</p>
  </div>
  </div>

  <div class="shadow-xl rounded-lg max-w-md">
  <h1 class="text-left py-2 px-4 text-4xl mt-4">Recipe</h1>

  <p class="text-left py-2 px-4 text-2xl mt-2">Main ingredients</p>
  <ul class="text-left py-2 px-12 mt-2 list-disc">
	  
	  {#each post.values["recipe"]["main"] as main, idx}
  
	  <li>
		  <p>{main.quantity} {main.units} of {main.type}</p>
	  </li>
  
	  {/each}
  
	</ul>
	<p class="text-left py-2 px-4 text-2xl mt-2">Secondary ingredients</p>
	<ul class="text-left py-2 px-12 mt-2 list-disc ">
	  
	  {#each post.values["recipe"]["secondary"] as secondary, idx}
  
	  <li>
		  <p>{secondary}</p>
	  </li>
  
	  {/each}
  
	</ul>
	</div>
	<div class="shadow-xl rounded-lg max-w-md">
	<p class="text-left py-2 px-4 mt-2">Conditions: {post.values["recipe"]["conditions"]}</p>
	<p class="text-left py-2 px-4 mt-2">Expected result: {post.values["recipe"]["result"]}</p>
	</div>
  

</div>

<div id="steps" class="{stepsVisible ? '' : 'hidden'}">

  <h1 class="text-left py-2 px-4 text-4xl mt-4">Process</h1>
  <p class="text-left py-2 px-4 mt-2">Preparation: {post.values["process"]["preparation"]}</p>
  <p class="text-left py-2 px-4 mt-2">Materials: {post.values["process"]["materials"]}</p>

  <p class="text-left py-2 px-4 mt-2">Steps</p>
  <ul class="text-left py-2 px-4 mt-2">
	
	{#each post.values["process"]["steps"] as step, idx}

	<li>
		<p>{step.type} at {step.date}</p>
	</li>

	{/each}

  </ul>
</div>
<div id="measures" class="{measuresVisible ? '' : 'hidden'}">

  <p class="text-left font-serif font-bold py-2 px-4 mt-2">Target Gravity: {post.values["recipe"]["targetgravity"]}</p>
  <p class="text-left py-2 px-4 mt-2">Measures</p>

  <div class="px-8">
  <table class="table-auto"> 
	<thead>
		<tr>
		  <th>Date</th>
		  <th>Gravity measure</th>
		</tr>
	  </thead>
	  <tbody class="text-right py-2 px-4 mt-2">
		{#each post.values["process"]["measures"] as measure, idx}
		<tr>
		  <td>{measure.date}</td>
		  <td>{measure.data}</td>
		</tr>
		{/each}

	</tbody>
  </table>
</div>
  
  {#if post.values["process"]["measures"].length > 0}
  <Chart data={data} lineOptions={lineOptions} valuesOverPoints={valuesOverPoints} title={title} height={height} colors={colors} type="line" />
  {/if}

</div>

<div id="notes" class="{notesVisible ? '' : 'hidden'}">
  <p class="text-left py-2 px-4 mt-2">Notes on this project: {post.values["notes"]}</p>
  
</div>

<div id="sections" class="my-2 flex justify-left py-2 px-4  items-center gap-2 max-w-md">
	<button class="bg-gray-{basicVisible ? '700' : '500'} text-white font-bold py-1 px-2 rounded border-transparent" id="basic" on:click={showBasic}>BASIC</button>
	<button class="bg-gray-{stepsVisible ? '700' : '500'} text-white font-bold py-1 px-2 rounded border-transparent" id="steps" on:click={showSteps}>STEPS</button>
	<button class="bg-gray-{measuresVisible ? '700' : '500'} text-white font-bold py-1 px-2 rounded border-transparent" id="measures" on:click={showMeasures}>MEASURES</button>
	<button class="bg-gray-{notesVisible ? '700' : '500'} text-white font-bold py-1 px-2 rounded border-transparent" id="notes" on:click={showNotes}>NOTES</button>

</div>
<p class="my-2 flex justify-left py-2 px-4  items-center gap-2">
	{#if $user && post.author.id === $user.id}
		
			<button
				class="bg-blue-500 text-white font-bold py-1 px-2 rounded border-transparent"
				on:click={() => goto('/new?edit=' + post.id)}>Update</button>
			<button
				class="bg-red-500 text-white font-bold py-1 px-2 rounded border-transparent"
				on:click={deletePost}>Delete</button>
		
	{/if}
	
	{#if $user && (post.values["public"] ||post.author.id === $user.id )}
	
	<button
	class="bg-red-500 text-white font-bold py-1 px-2 rounded border-transparent"
	on:click={clonePost}>Clone</button>
	
	{/if}
	</p>

{/if}


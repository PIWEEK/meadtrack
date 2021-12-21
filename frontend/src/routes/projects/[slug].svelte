<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';

	export const load: Load = async ({ page: { params }, fetch }) => {
		// The params object will contain all of the parameters in the route.
		const { slug } = params;

		// Now, we'll fetch the mead projects from Strapi
		const res = await fetch('https://api.merrybrew.app/posts/' + slug);

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
	import { faPlus,  faCalendar, faCalendarAlt, faClock, faUser, faWineGlass, faCertificate} from '@fortawesome/free-solid-svg-icons'
	import { faEye, faHourglassHalf, faBong, faEyeSlash, faTrash, faEdit, faClone, faCheck, faWineBottle } from '@fortawesome/free-solid-svg-icons'

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

	export let section = "";

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
		section = "recipe";

	};

	function showSteps(){
		basicVisible = false;
		stepsVisible = true;
		measuresVisible = false;
		notesVisible = false;
		section = "process";

	};

	function showMeasures(){
		basicVisible = false;
		stepsVisible = false;
		measuresVisible = true;
		notesVisible = false;
		section = "measures";


	};

	function showNotes(){
		basicVisible = false;
		stepsVisible = false;
		measuresVisible = false;
		notesVisible = true;
		section = "notes";


	};
	async function deletePost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}

		const res = await fetch('https://api.merrybrew.app/posts/' + post.id, {
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

		const res = await fetch('https://api.merrybrew.app/posts', {
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

<div id="sections" class="my-2 flex justify-center pb-2 px-0  items-center gap-2 max-w-4xl border-gray-500 border-b">
	<button class="bg-gray-{basicVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="basic" on:click={showBasic}>RECIPE</button>
	<button class="bg-gray-{stepsVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="steps" on:click={showSteps}>PROCESS</button>
	<button class="bg-gray-{measuresVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="measures" on:click={showMeasures}>MEASURES</button>
	<button class="bg-gray-{notesVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="notes" on:click={showNotes}>NOTES</button>

</div>

<div class="flex">
<h1 class="flex font-serif text-left py-0 px-4 text-3xl mt-4 max-w-4xl">{post.title}</h1>
<p class="justify-end text-right py-2 px-1 mt-4">
	{#if post.values["finished"]}
	<Fa icon={faWineBottle} size="lg"/>
	{:else}
	<Fa icon={faBong} size="lg" />
	{/if}
</p>
<p class="justify-end text-right py-2 px-1 pr-4 mt-4">
	{#if post.values["public"]}
	<Fa icon={faEye} size="lg"/>
	{:else}
	<Fa icon={faEyeSlash} size="lg"/>
	{/if}
</p>

</div>
{#if post.values["description"]}
<p class="pl-6 pr-4 italic font-serif max-w-4xl">{post.values["description"]}</p>
{/if}
{#if post.values["when"]}
<p class="w-fill flex border-double border-4 text-sm p-3 pl-3 text-gray-100 bg-gray-500 text-left gap-2 py-2 px-4 mt-2 rounded-sm max-w-4xl"><Fa icon={faCalendarAlt} translateY="0.2" size="sm"/> {post.values["when"]}</p>
{/if}


<div id="basic" class="{basicVisible ? '' : 'hidden'}">


  <div class="shadow-xl rounded-lg max-w-4xl">

  <p class="text-left py-2 pl-4 text-2xl mt-2 font-serif">Main ingredients</p>
  {#if post.values["recipe"]["main"].length >0}

  <ul class="text-left pb-6 pl-12 pr-4 mt-2 list-disc ">

	{#each post.values["recipe"]["main"] as main, idx}

	<li>
		<p>{main.type}. {main.quantity} {main.units}</p>
	</li>

	{/each}
  </ul>
  {:else}
  <p class="italic text-left pb-6 pl-8 mt-2">No data</p>
  
  {/if}
	<p class="text-left pb-2 pl-4 text-2xl mt-2  font-serif">Secondary ingredients</p>
	{#if post.values["recipe"]["secondary"].length >0}

	<ul class="text-left pb-6 pl-12 mt-2 list-disc ">

	  {#each post.values["recipe"]["secondary"] as secondary, idx}
  
	  <li>
		  <p>{secondary}</p>
	  </li>
  
	  {/each}
	</ul>
	{:else}
	<p class="italic text-left pb-6 pl-8 mt-2">No data</p>
	
	{/if}

	</div>
	<div class="shadow-xl rounded-lg max-w-4xl">
	<p class="w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm">Conditions</p>
	{#if post.values["recipe"]["conditions"]}
	<p class="text-left py-2 px-4 mt-2">{post.values["recipe"]["conditions"]}</p>
	{:else}
	<p class="italic text-left py-2 px-4 mt-2">No data</p>
	{/if}
	
	<p class="w-fill font-semibold flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm">Expected result</p>
	{#if post.values["recipe"]["result"]}
	<p class="text-left py-2 px-4 mt-2">{post.values["recipe"]["result"]}</p>
	{:else}
	<p class="italic text-left py-2 px-4 mt-2">No data</p>
	{/if}
	<div class="pb-3"></div>

	</div>
  

</div>

<div id="steps" class="{stepsVisible ? '' : 'hidden'}">

	<div class="shadow-xl rounded-lg max-w-4xl">
  <p class="w-fill font-semibold  flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm">Preparation</p>

  {#if post.values["process"]["preparation"]}
  <p class="text-left py-2 px-4 mt-2">{post.values["process"]["preparation"]}</p>
  {:else}
  <p class="italic text-left py-2 px-4 mt-2">No data</p>
  {/if}

  <p class="w-fill font-semibold  flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm">Materials</p>
  {#if post.values["process"]["materials"]}
  <p class="text-left py-2 px-4 mt-2">{post.values["process"]["materials"]}</p>
  {:else}
  <p class="italic text-left py-2 px-4 mt-2">No data</p>
  {/if}

  <p class="w-fill font-semibold  flex p-3 pl-3 text-gray-100 bg-gray-700 text-left py-2 px-4 mt-2 rounded-sm">Steps</p>

  {#if post.values["process"]["steps"].length >0}
  <ul class="text-left py-2 px-4 mt-2">
	
	{#each post.values["process"]["steps"] as step, idx}

	<li> 
		{#if step.date}
		<p class="bg-gray-300 p-1"> {step.date}</p>
		{:else}
		<p class="bg-gray-300 p-1"> Next step</p>
		{/if}
		
		<p class="p-1 pl-2">{step.type}</p>
	</li>

	{/each}

  </ul>
  {:else}
  <p class="italic text-left py-2 px-4 mt-2">No data</p>
  {/if}

  
  
  <div class="pb-3"></div>
</div>
</div>

<div id="measures" class="{measuresVisible ? '' : 'hidden'}">
	{#if post.values["process"]["measures"].length > 0}
	<div class="shadow-xl rounded-lg max-w-4xl">
	<Chart data={data} lineOptions={lineOptions} valuesOverPoints={valuesOverPoints} title={title} height={height} colors={colors} type="line" />
	<div class="pb-8"></div>
	</div>
	{/if}
  
	<div class="shadow-xl rounded-lg max-w-4xl">
	<div class="flex border-b pt-1 pb-3">
  <div class="text-left font-bold py-2 px-4 mt-2">Target Gravity</div><div class="text-left font-bold py-2 px-4 mt-2 text-white font-bold bg-gray-700"> {post.values["recipe"]["targetgravity"]}</div>
		</div>
  <div class="px-8 pt-5">
  <table class="table-auto  border-collapse  border-gray-400"> 
	<thead class="">
		<tr class="bg-gray-600 text-white">
		  <th class="p-3">Date</th>
		  <th class="p-3">Gravity</th>
		</tr>
	  </thead>
	  <tbody class="text-right py-2 px-4 mt-2 border-dotted border-2">
		{#each post.values["process"]["measures"] as measure, idx}
		<tr class="odd:bg-red even:bg-gray-100">
		  <td class="p-2">
			{#if measure.date}
			  {measure.date}
			  {:else}
			  No date given
			  {/if}
			</td>
		  <td class="p-2">{measure.data}</td>
		</tr>
		{/each}

	</tbody>
  </table>
  <div class="pb-8"></div>
</div>
</div>
  

</div>


<div id="notes" class="{notesVisible ? '' : 'hidden'}">
	<div class="shadow-xl py-2 rounded-lg border-2 max-w-4xl">
		<p class="flex gap-2 text-left py-0 px-4 mt-2"><Fa icon={faUser} size="lg"/>{post.author.username}</p>
		<p class="flex gap-2 text-left py-0 px-4 mt-2 italic"><Fa icon={faCalendar} size="lg"/>Project created on {post.created_at.substring(0,10)}</p>
		<p class="flex gap-2 text-left py-0 px-4 mt-2 italic"><Fa icon={faClock} size="lg"/>Project last updated on {post.updated_at.substring(0,10)}</p>
		<div class="pb-3"></div>
		</div>
		
	<div class="shadow-xl rounded-lg max-w-4xl">
		{#if post.values["notes"]}
		<p class="text-left py-2 px-4 mt-2">{post.values["notes"]}</p>
		{:else}
		<p class="italic text-left py-2 px-4 mt-2">No data</p>
		{/if}
  
  <div class="pb-3"></div>
  
</div>
</div>


<div class="my-2 flex justify-between py-2 px-4 max-w-4xl items-center gap-2">
	{#if $user && post.author.id === $user.id}
	<button
	class="bg-red-100 text-white font-bold py-1 px-2 rounded border-transparent"
	on:click={deletePost}><Fa icon={faTrash} color="#c08080" size="lg"/></button>

			<button
				class="bg-gray-100 text-white text-right font-bold py-3 px-2 rounded border-transparent"
				on:click={() => goto('/new?edit=' + post.id +"&section="+section)}><Fa icon={faEdit} color="#333333" size="3x"/></button>
			
	{/if}
	
	{#if $user && (post.values["public"] ||post.author.id === $user.id )}
	
	<button
	class="bg-blue-100 text-white font-bold py-1 px-2 rounded border-transparent"
	on:click={clonePost}><Fa icon={faClone} color="#6C9BD2" size="lg"/></button>
	
	{/if}
</div>

{/if}


<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';
	import type { Post } from '$lib/types';
	let section = "";

	export const load: Load = async ({ fetch, page: { query } }) => {
		// edit will be an optional query string parameter that'll contain the ID of the post that needs to be updated.
		// If this is set, the post will be updated instead of being created.
		const edit = query.get('edit');
		section = query.get('section');

		if (edit) {
			const res = await fetch('http://192.168.10.32:1337/posts/' + edit);

			if (res.status === 404) {
				const error = new Error(`The post with ID ${edit} was not found`);
				return { status: 404, error };
			} else {
				const data: Post = await res.json();
				return {
					props: {
						editId: edit,
						section: section,
						title: data.title,
						values: data.values
					}
				};
			}
		}

		return { props: {} };
	};

	let mt = {
    title: "title is not handled here",
	description: "",
	when: "",
    finished: false,
	public: false,
	notes: "",
    recipe: {
      main: [
        {type: "water", quantity: 5, units: "l" },
        {type: "honey", quantity: 3, units: "kg" },
        {type: "yeast", quantity: 4, units: "gr" }
      ],
      secondary: ['raisins', 'lavender', 'tea'],
	  targetgravity: 0,
      conditions: "",
      result: "",
    },
    process: {
      preparation: "",
      materials: "",
      steps: [
              {
                  type: "Sanitize material",
                  date: "2021-10-12",
              },


      ],
      measures: [
           {
               data: 1090,
               date: "2021-10-12",
           },

        ],
    }
  }; 		

	


</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import user from '$lib/user';
	import { goto } from '$app/navigation';
	import Fa from 'svelte-fa'
	import { faTrashAlt, faPlusSquare} from '@fortawesome/free-solid-svg-icons'

	export let editId: string;
	export let section: string;
	export let title = '';
	export let values = JSON.parse(JSON.stringify(mt));
	onMount(() => {
		if (!$user) goto('/login');
		if (section){
			if (section == "recipe"){
				showBasic();
			}
			else if (section == "process"){
				showSteps();
			}
			else if (section == "measures"){
				showMeasures();
			}
			else if (section = "notes"){
				showNotes();
			}
			else {
				showBasic();
			}
		}
		else {
			showBasic();
		}
	});

	export let basicVisible = true;
	export let stepsVisible = false;
	export let measuresVisible = false;
	export let notesVisible = false;


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

	function toggleFinished(){
		values.finished = !values.finished;
	}

	function togglePublic(){
		values.public = !values.public;
	}

	// To edit the post
	async function editPost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}

		const res = await fetch('http://192.168.10.32:1337/posts/' + editId, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: 'Bearer ' + localStorage.getItem('token')
			},
			body: JSON.stringify({ title, values })
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
	}

	async function createPost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}

		if (editId) {
			// We're supposed to edit, not create
			editPost();
			return;
		}



		const res = await fetch('http://192.168.10.32:1337/posts', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: 'Bearer ' + localStorage.getItem('token')
			},
			body: JSON.stringify({ title, values })
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
	}

	// Different handlers for adding/removing multiple ingredients in the form
	const removeMain = (idx: number) => {
		let main = values.recipe.main;
		main.splice(idx, 1);
		values.recipe.main = main;
    };
 
 	const addMain = () => (values.recipe.main = [...values.recipe.main, {}]);

	const removeSecondary = (idx: number) => {
		let secondary = values.recipe.secondary;
		secondary.splice(idx, 1);
		values.recipe.secondary = secondary;
    };
 
 	const addSecondary = () => (values.recipe.secondary = [...values.recipe.secondary, '']);

	const removeStep = (idx: number) => {
		let steps = values.process.steps;
		steps.splice(idx, 1);
		values.process.secondary = steps;
    };
 
 	const addStep = () => (values.process.steps = [...values.process.steps, {}]);

	 const removeMeasure = (idx: number) => {
		let measures = values.process.measures;
		measures.splice(idx, 1);
		values.process.measures = measures;
    };
 
 	const addMeasure = () => (values.process.measures = [...values.process.measures, {}]);


</script>

<div id="sections" class="my-2 flex justify-center pb-2 px-0  items-center gap-2 max-w-4xl border-gray-500 border-b">
	<button class="bg-gray-{basicVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="basic" on:click={showBasic}>RECIPE</button>
	<button class="bg-gray-{stepsVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="steps" on:click={showSteps}>PROCESS</button>
	<button class="bg-gray-{measuresVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="measures" on:click={showMeasures}>MEASURES</button>
	<button class="bg-gray-{notesVisible ? '700' : '500'} text-white font-semibold py-1 px-2 rounded border-transparent" id="notes" on:click={showNotes}>NOTES</button>

</div>


<form on:submit|preventDefault={createPost} class="max-w-4xl container pl-4 pr-4 pb-4">
	
<div id="basic" class="{basicVisible ? '' : 'hidden'}">
	<div class="my-1">
		<label for="title">Title</label>
		<input type="text" placeholder="Enter title" id="title" bind:value={title} />
	</div>
	<div class="my-1">
		<label for="when">When</label>
		<input type="text" placeholder="Freeform relevant project time info" id="when" bind:value={values.when} />
	</div>
	<div class="my-1">
		<label for="description">Description</label>
		<input type="text" placeholder="A short description of the project" id="when" bind:value={values.description} />
	</div>

	<div>
		<label for="title">Main Ingredients</label>
			<ul>
			  {#each values.recipe.main as main, idx}
			  <li class="flex mb-1">
				<button class="px-2" on:click|preventDefault={() => removeMain(idx)}><Fa icon={faTrashAlt} size="sm"/></button>

				<input class="mr-1" type="text" name={`main[${idx}]`} placeholder="water" bind:value={main.type}/>
				<input type="text" name={`main[${idx}]`} placeholder="0" bind:value={main.quantity}/>
				<input type="text" name={`main[${idx}]`} placeholder="kg" bind:value={main.units}/>
	
			  </li>
			  {/each}
			</ul>
	</div>
	<div class="flex justify-end">
		<button class="p-1" on:click|preventDefault={addMain}><Fa icon={faPlusSquare} size="2x"/></button>
	</div>

	<div>
		<label for="title">Secondary Ingredients</label>
			<ul>
			  {#each values.recipe.secondary as secondary, idx}
		  	<li class="flex mb-1">
				<button class="px-2" on:click|preventDefault={() => removeSecondary(idx)}><Fa icon={faTrashAlt} size="sm"/></button>

				<input type="text" name={`secondary[${idx}]`} placeholder="New Secondary Ingredient" bind:value={secondary}/>
	
		  	</li>
		  	{/each}
			</ul>
    </div>
	<div class="flex justify-end">
		<button class="p-1" on:click|preventDefault={addSecondary}><Fa icon={faPlusSquare} size="2x"/></button>
	</div>

	<div class="my-1">
		<label for="title">Conditions</label>
		<textarea rows="3" type="text" placeholder="Enter notes on conditions" id="conditions" bind:value={values.recipe.conditions} />
	</div>
	<div class="my-1">
		<label for="title">Expected result</label>
		<textarea rows="3" type="text" placeholder="Enter notes on expected result" id="result" bind:value={values.recipe.result} />
	</div>


	<div class="flex">
		<button class="bg-gray-{values.finished ? '800' : '300'} text-white font-semibold py-1 px-2 mr-2 rounded border-transparent" id="finished" on:click|preventDefault={toggleFinished}>Finished</button>
		<button class="bg-gray-{values.public ? '800' : '300'} text-white font-semibold py-1 px-2 rounded border-transparent" id="public" on:click|preventDefault={togglePublic}>Public</button>

	</div>


</div>

<div id="steps" class="{stepsVisible ? '' : 'hidden'}">

	<div class="my-1">
		<label for="title">Preparation</label>
		<textarea rows="3" type="text" placeholder="Enter notes on preparation" id="preparation" bind:value={values.process.preparation} />
	</div>
	<div class="my-1">
		<label for="title">Materials</label>
		<textarea rows="3" type="text" placeholder="Enter notes on materials" id="materials" bind:value={values.process.materials} />
	</div>

    <div>
		<label for="title">Steps</label>
		<ul>
		  {#each values.process.steps as step, idx}
		  <li class="flex  mb-1">
			<button class="px-2" on:click|preventDefault={() => removeStep(idx)}><Fa icon={faTrashAlt} size="sm"/></button>

			<textarea class="mr-1" cols=3 type="text" name={`step[${idx}]`}	placeholder="a step" bind:value={step.type}/>
			<input class="" type="date" name={`step[${idx}]`} placeholder=""	bind:value={step.date}/>
	
		  </li>
		  {/each}
		</ul>

	  </div>
	  <div class="flex justify-end">
		<button class="p-1" on:click|preventDefault={addStep}><Fa icon={faPlusSquare} size="2x"/></button>
    	</div>

	</div>
<div id="steps" class="{measuresVisible ? '' : 'hidden'}">
	 
		<div class="flex my-1">
			<label for="title">Target Gravity</label>
			<input class="mt-5 mb-2" type="number"  placeholder="1010" id="targetgravity" bind:value={values.recipe.targetgravity} />
		</div>
				
		<ul>
	
			{#each values.process.measures as measure, idx}
	  
			<li class="flex  mb-1">
	  
				<button class="px-2" on:click|preventDefault={() => removeMeasure(idx)}><Fa icon={faTrashAlt} size="sm"/></button>
	  
			  <input class="mr-1" type="number"
			  name={`measure[${idx}]`}
			  placeholder="1000"
			  bind:value={measure.data}
	  
			  />
			  <input
			  type="date"
			  name={`measure[${idx}]`}
			  placeholder=""
			  bind:value={measure.date}
	  
			  />
			  <!-- remove text field and member -->
	  
			</li>
	  
			{/each}
	  
		  </ul>
		  <div class="flex justify-end">
			<button class="p-1" on:click|preventDefault={addMeasure}><Fa icon={faPlusSquare} size="2x"/></button>
			</div>

		  </div>

			<div id="notes" class="{notesVisible ? '' : 'hidden'}">

		<div class="my-1">
			<label for="title">Notes</label>
			<textarea rows="10" type="text" placeholder="Enter notes on notes" id="preparation" bind:value={values.notes} />
		</div>

</div>
<div class="relative grid justify-items-end absolute bottom-0 ">
	<div class="">
		<button class="submit bg-black-700" type="submit">Submit</button>
		<a href="/projects/{editId}" class="p-2 underline" type="cancel">Cancel</a>
	</div>

</div>

</form>

<style lang="postcss">
	label {
		@apply font-bold block mt-3 mb-1;
	}

	input {
		@apply bg-white w-full border border-gray-300 rounded outline-none py-2 px-4;
	}

	textarea {
		@apply bg-white w-full border border-gray-300 rounded outline-none py-2 px-4 resize-y;
	}

	.submit {
		@apply bg-green-600 text-white border-transparent rounded px-4 py-2;
	}
	.add {
		@apply bg-green-800 text-white;
	}
</style>

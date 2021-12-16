<script lang="ts" context="module">
	import type { Load } from '@sveltejs/kit';
	import type { Post } from '$lib/types';

	export const load: Load = async ({ fetch, page: { query } }) => {
		// edit will be an optional query string parameter that'll contain the ID of the post that needs to be updated.
		// If this is set, the post will be updated instead of being created.
		const edit = query.get('edit');

		if (edit) {
			const res = await fetch('http://localhost:1337/posts/' + edit);

			if (res.status === 404) {
				const error = new Error(`The post with ID ${edit} was not found`);
				return { status: 404, error };
			} else {
				const data: Post = await res.json();
				return {
					props: {
						editId: edit,
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

	export let editId: string;
	export let title = '';
	export let values = JSON.parse(JSON.stringify(mt));
	onMount(() => {
		if (!$user) goto('/login');
	});

	// To edit the post
	async function editPost() {
		if (!localStorage.getItem('token')) {
			goto('/login');
			return;
		}

		const res = await fetch('http://localhost:1337/posts/' + editId, {
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



		const res = await fetch('http://localhost:1337/posts', {
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

<form on:submit|preventDefault={createPost} class="my-4 mx-auto container p-4">
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

	<div class="my-1">
		<label for="title">Preparation</label>
		<textarea type="text" placeholder="Enter notes on preparation" id="preparation" bind:value={values.process.preparation} />
	</div>
	<div class="my-1">
		<label for="title">Materials</label>
		<textarea type="text" placeholder="Enter notes on materials" id="materials" bind:value={values.process.materials} />
	</div>
	<div class="my-1">
		<label for="title">Conditions</label>
		<textarea type="text" placeholder="Enter notes on conditions" id="conditions" bind:value={values.recipe.conditions} />
	</div>
	<div class="my-1">
		<label for="title">Target Gravity</label>
		<input type="number" placeholder="1010" id="targetgravity" bind:value={values.recipe.targetgravity} />
	</div>

	<div class="my-1">
		<label for="title">Result</label>
		<textarea type="text" placeholder="Enter notes on expected result" id="preparation" bind:value={values.recipe.result} />
	</div>
	<div class="my-1">
		<label for="title">Notes</label>
		<textarea type="text" placeholder="Enter notes on notes" id="preparation" bind:value={values.notes} />
	</div>

	<div>
		<label>
	
		  <span>Finished?</span>
	
		  <input type="checkbox" name="finished" bind:checked={values.finished}/>
		</label>
	
	  </div>
	  <div>
		<label>
	
		  <span>Public Project?</span>
	
		  <input type="checkbox" name="public" bind:checked={values.public}/>
		</label>
	
	  </div>
	
	  <div>

		<label for="title">Main Ingredients</label>
	
		<ul>
	
		  {#each values.recipe.main as main, idx}
	
		  <li class="flex">
	
			<input
			type="text"
			name={`main[${idx}]`}
			placeholder="water"
			bind:value={main.type}
	
			/>
			<input
			type="text"
			name={`main[${idx}]`}
			placeholder="0"
			bind:value={main.quantity}
	
			/>
			<input
			type="text"
			name={`main[${idx}]`}
			placeholder="kg"
			bind:value={main.units}
	
			/>
	
			<!-- remove text field and member -->
	
			<button class="border-2 px-2 rounded-lg" on:click|preventDefault={() => removeMain(idx)}>x</button>
	
		  </li>
	
		  {/each}
	
		</ul>
	
		<button class="add" on:click|preventDefault={addMain}> + add </button>
	
	  </div>

	  <div>

		<h4>Secondary Ingredients</h4>
	
		<ul>
	
		  {#each values.recipe.secondary as secondary, idx}
	
		  <li class="flex">
	
			<input
			type="text"
			name={`secondary[${idx}]`}
			placeholder="New Secondary Ingredient"
			bind:value={secondary}
	
			/>
	
			<!-- remove text field and member -->
	
			<button on:click|preventDefault={() => removeSecondary(idx)}>x</button>
	
		  </li>
	
		  {/each}
	
		</ul>
	
		<button class="add" on:click|preventDefault={addSecondary}> + add </button>
	
	  </div>
	  <div>

		<h4>Steps</h4>
	
		<ul>
	
		  {#each values.process.steps as step, idx}
	
		  <li class="flex">
	
			<textarea
			type="text"
			name={`step[${idx}]`}
			placeholder="a step"
			bind:value={step.type}
	
			/>
			<input
			type="date"
			name={`step[${idx}]`}
			placeholder=""
			bind:value={step.date}
	
			/>
			<!-- remove text field and member -->
	
			<button on:click|preventDefault={() => removeStep(idx)}>x</button>
	
		  </li>
	
		  {/each}
	
		</ul>
	
		<button class="add" on:click|preventDefault={addStep}> + add </button>
	
	  </div>
	
	  <div>

		<h4>Measures</h4>
	
		<ul>
	
		  {#each values.process.measures as measure, idx}
	
		  <li class="flex">
	
			<input
			type="number"
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
	
			<button on:click|preventDefault={() => removeMeasure(idx)}>x</button>
	
		  </li>
	
		  {/each}
	
		</ul>
	
		<button class="add" on:click|preventDefault={addMeasure}> + add </button>
	
	  </div>


	<div class="my-2">
		<button class="submit" type="submit">Submit</button>
		<button class="cancel" type="cancel">Cancel</button>

	</div>
</form>

<style lang="postcss">
	label {
		@apply font-bold block mb-1;
	}

	input {
		@apply bg-white w-full border border-gray-500 rounded outline-none py-2 px-4;
	}

	textarea {
		@apply bg-white w-full border border-gray-500 rounded outline-none py-2 px-4 resize-y;
	}

	.submit {
		@apply bg-blue-500 text-white border-transparent rounded px-4 py-2;
	}
	.add {
		@apply bg-green-800 text-white;
	}
</style>

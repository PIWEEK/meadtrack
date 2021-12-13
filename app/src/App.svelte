<script>

  let yes = false;

  const mt = {
    title: 'A mead recipe',
    finished: false,
    recipe: {
      main: [
        {type: "water", quantity: 5, units: "l" },
        {type: "honey", quantity: 3, units: "kg" },
        {type: "yeast", quantity: 4, units: "gr" }
      ],
      secondary: ['raisins', 'lavender', 'tea'],
      conditions: "",
      result: "",
    },
    process: {
      preparation: "",
      steps: [
              {
                  type: "some large text",
                  date: "2021-10-12",
              },
              {
                  type: "some large text",
                  date: "2021-10-12",
              },
              {
                  type: "some large text",
                  date: "2021-10-12",
              },

      ],
      measures: [
           {
               data: 1060,
               date: "2021-10-12",
           },
           {
               data: 1060,
               date: "2021-10-12",
           },
           {
               data: 1060,
               date: "2021-10-12",
           },
        ],
    }
  }; 

  // this is another trick to clone an object in JavaScript
  let values = JSON.parse(JSON.stringify(mt));

  const submit = () => console.log(values);

    // handler to remove an input and team member from the list
  const removeMain = idx => {

  let main = values.recipe.main;
  main.splice(idx, 1);
  values.recipe.main = main;

  };

// add new input field

const addMain = () => (values.recipe.main = [...values.recipe.main, {}]);


// Remove step
const removeStep = idx => {

let steps = values.process.steps;
steps.splice(idx, 1);
values.process.steps = steps;

};

// add new Step

const addStep = () => (values.process.steps = [...values.process.steps, {}]);

// Remove measure
const removeMeasure = idx => {

let measures = values.process.measures;
measures.splice(idx, 1);
values.process.measures = measures;

};

// add new measure

const addMeasure = () => (values.process.measures = [...values.process.measures, {}]);


  // handler to remove an input and team member from the list
  const removeSecondary = idx => {

    let secondary = values.recipe.secondary;
    secondary.splice(idx, 1);
    values.recipe.secondary = secondary;

  };

  // add new input field

  const addSecondary = () => (values.recipe.secondary = [...values.recipe.secondary, '']);


  const reset = () => (values = JSON.parse(JSON.stringify(mt)));

</script>

<form on:submit|preventDefault={submit}>

  <div>

    <label>

      <span>Title</span>

      <input type="text" name="text" placeholder="Enter your mead recipe title"
      bind:value={values.title}/>

    </label>
  </div>

  <div>

    <h4>Main Ingredients</h4>

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
        type="number"
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

        <button on:click|preventDefault={() => removeMain(idx)}>x</button>

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

    <label>

      <span>Preparation</span>

      <textarea type="text" name="text" placeholder="Comments on the preparation"
      bind:value={values.process.preparation}/>

    </label>
  </div>


  <div>

    <label>

      <span>Conditions</span>

      <textarea

      type="text"
      name="conditions"
      placeholder="Input your mead conditions"
      bind:value={values.recipe.conditions}

      />

    </label>
  </div>

  <div>

    <label>

      <span>Expected result</span>

      <textarea

      type="text"
      name="result"
      placeholder="Comment on your expected result"
      bind:value={values.recipe.result}

      />

    </label>
  </div>

  <div>

    <label>

      <span>Finished?</span>

      <input

      type="checkbox"
      name="finished"
      bind:checked={yes}

      />
      {#if yes}
      {values.finished = true}
  
      {:else}
      {values.finished = false}
    {/if}
    </label>

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
        placeholder="water"
        bind:value={measure.data}

        />
        <input
        type="date"
        name={`measure[${idx}]`}
        placeholder="0"
        bind:value={measure.date}

        />

        <!-- remove text field and member -->

        <button on:click|preventDefault={() => removeMeasure(idx)}>x</button>

      </li>

      {/each}

    </ul>

    <button class="add" on:click|preventDefault={addMeasure}> + add </button>

  </div>

  <div>

    <button type="submit">Save</button>
    <button type="button" on:click={reset}>Reset</button>

  </div>

</form>
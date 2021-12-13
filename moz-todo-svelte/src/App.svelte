<script>
const initial = {
team: 'The A-team',
members: ['Hannibal', 'Face', 'B.A.']
};
// this is another trick to clone an object in JavaScript
let values = JSON.parse(JSON.stringify(initial));
const submit = () => console.log(values);
// handler to remove an input and team member from the list
const removeMember = idx => {
let members = values.members;
members.splice(idx, 1);
values.members = members;
};
// add new input field
const addMember = () => (values.members = [...values.members, '']);
const reset = () => (values = JSON.parse(JSON.stringify(initial)));
</script>
<form on:submit|preventDefault={submit}>
<div>
<label>
<span>Team</span>
<input
type="text"
name="text"
placeholder="Enter your team name"
bind:value={values.team}
/>
</label>
</div>
<div>
<h4>Members</h4>
<ul>
{#each values.members as member, idx}
<li class="flex">
<input
type="text"
name={`members[${idx}]`}
placeholder="New Member"
bind:value={member}
/>
<!-- remove text field and member -->
<button on:click|preventDefault={() => removeMember(idx)}>
x
</button>
</li>
{/each}
</ul>
<button class="add" on:click|preventDefault={addMember}> + add </button>
</div>
<div>
<button type="submit">Save</button>
<button type="button" on:click={reset}>Reset</button>
</div>
</form>
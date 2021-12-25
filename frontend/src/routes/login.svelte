<script lang="ts">
	import type { User } from '$lib/types';
	import { goto } from '$app/navigation';
	import user from '$lib/user';
	import Fa from 'svelte-fa'

	import {faCircleNotch} from '@fortawesome/free-solid-svg-icons'


	let email = '';
	let password = '';

	let loginpressed = false;

	async function login() {
		const res = await fetch('https://api.merrybrew.app/auth/local', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ identifier: email, password })
		})
		loginpressed = true; 
		if (res.ok) {
			const data: { user: User; jwt: string } = await res.json();
			localStorage.setItem('token', data.jwt);
			if (data) {
				$user = data.user;
				goto('/');
			}
		} else {
			const data: { message: { messages: { message: string }[] }[] } = await res.json();
			if (data?.message?.[0]?.messages?.[0]?.message) {
				alert(data.message[0].messages[0].message);
			}
			loginpressed = false;
		}
	}
</script>

<div class="p-10 max-w-3xl">
<form on:submit|preventDefault={login} class="container mx-auto">
	<h1 class="text-center text-2xl pb-2 font-bold">Welcome to Merrybrew!</h1>
	<p class="text-center text-lg pb-2 font-bold">During early access please request a user via invite@merrybrew.app</p>

	<div class="my-1">
		<label for="email">Email</label>
		<input type="email" placeholder="Enter your email" bind:value={email} />
	</div>
	<div class="my-1">
		<label for="password">Password</label>
		<input type="password" placeholder="Enter your password" bind:value={password} />
	</div>
	<div class="my-3">
		{#if !loginpressed}
		<button class="submit" type="submit">Login</button>
		{:else}
		<button class="submit"><Fa icon={faCircleNotch} spin size="lg"/></button>
		{/if}
	</div>
</form>
<p class="text-center text-lg pb-2 font-bold">Alternatively, you can browse <a class="bg-indigo-500 text-white border-transparent rounded px-2 py-2" href="/public/">public projects</a></p>

</div>

<style lang="postcss">
	label {
		@apply font-bold block mb-1;
	}

	input {
		@apply bg-white w-full border border-gray-400 rounded outline-none py-2 px-4;
	}

	.submit {
		@apply bg-gray-700 text-white border-transparent rounded px-4 py-2;
	}
</style>

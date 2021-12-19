<script lang="ts">
	import type { User } from '$lib/types';
	import { goto } from '$app/navigation';
	import user from '$lib/user';

	let email = '';
	let password = '';

	async function login() {
		const res = await fetch('https://api.merrybrew.app/auth/local', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ identifier: email, password })
		});
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
		}
	}
</script>

<div class="p-10 max-w-3xl">
<form on:submit|preventDefault={login} class="container mx-auto">
	<h1 class="text-center text-2xl pb-2 font-bold">Welcome to MeadTrack</h1>

	<div class="my-1">
		<label for="email">Email</label>
		<input type="email" placeholder="Enter your email" bind:value={email} />
	</div>
	<div class="my-1">
		<label for="password">Password</label>
		<input type="password" placeholder="Enter your password" bind:value={password} />
	</div>
	<div class="my-3">
		<button class="submit" type="submit">Login</button>
	</div>
</form>
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

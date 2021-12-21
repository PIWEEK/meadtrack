<script lang="ts">
	import user from './user';
	import Fa from 'svelte-fa'
	import { faPlus, faUserCircle, faBeer} from '@fortawesome/free-solid-svg-icons'

</script>

<nav class="bg-white border-b border-gray-500 py-2 px-4 max-w-4xl">
	<div class="flex items-center justify-between container mx-auto">
		<section>
		
		<a href="/" class="font-bold font-serif no-underline"><img class="flex" src="/logo.png" alt="Merrybrew"></a>
		
	</section>
		<section>
			{#if !$user}
				<a href="/login" class="font-mono font-serif no-underline">Login</a>
			{:else}
			<Fa icon={faUserCircle} size="2x"/>
			{/if}
		</section>
	</div>
</nav>
